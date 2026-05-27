export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canvases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/canvases/[id] - 删除画布
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(canvases).where(eq(canvases.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/canvases/[id] error:", error);
    return NextResponse.json({ error: "删除画布失败" }, { status: 500 });
  }
}

// GET /api/canvases/[id] - 获取单个画布
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const canvas = await db.select().from(canvases).where(eq(canvases.id, id)).get();
    if (!canvas) return NextResponse.json({ error: "画布不存在" }, { status: 404 });
    return NextResponse.json(canvas);
  } catch (error) {
    console.error("GET /api/canvases/[id] error:", error);
    return NextResponse.json({ error: "获取画布失败" }, { status: 500 });
  }
}
