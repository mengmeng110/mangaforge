// MangaForge 视频合成引擎（FFmpeg）
// 融合 deep-printfilm 的关键帧驱动 + waoowaoo 的全流程管线

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export interface PanelAsset {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  dialogue?: string;
  narration?: string;
  duration: number;
  transition: string;
}

// BGM 风格映射（静音合成，后续可替换为真实BGM文件）
const BGM_MAP: Record<string, string> = {
  warm: "warm",
  tense: "tense",
  cheerful: "cheerful",
  sad: "sad",
  epic: "epic",
};

// 下载远程文件到本地
async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败: ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

// Ken Burns 效果：图片缓慢缩放/平移，产生动态感
function kenBurnsFilter(duration: number, index: number): string {
  const zoomStart = 1.0;
  const zoomEnd = 1.15;
  const direction = index % 2 === 0 ? 1 : -1;
  return `zoompan=z='min(zoom+${(zoomEnd - zoomStart) / duration}*(${duration}*25)+${zoomStart},${zoomEnd})':x='iw/2-(iw/zoom/2)+${direction}*(${duration}*25)*0.5':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1920x1080:fps=25`;
}

// 合成单个分镜片段
async function composePanel(
  panel: PanelAsset,
  index: number,
  tmpDir: string,
  outDir: string
): Promise<string> {
  const outputPath = path.join(outDir, `panel_${String(index).padStart(4, "0")}.mp4`);

  if (panel.videoUrl) {
    // 已有视频，直接下载
    const videoPath = path.join(tmpDir, `video_${index}.mp4`);
    await downloadFile(panel.videoUrl, videoPath);
    // 裁剪到指定时长
    await execAsync(`ffmpeg -y -i "${videoPath}" -t ${panel.duration} -c:v libx264 -c:a aac "${outputPath}"`);
  } else if (panel.imageUrl) {
    // 图片 → Ken Burns 动态视频
    const imgPath = path.join(tmpDir, `img_${index}.png`);
    await downloadFile(panel.imageUrl, imgPath);
    const kbFilter = kenBurnsFilter(panel.duration, index);
    await execAsync(
      `ffmpeg -y -i "${imgPath}" -vf "${kbFilter}" -t ${panel.duration} -c:v libx264 -pix_fmt yuv420p -r 25 "${outputPath}"`
    );
  } else {
    // 无素材，生成黑屏
    await execAsync(
      `ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=${panel.duration} -c:v libx264 "${outputPath}"`
    );
  }

  return outputPath;
}

// 生成字幕 SRT
function generateSRT(panels: PanelAsset[]): string {
  let srt = "";
  let time = 0;
  panels.forEach((panel, i) => {
    const text = panel.dialogue || panel.narration || "";
    if (!text) return;
    const start = formatSRTTime(time);
    const end = formatSRTTime(time + panel.duration);
    srt += `${i + 1}\n${start} --> ${end}\n${text}\n\n`;
    time += panel.duration;
  });
  return srt;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

// 主合成函数：拼接所有分镜 + 字幕 → 最终视频
export async function composeVideo(
  panels: PanelAsset[],
  projectId: string
): Promise<{ videoPath: string; srtPath: string }> {
  const workDir = path.join(process.cwd(), "data", projectId);
  const tmpDir = path.join(workDir, "tmp");
  const outDir = path.join(workDir, "output");
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // 1. 合成每个分镜片段
  const clipPaths: string[] = [];
  for (let i = 0; i < panels.length; i++) {
    const clipPath = await composePanel(panels[i], i, tmpDir, outDir);
    clipPaths.push(clipPath);
  }

  // 2. 生成拼接列表
  const concatList = clipPaths.map((p) => `file '${p}'`).join("\n");
  const concatPath = path.join(tmpDir, "concat.txt");
  fs.writeFileSync(concatPath, concatList);

  // 3. 拼接所有片段
  const finalPath = path.join(outDir, `mangaforge_${projectId}.mp4`);
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -c:a aac -movflags +faststart "${finalPath}"`
  );

  // 4. 生成字幕文件
  const srtContent = generateSRT(panels);
  const srtPath = path.join(outDir, `mangaforge_${projectId}.srt`);
  fs.writeFileSync(srtPath, srtContent);

  return { videoPath: finalPath, srtPath };
}
