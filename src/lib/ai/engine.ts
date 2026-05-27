// MangaForge AI 多供应商 LLM 引擎
// 支持 OpenAI / Gemini / 自定义兼容 API

export interface LLMConfig {
  provider: "openai" | "gemini" | "custom";
  apiKey: string;
  baseUrl?: string;
  model: string;
  visionModel?: string;
}

export interface ImageGenConfig {
  provider: "openai" | "flux" | "comfyui" | "custom";
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// LLM 对话补全
export async function llmChat(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const baseUrl = config.baseUrl || getDefaultBaseUrl(config.provider);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.7 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// 图片生成
export async function generateImage(config: ImageGenConfig, prompt: string, opts?: { size?: string; n?: number }): Promise<string[]> {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/images/generations`, {
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
  const data = await res.json();
  return (data.data || []).map((d: { url: string }) => d.url);
}

// TTS 语音合成（OpenAI 兼容）
export async function generateSpeech(
  config: { apiKey: string; baseUrl?: string; model?: string; voice?: string },
  text: string
): Promise<ArrayBuffer> {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/audio/speech`, {
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
  return res.arrayBuffer();
}

function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case "openai": return "https://api.openai.com/v1";
    case "gemini": return "https://generativelanguage.googleapis.com/v1beta/openai";
    default: return "https://api.openai.com/v1";
  }
}
