"use client";

import { useSettingsStore } from "@/lib/stores/settings-store";
import { useState } from "react";

// 常见 LLM 提供商预设
const LLM_PRESETS = [
  { name: "Agnes 文本", baseUrl: "https://apihub.agnes-ai.com/v1", model: "agnes-2.0-flash", visionModel: "" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", visionModel: "" },
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", visionModel: "gpt-4o" },
  { name: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3", visionModel: "deepseek-ai/DeepSeek-V3" },
  { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", visionModel: "qwen-vl-max" },
  { name: "小米 MiMo", baseUrl: "https://api.mimo.xiaomi.com/v1", model: "MiMo-V2.5-Pro", visionModel: "" },
  { name: "自定义", baseUrl: "", model: "", visionModel: "" },
];

const IMG_PRESETS = [
  { name: "OpenAI DALL-E", baseUrl: "https://api.openai.com/v1", model: "dall-e-3" },
  { name: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", model: "black-forest-labs/FLUX.1-schnell" },
  { name: "Agnes 图片", baseUrl: "https://apihub.agnes-ai.com/v1", model: "agnes-image-2.1-flash" },
  { name: "自定义", baseUrl: "", model: "" },
];

const VIDEO_PRESETS = [
  { name: "Agnes 视频", baseUrl: "https://apihub.agnes-ai.com/v1", model: "agnes-video-v2.0" },
  { name: "硅基流动 Wan", baseUrl: "https://api.siliconflow.cn/v1", model: "Wan-AI/Wan2.1-I2V-14B-720P" },
  { name: "可灵 Kling", baseUrl: "https://api.klingai.com", model: "kling-v1" },
  { name: "自定义", baseUrl: "", model: "" },
];

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>⚙️ API 设置</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        配置 AI 服务的 API Key 和模型。所有配置保存在浏览器本地。
      </p>

      {/* LLM 设置 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>🧠 LLM（大语言模型）</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {/* 快速选择 */}
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>快速选择供应商</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LLM_PRESETS.map((p) => (
                <button key={p.name} className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => {
                    if (p.name === "自定义") return;
                    settings.setLLM({ ...settings.llm, baseUrl: p.baseUrl, model: p.model, visionModel: p.visionModel });
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Base URL</label>
            <input className="input" value={settings.llm.baseUrl}
              onChange={(e) => settings.setLLM({ ...settings.llm, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Key</label>
            <input className="input" type="password" value={settings.llm.apiKey}
              onChange={(e) => settings.setLLM({ ...settings.llm, apiKey: e.target.value })}
              placeholder="sk-..." />
          </div>
          <div className="settings-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>模型</label>
              <input className="input" value={settings.llm.model}
                onChange={(e) => settings.setLLM({ ...settings.llm, model: e.target.value })}
                placeholder="deepseek-chat" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>视觉模型（可选）</label>
              <input className="input" value={settings.llm.visionModel || ""}
                onChange={(e) => settings.setLLM({ ...settings.llm, visionModel: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* 图片生成设置 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>🎨 图片生成</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>快速选择供应商</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {IMG_PRESETS.map((p) => (
                <button key={p.name} className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => {
                    if (p.name === "自定义") return;
                    settings.setImageGen({ ...settings.imageGen, baseUrl: p.baseUrl, model: p.model });
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Base URL</label>
            <input className="input" value={settings.imageGen.baseUrl}
              onChange={(e) => settings.setImageGen({ ...settings.imageGen, baseUrl: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Key</label>
            <input className="input" type="password" value={settings.imageGen.apiKey}
              onChange={(e) => settings.setImageGen({ ...settings.imageGen, apiKey: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>模型</label>
            <input className="input" value={settings.imageGen.model}
              onChange={(e) => settings.setImageGen({ ...settings.imageGen, model: e.target.value })} />
          </div>
        </div>
      </div>

      {/* 视频生成设置 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>🎬 分镜视频生成 <span style={{ fontSize: 12, color: "var(--text-muted)" }}>（可选，图生视频）</span></h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>快速选择供应商</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {VIDEO_PRESETS.map((p) => (
                <button key={p.name} className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => {
                    if (p.name === "自定义") return;
                    settings.setVideoGen({ ...settings.videoGen, baseUrl: p.baseUrl, model: p.model });
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Base URL</label>
            <input className="input" value={settings.videoGen.baseUrl}
              onChange={(e) => settings.setVideoGen({ ...settings.videoGen, baseUrl: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Key</label>
            <input className="input" type="password" value={settings.videoGen.apiKey}
              onChange={(e) => settings.setVideoGen({ ...settings.videoGen, apiKey: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>模型</label>
            <input className="input" value={settings.videoGen.model}
              onChange={(e) => settings.setVideoGen({ ...settings.videoGen, model: e.target.value })} />
          </div>
        </div>
      </div>

      {/* TTS 设置 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>🎤 语音合成 (TTS)</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Base URL</label>
            <input className="input" value={settings.tts.baseUrl}
              onChange={(e) => settings.setTTS({ ...settings.tts, baseUrl: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Key</label>
            <input className="input" type="password" value={settings.tts.apiKey}
              onChange={(e) => settings.setTTS({ ...settings.tts, apiKey: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>模型</label>
              <input className="input" value={settings.tts.model}
                onChange={(e) => settings.setTTS({ ...settings.tts, model: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>音色</label>
              <input className="input" value={settings.tts.voice}
                onChange={(e) => settings.setTTS({ ...settings.tts, voice: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ width: "100%", padding: 14 }}>
        {saved ? "✅ 已保存" : "💾 保存设置"}
      </button>
    </div>
  );
}
