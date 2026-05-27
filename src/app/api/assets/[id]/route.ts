import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";

// DELETE /api/assets/[id] - 删除资产
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset) return NextResponse.json({ error: "资产不存在" }, { status: 404 });

  // 删除文件
  if (asset.path && fs.existsSync(asset.path)) {
    fs.unlinkSync(asset.path);
  }
  // 删除数据库记录
  await db.delete(assets).where(eq(assets.id, id)).run();
  return NextResponse.json({ success: true });
}

// GET /api/assets/[id] - 获取单个资产详情
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!asset) return NextResponse.json({ error: "资产不存在" }, { status: 404 });
  return NextResponse.json(asset);
}
