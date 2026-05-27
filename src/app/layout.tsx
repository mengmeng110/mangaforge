import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MangaForge · AI 漫剧锻造坊",
  description: "用 AI 将故事变成精美漫剧 — 剧本分析、分镜生成、配音合成，一站式完成",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* 侧边栏 */}
          <nav style={{
            width: 240,
            background: "var(--bg-card)",
            borderRight: "1px solid var(--border)",
            padding: "20px 0",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}>
            <div style={{ padding: "0 20px 20px", borderBottom: "1px solid var(--border)" }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                🔥 <span style={{ color: "var(--accent)" }}>Manga</span>Forge
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                AI 漫剧锻造坊
              </p>
            </div>

            <div style={{ padding: "16px 12px", flex: 1 }}>
              <a href="/" style={navLinkStyle}>
                🏠 项目列表
              </a>
              <a href="/create" style={navLinkStyle}>
                ✨ 新建项目
              </a>
              <a href="/settings" style={navLinkStyle}>
                ⚙️ API 设置
              </a>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
              MangaForge v0.1.0
            </div>
          </nav>

          {/* 主内容 */}
          <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

const navLinkStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  color: "var(--text-muted)",
  textDecoration: "none",
  fontSize: 14,
  marginBottom: 4,
  transition: "all 0.2s",
};
