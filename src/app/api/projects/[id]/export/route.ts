import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { panels, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

// GET /api/projects/[id]/export - 导出分镜
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const panelList = await db.select().from(panels).where(eq(panels.projectId, id)).orderBy(panels.index).all();
  const assetList = await db.select().from(assets).where(eq(assets.projectId, id)).all();

  const outDir = path.join(process.cwd(), "data", id, "export");
  fs.mkdirSync(outDir, { recursive: true });

  if (format === "json") {
    // 导出完整项目 JSON
    const data = { projectId: id, panels: panelList, assets: assetList, exportedAt: new Date().toISOString() };
    const filePath = path.join(outDir, `mangaforge_${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="mangaforge_${id}.json"` },
    });
  }

  if (format === "srt") {
    // 导出字幕文件
    let srt = "";
    let time = 0;
    panelList.forEach((p, i) => {
      const text = p.dialogue || p.narration || "";
      if (!text) return;
      const start = fmtSrt(time);
      const end = fmtSrt(time + (p.duration || 3));
      srt += `${i + 1}\n${start} --> ${end}\n${text}\n\n`;
      time += p.duration || 3;
    });
    const filePath = path.join(outDir, `mangaforge_${id}.srt`);
    fs.writeFileSync(filePath, srt);
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "text/plain", "Content-Disposition": `attachment; filename="mangaforge_${id}.srt"` },
    });
  }

  if (format === "storyboard") {
    // 导出分镜脚本文档
    let md = `# 分镜脚本\n\n`;
    panelList.forEach((p, i) => {
      md += `## 分镜 ${i + 1}\n`;
      md += `- **类型**: ${p.panelType}\n`;
      md += `- **镜头**: ${p.camera}\n`;
      if (p.dialogue) md += `- **台词**: ${p.dialogue}\n`;
      if (p.narration) md += `- **旁白**: ${p.narration}\n`;
      md += `- **时长**: ${p.duration}秒\n`;
      md += `- **转场**: ${p.transition}\n`;
      md += `- **Prompt**: ${p.prompt}\n\n`;
    });
    const filePath = path.join(outDir, `mangaforge_${id}_storyboard.md`);
    fs.writeFileSync(filePath, md);
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename="mangaforge_${id}_storyboard.md"` },
    });
  }

  return NextResponse.json({ error: "不支持的格式" }, { status: 400 });
}

function fmtSrt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}
function pad(n: number) { return String(n).padStart(2, "0"); }
