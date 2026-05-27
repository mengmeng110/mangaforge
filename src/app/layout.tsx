import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "MangaForge · AI 漫剧锻造坊",
  description: "用 AI 将故事变成精美漫剧 — 剧本分析、分镜生成、配音合成，一站式完成",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
