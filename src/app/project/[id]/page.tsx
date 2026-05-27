"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSettingsStore } from "@/lib/stores/settings-store";

interface Character {
  id: string; name: string; description: string; personality: string;
  consistencyPrompt: string; referenceImages?: string;
}
interface Scene {
  id: string; index: number; title: string; description: string;
  location: string; timeOfDay: string; mood: string; bgmStyle: string;
}
interface Panel {
  id: string; index: number; panelType: string; prompt: string;
  camera: string; characters: string; dialogue: string | null;
  speaker: string | null; narration: string | null; duration: number;
  transition: string; imageUrl: string | null; videoUrl: string | null;
  status: string;
}
interface Project {
  id: string; title: string; genre: string; style: string; status: string;
  characters: Character[]; scenes: Scene[]; panels: Panel[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "var(--text-muted)" },
  analyzing: { label: "分析中…", color: "var(--warning)" },
  analyzed: { label: "已分析", color: "var(--success)" },
  error: { label: "出错", color: "var(--error)" },
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const settings = useSettingsStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"storyboard" | "characters" | "timeline">("storyboard");

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setProject(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmConfig: settings.llm }),
      });
      const data = await res.json();
      if (data.success) {
        await loadProject();
      } else {
        alert(data.error || "分析失败");
      }
    } catch {
      alert("分析请求失败");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>加载中...</div>;
  if (!project) return <div style={{ padding: 40 }}>项目不存在</div>;

  const status = STATUS_LABELS[project.status] || STATUS_LABELS.draft;

  return (
    <div className="animate-fade-in">
      {/* 项目头 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{project.title}</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {project.genre && <span className="tag tag-genre">{project.genre}</span>}
            <span className="tag" style={{ color: status.color }}>{status.label}</span>
          </div>
        </div>
        {project.status === "draft" && (
          <button className="btn-primary animate-glow" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? "⏳ AI 分析中..." : "🧠 开始 AI 分析"}
          </button>
        )}
      </div>

      {/* 分析结果预览 */}
      {project.status === "analyzed" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>👤</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{project.characters.length}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>角色</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>🎬</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{project.scenes.length}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>场景</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>🖼️</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{project.panels.length}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>分镜</div>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      {project.status === "analyzed" && (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-card)", borderRadius: 8, padding: 4 }}>
            {(["storyboard", "characters", "timeline"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 6, border: "none",
                  background: activeTab === tab ? "var(--accent)" : "transparent",
                  color: activeTab === tab ? "white" : "var(--text-muted)",
                  cursor: "pointer", fontSize: 14, fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                {tab === "storyboard" ? "🖼️ 分镜面板" : tab === "characters" ? "👤 角色列表" : "🎞️ 时间轴"}
              </button>
            ))}
          </div>

          {/* 分镜面板 */}
          {activeTab === "storyboard" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {project.panels.map((panel, i) => (
                <div key={panel.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* 图片区域 */}
                  <div style={{
                    height: 180, background: "var(--bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    {panel.imageUrl ? (
                      <img src={panel.imageUrl} alt={`分镜 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: 40 }}>🎬</div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>#{i + 1} · {panel.camera}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{panel.duration}s</span>
                    </div>
                    {panel.dialogue && (
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <strong>{panel.speaker}：</strong>&ldquo;{panel.dialogue}&rdquo;
                      </div>
                    )}
                    {panel.narration && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                        旁白：{panel.narration}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 角色列表 */}
          {activeTab === "characters" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {project.characters.map((char) => (
                <div key={char.id} className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 700,
                    }}>
                      {char.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{char.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{char.personality}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {char.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 时间轴 */}
          {activeTab === "timeline" && (
            <div style={{ position: "relative", paddingLeft: 32 }}>
              <div style={{
                position: "absolute", left: 12, top: 0, bottom: 0, width: 2,
                background: "var(--border)",
              }} />
              {project.panels.map((panel, i) => (
                <div key={panel.id} style={{
                  position: "relative", marginBottom: 20, paddingLeft: 24,
                }}>
                  <div style={{
                    position: "absolute", left: -26, top: 6,
                    width: 12, height: 12, borderRadius: "50%",
                    background: "var(--accent)", border: "2px solid var(--bg)",
                  }} />
                  <div className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{
                      width: 80, height: 50, borderRadius: 6, background: "var(--bg)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      overflow: "hidden",
                    }}>
                      {panel.imageUrl ? (
                        <img src={panel.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>🎬</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>#{i + 1} · {panel.camera} · {panel.duration}s</div>
                      {panel.dialogue && <div style={{ fontSize: 12, marginTop: 2 }}><b>{panel.speaker}：</b>{panel.dialogue}</div>}
                      {panel.narration && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{panel.narration}</div>}
                    </div>
                    <div className="tag" style={{
                      background: panel.status === "done" ? "rgba(34,197,94,0.15)" : "var(--bg)",
                      color: panel.status === "done" ? "var(--success)" : "var(--text-muted)",
                    }}>
                      {panel.status === "done" ? "✓" : `${i + 1}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 草稿状态提示 */}
      {project.status === "draft" && (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h3 style={{ marginBottom: 8 }}>准备就绪</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            点击上方 &ldquo;开始 AI 分析&rdquo; 按钮，AI 将自动解析剧本、提取角色和场景、生成分镜方案
          </p>
          {!settings.llm.apiKey && (
            <p style={{ color: "var(--warning)", fontSize: 13 }}>
              ⚠️ 请先到 <a href="/settings" style={{ color: "var(--accent)" }}>设置页面</a> 配置 LLM API Key
            </p>
          )}
        </div>
      )}
    </div>
  );
}
