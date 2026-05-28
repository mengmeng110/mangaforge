"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "🏠 项目列表" },
  { href: "/create", label: "✨ 新建项目" },
  { href: "/canvas", label: "🎨 分镜画板" },
  { href: "/assets", label: "📦 资产管理" },
  { href: "/settings", label: "⚙️ API 设置" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      style={{
        width: 240,
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
        padding: "20px 0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "0 20px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          🔥 <span style={{ color: "var(--accent)" }}>Manga</span>Forge
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            margin: "4px 0 0",
          }}
        >
          AI 漫剧锻造坊
        </p>
      </div>

      <div style={{ padding: "16px 12px", flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...linkStyle,
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "var(--accent-bg, rgba(99,102,241,0.1))" : "transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          MangaForge v0.1.0
        </span>
        <button
          onClick={async () => {
            await fetch("/api/auth/login", { method: "DELETE" });
            window.location.href = "/login";
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
          title="退出登录"
        >
          🚪 退出
        </button>
      </div>
    </nav>
  );
}

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontSize: 14,
  marginBottom: 4,
  transition: "all 0.2s",
};
