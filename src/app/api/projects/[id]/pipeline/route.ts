export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPipelineState, runPipeline } from "@/lib/ai/pipeline";
import type { LLMConfig, ImageGenConfig } from "@/lib/ai/engine";

// GET /api/projects/[id]/pipeline - 获取管线状态
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const state = getPipelineState(id);
    return NextResponse.json(state);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "查询失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/projects/[id]/pipeline - 启动管线
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { llmConfig, imageGenConfig, ttsConfig, startFrom } = body;

    if (!llmConfig?.apiKey || !imageGenConfig?.apiKey) {
      return NextResponse.json({ error: "请先配置 LLM 和图片生成的 API Key" }, { status: 400 });
    }

    // 异步启动管线（不阻塞响应）
    runPipeline(id, {
      llm: llmConfig as LLMConfig,
      imageGen: imageGenConfig as ImageGenConfig,
      tts: ttsConfig || { apiKey: "" },
    }, startFrom).catch(console.error);

    return NextResponse.json({ success: true, message: "管线已启动" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "启动失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
