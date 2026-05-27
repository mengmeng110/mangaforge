import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ==================== 项目 ====================
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  genre: text("genre"), // 言情/悬疑/科幻/喜剧/古风...
  style: text("style").default("anime"), // anime/comic/realistic/watercolor
  status: text("status").default("draft"), // draft/analyzing/generating/composing/done
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ==================== 角色 ====================
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"), // 外貌描述
  personality: text("personality"), // 性格特征
  voiceId: text("voice_id"), // TTS voice ID
  referenceImages: text("reference_images"), // JSON: 参考图URL列表（含四视图）
  consistencyPrompt: text("consistency_prompt"), // 用于保持一致性的 prompt
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ==================== 场景 ====================
export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  index: integer("index").notNull(), // 场景顺序
  title: text("title"),
  description: text("description"), // 场景描述
  location: text("location"), // 地点
  timeOfDay: text("time_of_day"), // 时间（白天/黄昏/夜晚）
  mood: text("mood"), // 氛围
  bgmStyle: text("bgm_style"), // BGM 风格
  imageUrl: text("image_url"), // 场景背景图
});

// ==================== 分镜 ====================
export const panels = sqliteTable("panels", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  index: integer("index").notNull(), // 分镜顺序
  panelType: text("panel_type").default("dialogue"), // dialogue/action/narration/transition
  // 画面
  prompt: text("prompt"), // 生图 prompt
  negativePrompt: text("negative_prompt"),
  imageUrl: text("image_url"), // 生成的图片
  startFrameUrl: text("start_frame_url"), // 首帧（关键帧驱动）
  endFrameUrl: text("end_frame_url"), // 尾帧
  videoUrl: text("video_url"), // 生成的视频片段
  // 画面参数
  camera: text("camera"), // 特写/中景/远景/俯视/仰视
  characters: text("characters"), // JSON: 出场角色ID列表
  dialogue: text("dialogue"), // 台词
  speaker: text("speaker"), // 说话角色ID
  narration: text("narration"), // 旁白
  soundEffect: text("sound_effect"), // 音效描述
  duration: real("duration").default(3), // 时长(秒)
  transition: text("transition").default("cut"), // 转场: cut/fade/slide
  status: text("status").default("pending"), // pending/generating/done/error
});

// ==================== 资产管理 ====================
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // image/audio/video/subtitle/bgm
  name: text("name").notNull(), // 文件名
  path: text("path").notNull(), // 存储路径
  url: text("url"), // 可访问URL
  size: integer("size"), // 文件大小(字节)
  mimeType: text("mime_type"), // MIME类型
  source: text("source"), // 来源: ai-generated/uploaded/converted
  metadata: text("metadata"), // JSON: 额外信息(prompt/voice/duration等)
  tags: text("tags"), // JSON: 标签
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});
