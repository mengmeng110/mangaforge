"use client";

import { useSettingsStore } from "@/lib/stores/settings-store";
import { useState } from "react";

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
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Base URL</label>
            <input className="input" value={settings.llm.baseUrl}
              onChange={(e) => settings.setLLM({ ...settings.llm, baseUrl: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>API Key</label>
            <input className="input" type="password" value={settings.llm.apiKey}
              onChange={(e) => settings.setLLM({ ...settings.llm, apiKey: e.target.value })}
              placeholder="sk-..." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>模型</label>
              <input className="input" value={settings.llm.model}
                onChange={(e) => settings.setLLM({ ...settings.llm, model: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>视觉模型</label>
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
