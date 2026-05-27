export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";

// GET /api/projects/[id]/video - 获取项目合成视频
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 查找项目下的视频资产
  const videoAsset = await db.select().from(assets).where(
    and(eq(assets.projectId, id), eq(assets.type, "video"))
  ).get();

  if (!videoAsset || !videoAsset.path || !fs.existsSync(videoAsset.path)) {
    return NextResponse.json({ error: "视频尚未生成", videoReady: false }, { status: 404 });
  }

  // 流式返回视频文件
  const stat = fs.statSync(videoAsset.path);
  const buffer = fs.readFileSync(videoAsset.path);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": videoAsset.mimeType || "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `inline; filename="${videoAsset.name}"`,
      "Accept-Ranges": "bytes",
    },
  });
}
