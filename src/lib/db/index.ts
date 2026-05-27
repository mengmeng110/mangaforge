import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// 懒加载单例
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const DB_DIR = path.join(process.cwd(), "data");
  const DB_PATH = path.join(DB_DIR, "mangaforge.db");

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, genre TEXT, style TEXT DEFAULT 'anime', status TEXT DEFAULT 'draft', created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, personality TEXT, voice_id TEXT, reference_images TEXT, consistency_prompt TEXT, created_at INTEGER DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, "index" INTEGER NOT NULL, title TEXT, description TEXT, location TEXT, time_of_day TEXT, mood TEXT, bgm_style TEXT, image_url TEXT);
    CREATE TABLE IF NOT EXISTS panels (id TEXT PRIMARY KEY, scene_id TEXT NOT NULL, project_id TEXT NOT NULL, "index" INTEGER NOT NULL, panel_type TEXT DEFAULT 'dialogue', prompt TEXT, negative_prompt TEXT, image_url TEXT, start_frame_url TEXT, end_frame_url TEXT, video_url TEXT, camera TEXT, characters TEXT, dialogue TEXT, speaker TEXT, narration TEXT, sound_effect TEXT, duration REAL DEFAULT 3, transition TEXT DEFAULT 'cut', status TEXT DEFAULT 'pending');
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, project_id TEXT, type TEXT NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL, url TEXT, size INTEGER, mime_type TEXT, source TEXT, metadata TEXT, tags TEXT, created_at INTEGER DEFAULT (unixepoch()));
    CREATE TABLE IF NOT EXISTS canvases (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '未命名画布', project_id TEXT, data TEXT, thumbnail TEXT, created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch()));
  `);

  _db = drizzle(sqlite, { schema });
  return _db;
}

// 兼容旧的 db.xxx() 调用方式
export const db = {
  select: (...args: any[]) => getDb().select(...args as [any]),
  insert: (...args: any[]) => getDb().insert(...args as [any]),
  update: (...args: any[]) => getDb().update(...args as [any]),
  delete: (...args: any[]) => getDb().delete(...args as [any]),
};
