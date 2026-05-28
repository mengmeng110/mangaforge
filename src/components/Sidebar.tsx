"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

const navItems = [
  { href: "/", label: "🏠 项目列表" },
  { href: "/create", label: "✨ 新建项目" },
  { href: "/canvas", label: "🎨 分镜画板" },
  { href: "/assets", label: "📦 资产管理" },
  { href: "/settings", label: "⚙️ API 设置" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 路由变化时自动关闭侧边栏
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 键盘 ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname]
  );

  const toggleSidebar = () => setOpen((prev) => !prev);

  return (
    <>
      {/* 汉堡菜单按钮 — 仅小屏可见（CSS 控制） */}
      <button
        className="sidebar-hamburger"
        onClick={toggleSidebar}
        aria-label={open ? "关闭菜单" : "打开菜单"}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* 遮罩层 */}
      <div
        className={`sidebar-overlay${open ? " visible" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* 侧边栏主体 */}
      <nav
        className={`app-sidebar${open ? " sidebar-open" : ""}`}
        style={{
          background: "var(--bg-card)",
          borderRight: "1px solid var(--border)",
          padding: "20px 0",
          display: "flex",
          flexDirection: "column",
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
                  background: active
                    ? "var(--accent-bg, rgba(99,102,241,0.1))"
                    : "transparent",
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
    </>
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
