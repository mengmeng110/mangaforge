// MangaForge 剧本智能分析 Agent
// 融合 ArcReel 的 Agent 驱动 + waoowaoo 的剧本解析

import { llmChat, type LLMConfig } from "./engine";

export interface AnalyzedCharacter {
  name: string;
  description: string;
  personality: string;
  appearance: string;
  consistencyPrompt: string;
}

export interface AnalyzedScene {
  title: string;
  description: string;
  location: string;
  timeOfDay: string;
  mood: string;
  bgmStyle: string;
}

export interface AnalyzedPanel {
  sceneIndex: number;
  camera: string;
  characters: string[];
  dialogue: string;
  speaker: string;
  narration: string;
  prompt: string;
  soundEffect: string;
  duration: number;
  transition: string;
}

export interface AnalysisResult {
  title: string;
  genre: string;
  summary: string;
  characters: AnalyzedCharacter[];
  scenes: AnalyzedScene[];
  panels: AnalyzedPanel[];
}

// 核心：用 LLM 分析剧本，自动提取角色、场景、分镜
export async function analyzeScript(config: LLMConfig, script: string): Promise<AnalysisResult> {
  const systemPrompt = `你是一个专业的AI漫剧导演Agent。你的任务是分析用户提供的剧本/故事文本，输出结构化的分镜方案。

请严格按照以下JSON格式输出，不要输出任何其他内容：

{
  "title": "作品标题",
  "genre": "类型（言情/悬疑/科幻/喜剧/古风/都市/玄幻等）",
  "summary": "一句话概括",
  "characters": [
    {
      "name": "角色名",
      "description": "外貌描述（详细，用于AI生图保持一致性）",
      "personality": "性格特征",
      "appearance": "关键外观标签（如：黑长发、蓝瞳、白色连衣裙）",
      "consistencyPrompt": "用于后续生图的角色一致性英文prompt"
    }
  ],
  "scenes": [
    {
      "title": "场景名",
      "description": "场景描述",
      "location": "地点",
      "timeOfDay": "白天/黄昏/夜晚/清晨",
      "mood": "氛围",
      "bgmStyle": "warm/tense/cheerful/sad/epic"
    }
  ],
  "panels": [
    {
      "sceneIndex": 0,
      "camera": "close-up/medium/long/bird-eye/worm-eye/over-shoulder",
      "characters": ["角色名"],
      "dialogue": "台词（没有则为空）",
      "speaker": "说话者（没有台词则为空）",
      "narration": "旁白（没有则为空）",
      "prompt": "详细的英文生图prompt，包含角色外观、场景、动作、光影",
      "soundEffect": "音效描述（没有则为空）",
      "duration": 3,
      "transition": "cut/fade/slide/zoom"
    }
  ]
}

规则：
1. 每个对话回合、每个重要动作、每个场景变化都应拆为独立分镜
2. prompt 必须用英文，包含风格标签（如 anime style, cinematic lighting）
3. 角色外观在所有分镜中必须保持一致，引用 consistencyPrompt
4. 每个分镜 duration 建议 2-5 秒
5. 场景变化时用 transition 标记`;

  const response = await llmChat(config, [
    { role: "system", content: systemPrompt },
    { role: "user", content: `请分析以下剧本并输出分镜方案：\n\n${script}` },
  ]);

  // 提取 JSON — 兼容裸 JSON、```json 包裹、带前缀文本等各种格式
  let jsonStr = "";

  // 尝试1: 匹配 ```json ... ``` 代码块
  const codeBlock = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    jsonStr = codeBlock[1].trim();
  }

  // 尝试2: 用括号平衡法提取最外层 { ... }
  if (!jsonStr) {
    const start = response.indexOf("{");
    if (start >= 0) {
      let depth = 0;
      for (let i = start; i < response.length; i++) {
        if (response[i] === "{") depth++;
        if (response[i] === "}") depth--;
        if (depth === 0) { jsonStr = response.slice(start, i + 1); break; }
      }
    }
  }

  // 尝试3: 逐行扫描找 JSON 开始
  if (!jsonStr) {
    const lines = response.split("\n");
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("{")) { start = i; break; }
    }
    if (start >= 0) jsonStr = lines.slice(start).join("\n");
  }

  if (!jsonStr) throw new Error("AI 未返回有效内容，请重试");

  // 清理常见问题：尾部逗号、注释
  jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1").replace(/\/\/.*$/gm, "");

  try {
    return JSON.parse(jsonStr) as AnalysisResult;
  } catch (parseErr) {
    throw new Error(`AI 返回的 JSON 格式有误，请重试。原始内容: ${jsonStr.slice(0, 200)}`);
  }
}
