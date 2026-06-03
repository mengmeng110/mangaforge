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
  // agnes 特殊处理：如果 baseUrl 包含 'apihub.agnes-ai.com'，直接返回不做替换
  if (raw.includes("apihub.agnes-ai.com")) return raw;

  let url = raw.replace(/\/\/+$/, "");
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

// 指数退避重试，处理临时性故障（429/502/503）
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      // 只对可重试的状态码进行重试；429=限流、502=网关错误、503=服务不可用
      const retryable =
        msg.includes("(429)") || msg.includes("(502)") || msg.includes("(503)");
      if (!retryable || attempt === maxRetries) {
        throw e;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `[LLM] 请求失败(${attempt + 1}/${maxRetries})，${delay}ms 后重试: ${msg}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError; // 类型守卫，实际不可达
}

// LLM 对话补全
export async function llmChat(config: LLMConfig, messages: { role: string; content: string }[]): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://api.openai.com/v1");
  const url = `${baseUrl}/v1/chat/completions`;

  console.log(`[LLM] 请求: ${url} 模型: ${config.model}`);

  const data = await retryWithBackoff(async () => {
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

    return res.json().catch(e => { throw new Error('JSON解析失败: ' + (e instanceof Error ? e.message : String(e))) });
  });

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

// ==== 视频生成 (图生视频) ====
// 检测是否为 Agnes AI 平台
function isAgnesBaseUrl(baseUrl: string): boolean {
  return baseUrl && (baseUrl.includes("apihub.agnes-ai.com") || baseUrl.includes("agnes-ai.com"));
}

// 提交视频生成任务（异步）
export async function submitVideoTask(
  config: VideoGenConfig,
  imageUrl: string,
  prompt: string
): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "");
  const isAgnes = isAgnesBaseUrl(config.baseUrl || "");

  let taskId: string;

  if (isAgnes) {
    // Agnes Video V2.0: POST https://apihub.agnes-ai.com/v1/videos
    const url = `${baseUrl}/videos`;
    console.log(`[视频-Agnes] 提交任务: ${url}`);

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "agnes-video-v2.0",
        prompt: prompt,
        image: imageUrl,
        num_frames: 121,
        frame_rate: 24,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "未知错误");
      throw new Error(`视频生成提交失败 (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json().catch(() => ({}));
    taskId = data.task_id || data.id || "";
    console.log(`[视频-Agnes] 任务已提交: ${taskId}`);
  } else {
    // 其他平台
    const url = `${baseUrl}/v1/video/submit`;
    console.log(`[视频-Other] 提交任务: ${url}`);

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
    taskId = data.requestId || data.task_id || data.id || "";
    console.log(`[视频-Other] 任务已提交: ${taskId}`);
  }

  if (!taskId) {
    throw new Error("视频任务提交失败，未返回 taskId");
  }

  return taskId;
}

// 轮询视频生成任务状态
export async function pollVideoTask(
  config: VideoGenConfig,
  taskId: string
): Promise<{ status: string; videoUrl?: string; progress?: number }> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || "");
  const isAgnes = isAgnesBaseUrl(config.baseUrl || "");

  if (isAgnes) {
    // Agnes: GET /v1/videos/{task_id}
    const url = `${baseUrl}/videos/${taskId}`;
    console.log(`[视频-Agnes] 轮询: ${url}`);

    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!res.ok) {
      return { status: "error", progress: 0 };
    }

    const data = await res.json().catch(() => ({}));
    const status = data.status || "unknown";
    const progress = data.progress || 0;

    let videoUrl: string | undefined;
    if (status === "completed") {
      videoUrl = data.remixed_from_video_id || data.video_url || data.url || "";
    }

    console.log(`[视频-Agnes] 状态: ${status} 进度: ${progress}%`);
    return { status, videoUrl, progress };
  } else {
    // 其他平台
    const url = `${baseUrl}/v1/video/status/${taskId}`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!res.ok) {
      return { status: "error", progress: 0 };
    }

    const data = await res.json().catch(() => ({}));
    const status = data.status || "unknown";
    const videoUrl =
      data.video?.url ||
      data.output?.video_url ||
      data.data?.video_url ||
      data.url ||
      undefined;

    return { status, videoUrl };
  }
}

// 轮询等待视频生成完成
export async function waitForVideo(
  config: VideoGenConfig,
  taskId: string,
  timeoutSeconds: number = 900
): Promise<string> {
  let elapsed = 0;
  const interval = 5000;

  while (elapsed < timeoutSeconds) {
    const result = await pollVideoTask(config, taskId);

    if (result.status === "completed" && result.videoUrl) {
      console.log(`[视频] 生成完成: ${result.videoUrl}`);
      return result.videoUrl!;
    }

    if (result.status === "failed" || result.status === "error") {
      throw new Error(`视频生成失败 (taskId: ${taskId})`);
    }

    console.log(`[视频] 等待中... ${Math.round(elapsed / 60)}分${elapsed % 60}秒 (进度: ${result.progress || 0}%)`);
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;
  }

  throw new Error(`视频生成超时 (${timeoutSeconds}秒)，任务ID: ${taskId}`);
}
