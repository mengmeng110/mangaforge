export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, characters, scenes, panels } from "@/lib/db/schema";
import { analyzeScript } from "@/lib/ai/script-analyzer";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// POST /api/projects/[id]/analyze - 分析剧本
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 读取设置（从请求头或 body）
  const body = await req.json();
  const llmConfig = body.llmConfig;
  if (!llmConfig?.apiKey) {
    return NextResponse.json({ error: "请先到 API 设置页面配置 LLM 的 API Key" }, { status: 400 });
  }
  if (!llmConfig?.baseUrl) {
    return NextResponse.json({ error: "请先配置 LLM 的 Base URL" }, { status: 400 });
  }
  if (!llmConfig?.model) {
    return NextResponse.json({ error: "请先配置 LLM 模型名" }, { status: 400 });
  }

  // 读取原始剧本
  const scriptPath = path.join(process.cwd(), "data", id, "script.txt");
  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json({ error: "找不到剧本文件" }, { status: 404 });
  }
  const script = fs.readFileSync(scriptPath, "utf-8");

  console.log(`[Analyze] 开始分析项目 ${id}, LLM: ${llmConfig.baseUrl} / ${llmConfig.model}`);

  // 更新状态
  await db.update(projects).set({ status: "analyzing" }).where(eq(projects.id, id)).run();

  try {
    // AI 分析
    const result = await analyzeScript(llmConfig, script);
    console.log(`[Analyze] 分析完成: ${result.characters.length}角色, ${result.scenes.length}场景, ${result.panels.length}分镜`);

    // 保存角色
    for (const char of result.characters) {
      await db.insert(characters).values({
        id: uuid(),
        projectId: id,
        name: char.name,
        description: char.description,
        personality: char.personality,
        consistencyPrompt: char.consistencyPrompt,
      }).run();
    }

    // 先插入场景，拿到 sceneId
    const sceneIds: string[] = [];
    for (let i = 0; i < result.scenes.length; i++) {
      const scene = result.scenes[i];
      const sceneId = uuid();
      sceneIds.push(sceneId);
      await db.insert(scenes).values({
        id: sceneId,
        projectId: id,
        index: i,
        title: scene.title,
        description: scene.description,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        mood: scene.mood,
        bgmStyle: scene.bgmStyle,
      }).run();
    }

    // 保存分镜（关联到正确的 sceneId）
    for (let i = 0; i < result.panels.length; i++) {
      const panel = result.panels[i];
      const sceneIdx = panel.sceneIndex ?? 0;
      await db.insert(panels).values({
        id: uuid(),
        sceneId: sceneIds[sceneIdx] || sceneIds[0] || "",
        projectId: id,
        index: i,
        panelType: panel.dialogue ? "dialogue" : panel.narration ? "narration" : "action",
        prompt: panel.prompt,
        camera: panel.camera,
        characters: JSON.stringify(panel.characters || []),
        dialogue: panel.dialogue || null,
        speaker: panel.speaker || null,
        narration: panel.narration || null,
        soundEffect: panel.soundEffect || null,
        duration: panel.duration || 3,
        transition: panel.transition || "cut",
      }).run();
    }

    // 更新项目状态
    await db.update(projects).set({
      status: "analyzed",
      title: result.title,
      genre: result.genre,
      updatedAt: new Date(),
    }).where(eq(projects.id, id)).run();

    return NextResponse.json({
      success: true,
      title: result.title,
      genre: result.genre,
      characterCount: result.characters.length,
      sceneCount: result.scenes.length,
      panelCount: result.panels.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "分析失败";
    await db.update(projects).set({ status: "error" }).where(eq(projects.id, id)).run();
    console.error("剧本分析失败:", msg);
    return NextResponse.json({ error: `AI 分析失败: ${msg}` }, { status: 500 });
  }
}
