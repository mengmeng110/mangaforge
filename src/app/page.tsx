"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string; title: string; genre: string; style: string;
  status: string; description: string; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-muted)",
  analyzing: "var(--warning)",
  analyzed: "var(--success)",
  error: "var(--error)",
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(setProjects).finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>我的漫剧项目</h2>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0" }}>
            用 AI 将故事变成精美漫剧
          </p>
        </div>
        <a href="/create" className="btn-primary" style={{ textDecoration: "none" }}>
          ✨ 新建项目
        </a>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 60 }}>加载中...</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎬</div>
          <h3 style={{ marginBottom: 8 }}>还没有项目</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            输入一个故事，AI 会帮你自动分析剧本、生成分镜、配音合成
          </p>
          <a href="/create" className="btn-primary" style={{ textDecoration: "none" }}>
            开始第一个项目
          </a>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {projects.map((p) => (
            <a key={p.id} href={`/project/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{p.title}</h3>
                  <span style={{ fontSize: 12, color: STATUS_COLORS[p.status] || "var(--text-muted)" }}>
                    {p.status === "analyzed" ? "✅ 已分析" : p.status === "analyzing" ? "⏳ 分析中" : p.status === "error" ? "❌ 出错" : "📝 草稿"}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  {p.description || "暂无描述"}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {p.genre && <span className="tag tag-genre">{p.genre}</span>}
                  <span className="tag" style={{ background: "rgba(255,255,255,0.05)" }}>{p.style}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
