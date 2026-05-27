// 数据库自动迁移脚本 — 每次启动时检查并创建缺失的表
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "mangaforge.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// 创建所有表
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    style TEXT DEFAULT 'anime',
    status TEXT DEFAULT 'draft',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    personality TEXT,
    voice_id TEXT,
    reference_images TEXT,
    consistency_prompt TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "index" INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    location TEXT,
    time_of_day TEXT,
    mood TEXT,
    bgm_style TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS panels (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "index" INTEGER NOT NULL,
    panel_type TEXT DEFAULT 'dialogue',
    prompt TEXT,
    negative_prompt TEXT,
    image_url TEXT,
    start_frame_url TEXT,
    end_frame_url TEXT,
    video_url TEXT,
    camera TEXT,
    characters TEXT,
    dialogue TEXT,
    speaker TEXT,
    narration TEXT,
    sound_effect TEXT,
    duration REAL DEFAULT 3,
    transition TEXT DEFAULT 'cut',
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    url TEXT,
    size INTEGER,
    mime_type TEXT,
    source TEXT,
    metadata TEXT,
    tags TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS canvases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '未命名画布',
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data TEXT,
    thumbnail TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

sqlite.close();
console.log("✅ 数据库表初始化完成");
