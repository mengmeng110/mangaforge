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
export type StepStatus = "pending" | "running" | "done" | "error" | "skipped";

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

  const stylePrompt = getStylePrompt(style);
  const workDir = path.join(process.cwd(), "data", projectId, "images");
  fs.mkdirSync(workDir, { recursive: true });

  for (let i = 0; i < panelList.length; i++) {
    const panel = panelList[i];
    const pct = Math.round(((i) / panelList.length) * 100);
    onProgress("images", "running", pct, `生成第 ${i + 1}/${panelList.length} 张: ${panel.prompt?.slice(0, 30)}...`);

    try {
      const fullPrompt = `${panel.prompt}, ${stylePrompt}`;
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
        const prompt = `anime style, ${panel.camera || "medium shot"}, ${panel.prompt || ""}, smooth animation, cinematic`;
        
        // 获取图片完整 URL（需要拼接域名，这里用相对路径先存本地）
        const imgPath = path.join(process.cwd(), "data", projectId, "images", `${panel.id}.png`);
        if (!fs.existsSync(imgPath)) {
          throw new Error(`分镜图片不存在: ${panel.id}`);
        }

        // 提交视频生成任务
        const taskId = await submitVideoTask(videoConfig, imgPath, prompt);
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
  if (state.isRunning) return;
  state.isRunning = true;

  const project = await getDb().select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) { state.isRunning = false; return; }

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

    // 步骤: 图片生成
    if (startIdx <= ALL_STEPS.indexOf("images")) {
      await stepGenerateImages(projectId, config.imageGen, project.style || "anime", onProgress);
    }

    // 步骤: 分镜视频生成（可选）
    if (startIdx <= ALL_STEPS.indexOf("video") && config.videoGen?.apiKey) {
      await stepGenerateVideos(projectId, config.videoGen, onProgress);
    } else if (startIdx <= ALL_STEPS.indexOf("video")) {
      updateStep(state, "video", "skipped", 100, "未配置视频生成 API，跳过");
    }

    // 步骤: 配音
    if (startIdx <= ALL_STEPS.indexOf("voiceover") && config.tts.apiKey) {
      await stepGenerateVoiceover(projectId, config.tts, onProgress);
    }

    // 步骤: 视频合成（可选，需要 FFmpeg）
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
    const msg = e instanceof Error ? e.message : "管线执行失败";
    updateStep(state, state.currentStep, "error", 0, msg, msg);
  } finally {
    state.isRunning = false;
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
