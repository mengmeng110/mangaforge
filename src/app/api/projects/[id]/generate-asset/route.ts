import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assets } from "@/lib/db/schema";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type, prompt, name } = body;
    
    if (!prompt || !name) {
      return NextResponse.json({ error: "prompt 和 name 必填" }, { status: 400 });
    }
    if (type !== "character" && type !== "scene") {
      return NextResponse.json({ error: "type 必须是 character 或 scene" }, { status: 400 });
    }

    // 从请求头获取 API 配置
    const apiKey = req.headers.get("x-api-key") || "";
    const baseUrl = req.headers.get("x-base-url") || "https://apihub.agnes-ai.com/v1";
    const model = req.headers.get("x-model") || "agnes-image-2.1-flash";

    if (!apiKey) {
      return NextResponse.json({ error: "未配置图片生成 API Key" }, { status: 400 });
    }

    // 调用生图 API
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[生图] 失败:", errText);
      return NextResponse.json({ error: `生图失败 (${res.status}): ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const imageUrl = data.data?.[0]?.url || "";
    
    if (!imageUrl) {
      return NextResponse.json({ error: "生图成功但未返回图片 URL" }, { status: 500 });
    }

    // 保存到数据库
    const db = await getDb();
    const assetId = `asset_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(assets).values({
      id: assetId,
      projectId: id,
      type,
      name,
      url: imageUrl,
      prompt,
      status: "done",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, assetId, imageUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "生图失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
