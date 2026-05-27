export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canvases } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// GET /api/canvases - 获取画布列表
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    let query = db.select().from(canvases).orderBy(desc(canvases.updatedAt));
    const all = await query.all();
    const filtered = projectId ? all.filter((c) => c.projectId === projectId) : all;
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("GET /api/canvases error:", error);
    return NextResponse.json(
      { error: "获取画布列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/canvases - 创建/保存画布
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, projectId, data, thumbnail } = body;

    if (id) {
      // 更新已有画布
      await db.update(canvases).set({
        name: name || undefined,
        data: data || undefined,
        thumbnail: thumbnail || undefined,
        updatedAt: new Date(),
      }).where(eq(canvases.id, id)).run();
      return NextResponse.json({ id });
    }

    // 创建新画布
    const newId = uuid();
    await db.insert(canvases).values({
      id: newId,
      name: name || "未命名画布",
      projectId: projectId || null,
      data: data || null,
      thumbnail: thumbnail || null,
    }).run();
    return NextResponse.json({ id: newId });
  } catch (error) {
    console.error("POST /api/canvases error:", error);
    return NextResponse.json(
      { error: "创建/保存画布失败" },
      { status: 500 }
    );
  }
}
