import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// GET /api/assets - 获取资产列表
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const type = url.searchParams.get("type");

  let query = db.select().from(assets).orderBy(desc(assets.createdAt));
  if (projectId) query = query.where(eq(assets.projectId, projectId)) as typeof query;
  const all = await query.all();

  const filtered = type ? all.filter((a) => a.type === type) : all;
  return NextResponse.json(filtered);
}

// POST /api/assets - 上传/注册资产
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const type = formData.get("type") as string || "image";
  const name = formData.get("name") as string || "untitled";
  const source = formData.get("source") as string || "uploaded";
  const metadata = formData.get("metadata") as string || null;
  const tags = formData.get("tags") as string || null;
  const externalUrl = formData.get("url") as string | null;

  const id = uuid();
  let filePath = "";
  let fileUrl = externalUrl || "";
  let fileSize = 0;
  let mimeType = "";

  if (file) {
    // 保存上传文件
    const ext = file.name.split(".").pop() || "bin";
    const dir = path.join(process.cwd(), "data", "assets", projectId || "_global");
    fs.mkdirSync(dir, { recursive: true });
    filePath = path.join(dir, `${id}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    fileSize = buffer.length;
    mimeType = file.type;
    fileUrl = `/api/assets/file/${id}`;
  }

  await db.insert(assets).values({
    id,
    projectId: projectId || null,
    type,
    name,
    path: filePath,
    url: fileUrl,
    size: fileSize || null,
    mimeType: mimeType || null,
    source,
    metadata,
    tags,
  }).run();

  return NextResponse.json({ id, url: fileUrl });
}
