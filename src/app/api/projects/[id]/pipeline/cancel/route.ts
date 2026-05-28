export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cancelPipeline, getPipelineState } from "@/lib/ai/pipeline";

// POST /api/projects/[id]/pipeline/cancel - 取消管线
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const state = getPipelineState(id);
    if (!state.isRunning) {
      return NextResponse.json({ error: "管线未在运行中" }, { status: 400 });
    }
    const ok = cancelPipeline(id);
    if (!ok) {
      return NextResponse.json({ error: "取消失败" }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "管线已取消" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "取消失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
