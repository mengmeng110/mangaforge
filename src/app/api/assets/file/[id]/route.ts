export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";

// GET /api/assets/file/[id] - 提供资产文件
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset || !asset.path || !fs.existsSync(asset.path)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
  const buffer = fs.readFileSync(asset.path);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${asset.name}"`,
    },
  });
}
