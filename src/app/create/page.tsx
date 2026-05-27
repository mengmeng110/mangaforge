"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GENRES = ["言情", "悬疑", "科幻", "喜剧", "古风", "都市", "玄幻", "恐怖", "校园"];
const STYLES = [
  { id: "anime", label: "日系动漫" },
  { id: "comic", label: "欧美漫画" },
  { id: "watercolor", label: "水彩手绘" },
  { id: "realistic", label: "写实风格" },
  { id: "pixel", label: "像素风" },
  { id: "ink", label: "水墨国风" },
];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [genre, setGenre] = useState("");
  const [style, setStyle] = useState("anime");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !script.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script, genre, style }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/project/${data.id}`);
      }
    } catch (e) {
      console.error(e);
      alert("创建失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="animate-fade-in">
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          ✨ 新建漫剧项目
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
          输入你的故事，AI 会自动分析剧本、生成角色、创建分镜
        </p>
      </div>

      {/* 标题 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          📝 作品标题
        </label>
        <input
          className="input"
          placeholder="给你的漫剧起个名字..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 类型 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          🎭 故事类型
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: `1px solid ${genre === g ? "var(--accent)" : "var(--border)"}`,
                background: genre === g ? "var(--accent)" : "transparent",
                color: genre === g ? "white" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
                transition: "all 0.2s",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 画风 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          🎨 画风选择
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className="card"
              style={{
                textAlign: "center",
                cursor: "pointer",
                border: `1px solid ${style === s.id ? "var(--accent)" : "var(--border)"}`,
                background: style === s.id ? "rgba(124, 92, 252, 0.08)" : "var(--bg-card)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {s.id === "anime" ? "🌸" : s.id === "comic" ? "💥" : s.id === "watercolor" ? "🎨" : s.id === "realistic" ? "📷" : s.id === "pixel" ? "👾" : "🖌️"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 剧本输入 */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          📖 剧本 / 故事文本
        </label>
        <textarea
          className="textarea"
          placeholder={`在这里粘贴或输入你的故事...

示例：
小美走在放学路上，突然天空下起了雨。
"糟糕，没带伞！"小美躲在屋檐下。
这时，一个男生递过一把伞："给你。"
小美抬头，对上了小帅温暖的目光。
"那你呢？"小美问。
小帅笑了笑："我家就在旁边，淋一下没关系。"`}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          style={{ minHeight: 300 }}
        />
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          {script.length} 字 · AI 会自动拆分角色、场景和分镜
        </div>
      </div>

      {/* 创建按钮 */}
      <button
        className="btn-primary"
        onClick={handleCreate}
        disabled={!title.trim() || !script.trim() || creating}
        style={{ width: "100%", padding: 16, fontSize: 16 }}
      >
        {creating ? "⏳ AI 正在分析剧本..." : "🚀 开始锻造漫剧"}
      </button>
    </div>
  );
}
