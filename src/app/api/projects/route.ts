export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

// GET /api/projects - 列出所有项目
export async function GET() {
  try {
    const all = await db.select().from(projects).all();
    return NextResponse.json(all);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "查询失败";
    console.error("GET /api/projects error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/projects - 创建新项目
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuid();
    await db.insert(projects).values({
      id,
      title: body.title || "未命名项目",
      description: body.script?.slice(0, 200) || "",
      genre: body.genre || null,
      style: body.style || "anime",
      status: "draft",
    }).run();

    // 保存原始剧本到文件
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "data", id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "script.txt"), body.script || "");

    return NextResponse.json({ id, status: "draft" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "创建失败";
    console.error("POST /api/projects error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
