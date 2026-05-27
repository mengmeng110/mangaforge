// MangaForge AI 多供应商 LLM 引擎
// 支持 OpenAI / Gemini / DeepSeek / 通义千问 / 硅基流动 等兼容 API

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

export interface VideoGenConfig {
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

// 包装 fetch，加超时和更好的错误信息
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg.includes("AbortError")) {
      throw new Error(`请求超时 (${timeoutMs / 1000}秒)，请检查网络或 API 地址: ${url}`);
    }
    // 常见: ENOTFOUND(域名错误), ECONNREFUSED(端口错误), fetch failed(网络不通)
    throw new Error(`网络请求失败: ${msg} → 目标: ${url}`);
  } finally {
    clearTimeout(timer);
  }
}

// LLM 对话补全
export async function llmChat(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.openai.com/v1");
  const url = `${baseUrl}/v1/chat/completions`;

  console.log(`[LLM] 请求: ${url} 模型: ${config.model}`);

  const res = await fetchWithTimeout(url, {
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

  const res = await fetchWithTimeout(url, {
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
  }, 120000); // 生图超时更长

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

  const res = await fetchWithTimeout(url, {
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

// ==================== 视频生成 (图生视频) ====================
// 提交视频生成任务（异步）
export async function submitVideoTask(
  config: VideoGenConfig,
  imageUrl: string,
  prompt: string
): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.siliconflow.cn/v1");
  const url = `${baseUrl}/v1/video/submit`;

  console.log(`[视频] 提交任务: ${url} 模型: ${config.model}`);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      image: imageUrl,
      prompt: prompt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "未知错误");
    throw new Error(`视频生成提交失败 (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  const taskId = data.requestId || data.task_id || data.id || "";
  if (!taskId) {
    throw new Error(`视频任务提交失败，未返回 taskId: ${JSON.stringify(data).slice(0, 200)}`);
  }

  console.log(`[视频] 任务已提交: ${taskId}`);
  return taskId;
}

// 轮询视频生成任务状态
export async function pollVideoTask(
  config: VideoGenConfig,
  taskId: string
): Promise<{ status: string; videoUrl?: string }> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.siliconflow.cn/v1");
  const url = `${baseUrl}/v1/video/status/${taskId}`;

  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "未知错误");
    throw new Error(`查询视频任务失败 (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  const status = data.status || "unknown";

  // 提取视频 URL（不同平台返回结构不同）
  const videoUrl =
    data.video?.url ||
    data.output?.video_url ||
    data.results?.[0]?.url ||
    data.videoUrl ||
    "";

  return { status, videoUrl: videoUrl || undefined };
}

// 等待视频生成完成（自动轮询）
export async function waitForVideo(
  config: VideoGenConfig,
  taskId: string,
  maxWaitMs = 300000, // 5分钟
  pollIntervalMs = 5000 // 5秒
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await pollVideoTask(config, taskId);
    console.log(`[视频] 任务 ${taskId} 状态: ${result.status}`);

    if (result.status === "Succeed" || result.status === "succeed" || result.status === "completed") {
      if (!result.videoUrl) throw new Error("视频生成完成但未返回 URL");
      return result.videoUrl;
    }
    if (result.status === "Failed" || result.status === "failed") {
      throw new Error("视频生成失败");
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`视频生成超时 (${maxWaitMs / 1000}秒)`);
}
