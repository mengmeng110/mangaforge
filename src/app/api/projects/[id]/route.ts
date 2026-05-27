export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, characters, scenes, panels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/projects/[id] - 获取项目详情
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

    const chars = await db.select().from(characters).where(eq(characters.projectId, id)).all();
    const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, id)).all();
    const panelList = await db.select().from(panels).where(eq(panels.projectId, id)).all();

    return NextResponse.json({ ...project, characters: chars, scenes: sceneList, panels: panelList });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "查询失败";
    console.error("GET /api/projects/[id] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
