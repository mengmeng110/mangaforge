"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message || "未知错误" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: 20,
        }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
            <h2 style={{ marginBottom: 8 }}>页面出错了</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
              {this.state.error}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
              style={{
                padding: "12px 28px", borderRadius: 10, border: "none",
                background: "var(--accent)", color: "white", fontSize: 14,
                cursor: "pointer", fontWeight: 600,
              }}
            >
              🔄 重新加载
            </button>
            <div style={{ marginTop: 16 }}>
              <a href="/" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
                ← 回到首页
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
