export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { panels, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/projects/[id]/panels/[panelId] - 更新分镜字段
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  try {
    const { id, panelId } = await params;
    const body = await req.json();

    // 允许更新的字段白名单
    const allowedFields = ["dialogue", "narration", "camera", "speaker", "soundEffect", "prompt", "duration", "transition", "panelType"] as const;
    type AllowedField = (typeof allowedFields)[number];

    const updates: Partial<Record<AllowedField, string | number | null>> = {};
    for (const key of allowedFields) {
      if (key in body) {
        (updates as Record<string, unknown>)[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有有效的更新字段" }, { status: 400 });
    }

    // 验证分镜存在且属于该项目
    const panel = await db
      .select()
      .from(panels)
      .where(and(eq(panels.id, panelId), eq(panels.projectId, id)))
      .get();

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在或不属于该项目" }, { status: 404 });
    }

    // 执行更新
    await db
      .update(panels)
      .set(updates)
      .where(eq(panels.id, panelId))
      .run();

    // 同步更新项目的 updatedAt
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, id))
      .run();

    // 返回更新后的分镜
    const updated = await db.select().from(panels).where(eq(panels.id, panelId)).get();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "更新失败";
    console.error("PATCH /api/projects/[id]/panels/[panelId] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
