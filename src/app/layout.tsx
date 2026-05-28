import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "MangaForge · AI 漫剧锻造坊",
  description: "用 AI 将故事变成精美漫剧 — 剧本分析、分镜生成、配音合成，一站式完成",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ErrorBoundary>
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
