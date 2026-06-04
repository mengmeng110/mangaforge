// MangaForge 全流程管线引擎
// 剧本 → 分镜 → 生图 → 配音 → 合成 → 导出

import { llmChat, generateImage, generateSpeech, submitVideoTask, waitForVideo, type LLMConfig, type ImageGenConfig, type VideoGenConfig } from "./engine";
import { getDb } from "@/lib/db";
import { projects, characters, scenes, panels, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

export type PipelineStep = "script" | "storyboard" | "characters" | "images" | "video" | "voiceover" | "composition" | "export" | "done";
export type StepStatus = "pending" | "running" | "done" | "error" | "skipped" | "cancelled";

export interface PipelineProgress {
  step: PipelineStep;
  status: StepStatus;
  progress: number; // 0-100
  message: string;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
}

export interface PipelineState {
  projectId: string;
  steps: PipelineProgress[];
  currentStep: PipelineStep;
  overallProgress: number;
  isRunning: boolean;
  cancelled?: boolean;
}

const ALL_STEPS: PipelineStep[] = ["script", "storyboard", "characters", "images", "video", "voiceover", "composition", "export", "done"];

const STEP_LABELS: Record<PipelineStep, string> = {
  script: "📝 剧本分析",
  storyboard: "🎬 分镜生成",
  characters: "👤 角色提取",
  images: "🎨 图片生成",
  video: "🎬 分镜视频",
  voiceover: "🎤 配音合成",
  composition: "🎥 视频合成",
  export: "📦 导出输出",
  done: "✅ 完成",
};

// 内存中的管线状态存储
const pipelineLocks = new Map<string, boolean>();

const pipelineStates = new Map<string, PipelineState>();

// 获取管线状态
export function getPipelineState(projectId: string): PipelineState {
  if (!pipelineStates.has(projectId)) {
    pipelineStates.set(projectId, {
      projectId,
      steps: ALL_STEPS.map((step) => ({
        step,
        status: "pending",
        progress: 0,
        message: "",
      })),
      currentStep: "script",
      overallProgress: 0,
      isRunning: false,
    });
  }
  return pipelineStates.get(projectId)!;
}

// 取消管线
export function cancelPipeline(projectId: string): boolean {
  const state = pipelineStates.get(projectId);
  if (!state || !state.isRunning) return false;
  state.cancelled = true;
  state.isRunning = false;
  // 将当前运行中的步骤标记为 cancelled
  for (const step of state.steps) {
    if (step.status === "running") {
      step.status = "cancelled";
      step.message = "已被用户取消";
      step.finishedAt = Date.now();
    }
  }
  return true;
}

// 更新单步状态
function updateStep(state: PipelineState, step: PipelineStep, status: StepStatus, progress: number, message: string, error?: string) {
  const stepState = state.steps.find((s) => s.step === step);
  if (!stepState) return;
  stepState.status = status;
  stepState.progress = progress;
  stepState.message = message;
  if (status === "running") stepState.startedAt = Date.now();
  if (status === "done" || status === "error") stepState.finishedAt = Date.now();
  if (error) stepState.error = error;
  // 更新总进度
  const totalProgress = state.steps.reduce((sum, s) => sum + s.progress, 0) / state.steps.length;
  state.overallProgress = Math.round(totalProgress);
  state.currentStep = step;
}

// ==================== 管线步骤执行 ====================

// 步骤1: 图片生成（为每个分镜生成图片）
async function stepGenerateImages(
  projectId: string,
  imageConfig: ImageGenConfig,
  style: string,
  onProgress: (step: PipelineStep, status: StepStatus, progress: number, message: string) => void
) {
  onProgress("images", "running", 0, "开始生成分镜图片...");
  const panelList = await getDb().select().from(panels).where(eq(panels.projectId, projectId)).all();
  if (panelList.length === 0) {
    onProgress("images", "done", 100, "没有分镜需要生成图片");
    return;
  }

  // 加载角色和场景信息，用于拼接一致性提示
  const characterList = await getDb().select().from(characters).where(eq(characters.projectId, projectId)).all();
  const sceneList = await getDb().select().from(scenes).where(eq(scenes.projectId, projectId)).all();

  // 构建角色描述索引
  const characterIndex: Record<string, string> = {};
  for (const c of characterList) {
    characterIndex[c.name] = c.consistencyPrompt || c.description || c.name;
  }

  // 构建场景描述索引
  const sceneIndex: Record<string, string> = {};
  for (const s of sceneList) {
    sceneIndex[s.title] = s.description || s.location || s.title;
  }

  const stylePrompt = getStylePrompt(style);
  const workDir = path.join(process.cwd(), "data", projectId, "images");
  fs.mkdirSync(workDir, { recursive: true });

  for (let i = 0; i < panelList.length; i++) {
    const panel = panelList[i];
    const pct = Math.round(((i) / panelList.length) * 100);
    onProgress("images", "running", pct, `生成第 ${i + 1}/${panelList.length} 张: ${(panel.prompt || '').slice(0, 30)}...`);

    try {
      // 1. 拼接角色一致性提示
      const referencedChars = (panel.characters || '').split(',').map(s => s.trim()).filter(Boolean);
      let charConsistency = '';
      for (const charName of referencedChars) {
        const prompt = characterIndex[charName];
        if (prompt) {
          charConsistency += `【${charName}一致性: ${prompt}】`;
        }
      }

      // 2. 拼接场景一致性提示（从场景名匹配）
      let sceneConsistency = '';
      const sceneMatch = sceneList.find(s => panel.prompt?.includes(s.title));
      if (sceneMatch) {
        sceneConsistency = `【场景-${sceneMatch.title}一致性: ${sceneMatch.description}】`;
      }

      // 3. 最终prompt = 角色提示 + 场景提示 + 用户编辑的prompt + 风格
      let fullPrompt = '';
      if (charConsistency) fullPrompt += charConsistency + ' ';
      if (sceneConsistency) fullPrompt += sceneConsistency + ' ';
      fullPrompt += (panel.prompt || '');
      fullPrompt += ', ' + stylePrompt;

      const urls = await generateImage(imageConfig, fullPrompt);
      if (urls.length > 0) {
        // 下载图片到本地
        const imgPath = path.join(workDir, `${panel.id}.png`);
        const res = await fetch(urls[0]);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(imgPath, buffer);

        // 更新分镜图片
        await getDb().update(panels).set({
          imageUrl: `/api/assets/file/${panel.id}`,
          status: "done",
        }).where(eq(panels.id, panel.id)).run();

        // 注册到资产
        await getDb().insert(assets).values({
          id: panel.id,
          projectId,
          type: "image",
          name: `分镜_${i + 1}.png`,
          path: imgPath,
          url: `/api/assets/file/${panel.id}`,
          size: buffer.length,
          mimeType: "image/png",
          source: "ai-generated",
          metadata: JSON.stringify({ prompt: fullPrompt, panelIndex: i }),
        }).run();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "生成失败";
      onProgress("images", "running", pct, `第 ${i + 1} 张失败: ${msg}`);
      await getDb().update(panels).set({ status: "error" }).where(eq(panels.id, panel.id)).run();
    }
  }
  onProgress("images", "done", 100, `完成！共生成 ${panelList.length} 张图片`);
}

// 步骤2: 配音合成
async function stepGenerateVoiceover(
  projectId: string,
  ttsConfig: { apiKey: string; baseUrl?: string; model?: string; voice?: string },
  onProgress: (step: PipelineStep, status: StepStatus, progress: number, message: string) => void
) {
  onProgress("voiceover", "running", 0, "开始生成配音...");
  const panelList = await getDb().select().from(panels).where(eq(panels.projectId, projectId)).all();
  const panelsWithVoice = panelList.filter((p) => p.dialogue || p.narration);

  if (panelsWithVoice.length === 0) {
    onProgress("voiceover", "done", 100, "没有需要配音的台词");
    return;
  }

  const workDir = path.join(process.cwd(), "data", projectId, "audio");
  fs.mkdirSync(workDir, { recursive: true });

  for (let i = 0; i < panelsWithVoice.length; i++) {
    const panel = panelsWithVoice[i];
    const text = panel.dialogue || panel.narration || "";
    const pct = Math.round((i / panelsWithVoice.length) * 100);
    onProgress("voiceover", "running", pct, `配音第 ${i + 1}/${panelsWithVoice.length} 段`);

    try {
      const audioBuffer = await generateSpeech(ttsConfig, text);
      const audioId = uuid();
      const audioPath = path.join(workDir, `${audioId}.mp3`);
      fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

      await getDb().insert(assets).values({
        id: audioId,
        projectId,
        type: "audio",
        name: `配音_${i + 1}.mp3`,
        path: audioPath,
        url: `/api/assets/file/${audioId}`,
        size: audioBuffer.byteLength,
        mimeType: "audio/mpeg",
        source: "ai-generated",
        metadata: JSON.stringify({ text, panelId: panel.id }),
      }).run();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "配音失败";
      onProgress("voiceover", "running", pct, `第 ${i + 1} 段失败: ${msg}`);
    }
  }
  onProgress("voiceover", "done", 100, `完成！共生成 ${panelsWithVoice.length} 段配音`);
}

// 步骤3: 分镜视频生成（图生视频）
async function stepGenerateVideos(
  projectId: string,
  videoConfig: VideoGenConfig,
  onProgress: (step: PipelineStep, status: StepStatus, progress: number, message: string) => void
) {
  onProgress("video", "running", 0, "开始生成分镜视频...");
  const panelList = await getDb().select().from(panels).where(eq(panels.projectId, projectId)).all();
  const panelsWithImage = panelList.filter((p) => p.imageUrl);

  if (panelsWithImage.length === 0) {
    onProgress("video", "done", 100, "没有已生成图片的分镜，跳过视频生成");
    return;
  }

  const workDir = path.join(process.cwd(), "data", projectId, "videos");
  fs.mkdirSync(workDir, { recursive: true });

  // 并发提交所有任务（最多同时 3 个）
  const BATCH = 3;
  for (let i = 0; i < panelsWithImage.length; i += BATCH) {
    const batch = panelsWithImage.slice(i, i + BATCH);
    const tasks = await Promise.allSettled(
      batch.map(async (panel, j) => {
        const idx = i + j;
        const pct = Math.round((idx / panelsWithImage.length) * 100);
        onProgress("video", "running", pct, `提交第 ${idx + 1}/${panelsWithImage.length} 段视频...`);

        // 构建视频 prompt
        const prompt = `anime style, ${panel.camera || "medium shot"}, ${panel.prompt || "detailed illustration"}, smooth animation, cinematic`;
        
        // 获取图片完整 URL（需要拼接域名，这里用相对路径先存本地）
        const imgPath = path.join(process.cwd(), "data", projectId, "images", `${panel.id}.png`);
        if (!fs.existsSync(imgPath)) {
          throw new Error(`分镜图片不存在: ${panel.id}`);
        }

        // 将本地图片转为 data URI（API 需要 URL，不接受本地路径）
        const imgBuffer = fs.readFileSync(imgPath);
        const imgBase64 = `data:image/png;base64,${imgBuffer.toString("base64")}`;

        // 获取角色一致性提示用于视频生成
        const referencedChars = (panel.characters || '').split(',').map(s => s.trim()).filter(Boolean);
        const characterList = await getDb().select().from(characters).where(eq(characters.projectId, projectId)).all();
        let videoPrompt = prompt || '';
        for (const charName of referencedChars) {
          const charRec = characterList.find(c => c.name === charName);
          if (charRec && charRec.consistencyPrompt) {
            videoPrompt += ` 【角色:${charName}: ${charRec.consistencyPrompt}】`;
          }
        }

        // 提交视频生成任务
        const taskId = await submitVideoTask(videoConfig, imgBase64, videoPrompt);
        onProgress("video", "running", pct, `等待第 ${idx + 1} 段视频生成... (${taskId})`);

        // 等待完成
        const videoUrl = await waitForVideo(videoConfig, taskId);

        // 下载视频到本地
        const videoId = uuid();
        const videoPath = path.join(workDir, `${videoId}.mp4`);
        const res = await fetch(videoUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(videoPath, buffer);

        // 更新分镜记录
        await getDb().update(panels).set({
          videoUrl: `/api/assets/file/${videoId}`,
        }).where(eq(panels.id, panel.id)).run();

        // 注册资产
        await getDb().insert(assets).values({
          id: videoId,
          projectId,
          type: "video",
          name: `分镜_${idx + 1}_video.mp4`,
          path: videoPath,
          url: `/api/assets/file/${videoId}`,
          size: buffer.length,
          mimeType: "video/mp4",
          source: "ai-generated",
          metadata: JSON.stringify({ panelId: panel.id, taskId }),
        }).run();

        return videoId;
      })
    );

    // 检查失败的任务
    tasks.forEach((t, j) => {
      if (t.status === "rejected") {
        const msg = t.reason instanceof Error ? t.reason.message : "未知错误";
        onProgress("video", "running", 0, `第 ${i + j + 1} 段视频失败: ${msg}`);
      }
    });
  }

  onProgress("video", "done", 100, `完成！共生成 ${panelsWithImage.length} 段分镜视频`);
}

// ==================== 逐个生成分镜视频 ====================
async function stepGenerateVideosSequential(
  projectId: string,
  videoConfig: VideoGenConfig,
  onProgress: (step: PipelineStep, status: StepStatus, progress: number, message: string) => void
) {
  onProgress("video", "running", 0, "开始逐个生成分镜视频...");
  const panelList = await getDb().select().from(panels).where(eq(panels.projectId, projectId)).all();
  const panelsWithImage = panelList.filter((p) => p.imageUrl);

  if (panelsWithImage.length === 0) {
    onProgress("video", "done", 100, "没有已生成图片的分镜，跳过视频生成");
    return;
  }

  const workDir = path.join(process.cwd(), "data", projectId, "videos");
  fs.mkdirSync(workDir, { recursive: true });

  // 一次性加载角色数据
  const characterList = await getDb().select().from(characters).where(eq(characters.projectId, projectId)).all();

  // 逐个串行生成
  for (let idx = 0; idx < panelsWithImage.length; idx++) {
    const panel = panelsWithImage[idx];
    const pct = Math.round(((idx + 1) / panelsWithImage.length) * 100);
    onProgress("video", "running", pct, `生成第 ${idx + 1}/${panelsWithImage.length} 段视频: ${panel.prompt?.slice(0, 20)}...`);

    try {
      // 构建 prompt
      const prompt = `anime style, ${panel.camera || "medium shot"}, ${panel.prompt || "detailed illustration"}, smooth animation, cinematic`;

      // 读取本地图片转 base64
      const imgPath = path.join(process.cwd(), "data", projectId, "images", `${panel.id}.png`);
      if (!fs.existsSync(imgPath)) {
        throw new Error(`分镜图片不存在: ${panel.id}`);
      }
      const imgBuffer = fs.readFileSync(imgPath);
      const imgBase64 = `data:image/png;base64,${imgBuffer.toString("base64")}`;

      // 拼接角色一致性提示
      const referencedChars = (panel.characters || '').split(',').map(s => s.trim()).filter(Boolean);
      let videoPrompt = prompt;
      for (const charName of referencedChars) {
        const charRec = characterList.find(c => c.name === charName);
        if (charRec && charRec.consistencyPrompt) {
          videoPrompt += ` 【角色:${charName}: ${charRec.consistencyPrompt}】`;
        }
      }

      // 提交视频任务
      const taskId = await submitVideoTask(videoConfig, imgBase64, videoPrompt);

      // 等待完成
      const videoUrl = await waitForVideo(videoConfig, taskId);

      // 下载视频到本地
      const videoId = uuid();
      const videoPath = path.join(workDir, `${videoId}.mp4`);
      const res = await fetch(videoUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(videoPath, buffer);

      // 更新分镜记录（立即写入，前端可随时预览）
      await getDb().update(panels).set({
        videoUrl: `/api/assets/file/${videoId}`,
      }).where(eq(panels.id, panel.id)).run();

      // 注册资产
      await getDb().insert(assets).values({
        id: videoId,
        projectId,
        type: "video",
        name: `分镜_${idx + 1}_video.mp4`,
        path: videoPath,
        url: `/api/assets/file/${videoId}`,
        size: buffer.length,
        mimeType: "video/mp4",
        source: "ai-generated",
        metadata: JSON.stringify({ panelId: panel.id, taskId }),
      }).run();

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      onProgress("video", "running", pct, `第 ${idx + 1} 段视频失败: ${msg}`);
      // 失败不中断，继续下一个
    }
  }

  onProgress("video", "done", 100, `完成！共生成 ${panelsWithImage.length} 段分镜视频`);
}

// ==================== 主管线执行器 ====================
export async function runPipeline(
  projectId: string,
  config: {
    llm: LLMConfig;
    imageGen: ImageGenConfig;
    videoGen?: VideoGenConfig;
    tts: { apiKey: string; baseUrl?: string; model?: string; voice?: string };
  },
  startFrom?: PipelineStep
): Promise<void> {
  const state = getPipelineState(projectId);
  if (pipelineLocks.get(projectId)) return;
  pipelineLocks.set(projectId, true);
  state.isRunning = true;
  state.cancelled = false;

  const project = await getDb().select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) { state.isRunning = false;
    pipelineLocks.set(projectId, false); return; }

  const startIdx = startFrom ? ALL_STEPS.indexOf(startFrom) : 0;
  const onProgress = (step: PipelineStep, status: StepStatus, progress: number, message: string) => {
    updateStep(state, step, status, progress, message);
  };

  try {
    // 步骤: 剧本分析/分镜/角色提取 已由 analyze API 完成，标记跳过
    for (const skipStep of ["script", "storyboard", "characters"] as PipelineStep[]) {
      if (startIdx <= ALL_STEPS.indexOf(skipStep)) {
        updateStep(state, skipStep, "skipped", 100, "已由剧本分析步骤完成");
      }
    }

    // 管线取消检查点
    const checkCancelled = () => {
      if (state.cancelled) throw new Error("__PIPELINE_CANCELLED__");
    };

    // 判断是否只运行到 images 就暂停（startFrom 为 images 时，不自动触发后续步骤）
    const onlyRunToImages = startFrom === "images";

    // 步骤: 图片生成
    checkCancelled();
    if (startIdx <= ALL_STEPS.indexOf("images")) {
      await stepGenerateImages(projectId, config.imageGen, project.style || "anime", onProgress);
    }

    // 当 startFrom === 'images' 时，在 images 完成后暂停，不自动触发 video/voiceover/export
    if (onlyRunToImages) {
      state.isRunning = false;
      return;
    }

    // 步骤: 分镜视频生成（可选）
    checkCancelled();
    if (startIdx <= ALL_STEPS.indexOf("video")) {
      // 当 startFrom 为 'video' 时，先检查所有分镜的 imageUrl 是否都已生成
      if (startFrom === "video") {
        const panelList = await getDb().select().from(panels).where(eq(panels.projectId, projectId)).all();
        const missingImages = panelList.filter((p) => !p.imageUrl);
        if (missingImages.length > 0) {
          throw new Error(`有 ${missingImages.length} 个分镜尚未生成图片，无法进入视频生成阶段。请先生成图片后再重试。`);
        }
      }
      if (config.videoGen?.apiKey) {
        await stepGenerateVideosSequential(projectId, config.videoGen, onProgress);
      } else {
        updateStep(state, "video", "skipped", 100, "未配置视频生成 API，跳过");
      }
    }

    // 步骤: 配音
    checkCancelled();
    if (startIdx <= ALL_STEPS.indexOf("voiceover") && config.tts.apiKey) {
      await stepGenerateVoiceover(projectId, config.tts, onProgress);
    } else if (startIdx <= ALL_STEPS.indexOf("voiceover")) {
      updateStep(state, "voiceover", "skipped", 100, "未配置TTS，跳过配音");
    }

    // 步骤: 视频合成（可选，需要 FFmpeg）
    checkCancelled();
    if (startIdx <= ALL_STEPS.indexOf("composition")) {
      updateStep(state, "composition", "running", 0, "检查视频合成环境...");
      try {
        const { execSync } = await import("child_process");
        execSync("ffmpeg -version", { stdio: "ignore" });
        updateStep(state, "composition", "done", 100, "FFmpeg 可用，视频合成就绪");
      } catch {
        updateStep(state, "composition", "skipped", 100, "服务器无 FFmpeg，跳过视频合成");
      }
    }

    // 步骤: 导出（生成分镜文档）
    checkCancelled();
    if (startIdx <= ALL_STEPS.indexOf("export")) {
      updateStep(state, "export", "running", 0, "生成分镜文档...");
      try {
        const panelList = await getDb().select().from(panels).where(eq(panels.projectId, projectId)).all();
        const outDir = path.join(process.cwd(), "data", projectId, "export");
        fs.mkdirSync(outDir, { recursive: true });
        
        let md = `# ${project.title || "未命名项目"} - 分镜脚本\n\n`;
        md += `> 风格: ${project.style || "anime"} | 生成时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
        panelList.forEach((p, i) => {
          md += `## 分镜 ${i + 1}\n`;
          md += `- **类型**: ${p.panelType}\n`;
          md += `- **镜头**: ${p.camera}\n`;
          if (p.dialogue) md += `- **台词**: ${p.dialogue}\n`;
          if (p.narration) md += `- **旁白**: ${p.narration}\n`;
          md += `- **时长**: ${p.duration}秒\n`;
          md += `- **转场**: ${p.transition}\n`;
          if (p.imageUrl) md += `- **图片**: ${p.imageUrl}\n`;
          md += `- **Prompt**: ${p.prompt}\n\n`;
        });
        
        fs.writeFileSync(path.join(outDir, "storyboard.md"), md);
        updateStep(state, "export", "done", 100, `已导出 ${panelList.length} 个分镜`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "导出失败";
        updateStep(state, "export", "error", 0, msg, msg);
      }
    }

    // 标记完成
    updateStep(state, "done", "done", 100, "全部完成！");
    await getDb().update(projects).set({ status: "done", updatedAt: new Date() }).where(eq(projects.id, projectId)).run();
  } catch (e: unknown) {
    if (state.cancelled) {
      // 用户主动取消，不标记为 error
      updateStep(state, state.currentStep, "cancelled", 0, "管线已被用户取消");
    } else {
      const msg = e instanceof Error ? e.message : "管线执行失败";
      updateStep(state, state.currentStep, "error", 0, msg, msg);
    }
  } finally {
    state.isRunning = false;
    pipelineLocks.set(projectId, false);
  }
}

// 画风 prompt 映射
function getStylePrompt(style: string): string {
  const map: Record<string, string> = {
    anime: "anime style, cel shading, vibrant colors, manga illustration",
    comic: "western comic style, bold lines, dynamic shading",
    watercolor: "watercolor painting style, soft edges, delicate colors",
    realistic: "photorealistic, cinematic lighting, detailed textures",
    pixel: "pixel art style, retro game aesthetic, 16-bit",
    ink: "traditional chinese ink painting, brush strokes, minimalist",
    ghibli: "studio ghibli style, warm colors, detailed backgrounds, whimsical",
    cyberpunk: "cyberpunk style, neon lights, dark atmosphere, futuristic",
    flat: "flat design illustration, clean lines, geometric shapes",
    chibi: "chibi style, cute proportions, big eyes, kawaii",
    noir: "black and white manga, high contrast, dramatic shading",
    ukiyo: "ukiyo-e style, japanese woodblock print, flat perspective",
  };
  return map[style] || map.anime;
}
