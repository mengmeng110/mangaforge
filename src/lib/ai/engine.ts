// MangaForge AI 多供应商 LLM 引擎
// 支持 OpenAI / Gemini / DeepSeek / 小米 等兼容 API

export interface LLMConfig {
  provider?: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  visionModel?: string;
}

export interface ImageGenConfig {
  provider?: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// 标准化 baseUrl — 自动补全路径
function normalizeBaseUrl(raw: string): string {
  let url = raw.replace(/\/+$/, "");
  // 如果用户填了 /v1 结尾，去掉（后面会加）
  if (url.endsWith("/v1")) url = url.slice(0, -3);
  // 如果填了 /chat/completions，去掉
  if (url.endsWith("/chat/completions")) url = url.replace("/chat/completions", "");
  return url;
}

// LLM 对话补全
export async function llmChat(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.openai.com/v1");
  const url = `${baseUrl}/v1/chat/completions`;

  console.log(`[LLM] 请求: ${url} 模型: ${config.model}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "未知错误");
    console.error(`[LLM] HTTP ${res.status}: ${errText}`);
    throw new Error(`LLM API 请求失败 (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  const content = data.choices?.[0]?.message?.content || "";

  if (!content) {
    console.error("[LLM] 返回内容为空，完整响应:", JSON.stringify(data).slice(0, 500));
    throw new Error("AI 返回内容为空，请检查 API Key 和模型配置");
  }

  console.log(`[LLM] 返回 ${content.length} 字符`);
  return content;
}

// 图片生成
export async function generateImage(config: ImageGenConfig, prompt: string, opts?: { size?: string; n?: number }): Promise<string[]> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.openai.com/v1");
  const url = `${baseUrl}/v1/images/generations`;

  console.log(`[生图] 请求: ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      n: opts?.n || 1,
      size: opts?.size || "1024x1024",
      response_format: "url",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "未知错误");
    throw new Error(`图片生成失败 (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.data || []).map((d: { url: string }) => d.url);
}

// TTS 语音合成
export async function generateSpeech(
  config: { apiKey: string; baseUrl?: string; model?: string; voice?: string },
  text: string
): Promise<ArrayBuffer> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.openai.com/v1");
  const url = `${baseUrl}/v1/audio/speech`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "tts-1",
      voice: config.voice || "alloy",
      input: text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "未知错误");
    throw new Error(`TTS 失败 (${res.status}): ${errText.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}
