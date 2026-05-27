"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        setError("密码错误，请重试");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        width: 380,
        padding: 40,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔥</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          <span style={{ color: "var(--accent)" }}>Manga</span>Forge
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 32 }}>
          AI 漫剧锻造坊 — 请输入访问密码
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="password"
            className="input"
            placeholder="输入访问密码..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{ marginBottom: 16, textAlign: "center", fontSize: 16, padding: 14 }}
          />
          {error && (
            <div style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>
              ❌ {error}
            </div>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={!password || loading}
            style={{ width: "100%", padding: 14, fontSize: 15 }}
          >
            {loading ? "验证中..." : "🔓 进入"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)" }} />}>
      <LoginForm />
    </Suspense>
  );
}
