export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";

// GET /api/projects/[id]/video - 获取项目合成视频
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const videoAsset = await db.select().from(assets).where(
      and(eq(assets.projectId, id), eq(assets.type, "video"))
    ).get();

    if (!videoAsset || !videoAsset.path || !fs.existsSync(videoAsset.path)) {
      return NextResponse.json({ error: "视频尚未生成", videoReady: false }, { status: 404 });
    }

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "获取视频失败";
    console.error("GET /api/projects/[id]/video error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
