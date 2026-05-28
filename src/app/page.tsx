"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface Project {
  id: string; title: string; genre: string; style: string;
  status: string; description: string; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-muted)",
  analyzing: "var(--warning)",
  analyzed: "var(--success)",
  generating: "var(--warning)",
  composing: "var(--warning)",
  done: "var(--success)",
  error: "var(--error)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "📝 草稿",
  analyzing: "⏳ 分析中",
  analyzed: "✅ 已分析",
  generating: "🎨 生成中",
  composing: "🎥 合成中",
  done: "🎉 已完成",
  error: "❌ 出错",
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "title">("createdAt");

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title, "zh");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [projects, searchQuery, sortBy]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`);
      }
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载项目失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确定要删除这个项目吗？此操作不可撤销。")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("删除失败，请重试");
    } finally {
      setDeletingId(null);
    }
  };

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

      {!loading && projects.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="🔍 搜索项目标题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "10px 14px",
              border: "1px solid var(--border, rgba(255,255,255,0.12))",
              borderRadius: 8,
              background: "var(--card-bg, rgba(255,255,255,0.04))",
              color: "inherit",
              fontSize: 14,
              outline: "none",
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "createdAt" | "title")}
            style={{
              padding: "10px 14px",
              border: "1px solid var(--border, rgba(255,255,255,0.12))",
              borderRadius: 8,
              background: "var(--card-bg, rgba(255,255,255,0.04))",
              color: "inherit",
              fontSize: 14,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="createdAt">按创建时间排序</option>
            <option value="title">按名称排序</option>
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 60 }}>加载中...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: "var(--error)", marginBottom: 16, fontSize: 16 }}>{error}</p>
          <button
            onClick={fetchProjects}
            className="btn-primary"
            style={{ padding: "8px 24px", cursor: "pointer", border: "none", borderRadius: 6, fontSize: 14 }}
          >
            🔄 重试
          </button>
        </div>
      ) : filteredAndSortedProjects.length === 0 && !searchQuery.trim() ? (
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
      ) : filteredAndSortedProjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            没有找到匹配「{searchQuery}」的项目
          </p>
        </div>
      ) : (
        <div className="project-grid">
          {filteredAndSortedProjects.map((p) => (
            <div key={p.id} style={{ position: "relative" }}>
              <a href={`/project/${p.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="card" style={{ cursor: "pointer", paddingRight: 40 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{p.title}</h3>
                    <span style={{ fontSize: 12, color: STATUS_COLORS[p.status] || "var(--text-muted)" }}>
                      {STATUS_LABELS[p.status] || p.status}
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
              <button
                onClick={(e) => handleDelete(e, p.id)}
                disabled={deletingId === p.id}
                title="删除项目"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  border: "none",
                  borderRadius: 6,
                  background: "rgba(255,60,60,0.1)",
                  color: "var(--error, #ff3c3c)",
                  cursor: deletingId === p.id ? "not-allowed" : "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: deletingId === p.id ? 0.5 : 1,
                  transition: "background 0.2s",
                  zIndex: 1,
                }}
              >
                {deletingId === p.id ? "…" : "🗑"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
