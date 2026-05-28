"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GENRES = [
  "言情", "悬疑", "科幻", "喜剧", "古风", "都市", "玄幻", "恐怖",
  "校园", "热血", "治愈", "末日", "修仙", "穿越", "宫廷", "武侠",
  "赛博朋克", "克苏鲁", "日常", "运动", "美食", "职场", "神话", "暗黑",
];
const STYLES = [
  { id: "anime", label: "日系动漫", icon: "🌸" },
  { id: "comic", label: "欧美漫画", icon: "💥" },
  { id: "watercolor", label: "水彩手绘", icon: "🎨" },
  { id: "realistic", label: "写实风格", icon: "📷" },
  { id: "pixel", label: "像素风", icon: "👾" },
  { id: "ink", label: "水墨国风", icon: "🖌️" },
  { id: "ghibli", label: "吉卜力风", icon: "🌿" },
  { id: "cyberpunk", label: "赛博朋克", icon: "🌃" },
  { id: "flat", label: "扁平插画", icon: "📐" },
  { id: "chibi", label: "Q版萌系", icon: "🧸" },
  { id: "noir", label: "黑白漫画", icon: "🖤" },
  { id: "ukiyo", label: "浮世绘", icon: "🌊" },
];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [showCustomGenre, setShowCustomGenre] = useState(false);
  const [style, setStyle] = useState("anime");
  const [customStyle, setCustomStyle] = useState("");
  const [showCustomStyle, setShowCustomStyle] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const finalGenre = showCustomGenre ? customGenre.trim() : genre;
  const finalStyle = showCustomStyle ? customStyle.trim() || "anime" : style;

  const handleCreate = async () => {
    if (!title.trim() || !script.trim()) return;
    setInlineError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script, genre: finalGenre, style: finalStyle }),
      });
      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`);
      }
      const data = await res.json();
      if (data.id) {
        router.push(`/project/${data.id}`);
      }
    } catch (e) {
      console.error(e);
      setInlineError(e instanceof Error ? e.message : "创建失败，请重试");
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

      {inlineError && (
        <div
          style={{
            color: "#ef4444",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {inlineError}</span>
          <button
            onClick={() => setInlineError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>
      )}

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => { setGenre(g); setShowCustomGenre(false); }}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${genre === g && !showCustomGenre ? "var(--accent)" : "var(--border)"}`,
                background: genre === g && !showCustomGenre ? "var(--accent)" : "transparent",
                color: genre === g && !showCustomGenre ? "white" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
                transition: "all 0.2s",
              }}
            >
              {g}
            </button>
          ))}
          <button
            onClick={() => setShowCustomGenre(!showCustomGenre)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px dashed ${showCustomGenre ? "var(--accent)" : "var(--border)"}`,
              background: showCustomGenre ? "rgba(124,92,252,0.08)" : "transparent",
              color: showCustomGenre ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ✏️ 自定义
          </button>
        </div>
        {showCustomGenre && (
          <input
            className="input"
            placeholder="输入自定义类型，如：仙侠、机甲、吸血鬼..."
            value={customGenre}
            onChange={(e) => setCustomGenre(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      {/* 画风 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          🎨 画风选择
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => { setStyle(s.id); setShowCustomStyle(false); }}
              className="card"
              style={{
                textAlign: "center",
                cursor: "pointer",
                padding: "14px 8px",
                border: `1px solid ${style === s.id && !showCustomStyle ? "var(--accent)" : "var(--border)"}`,
                background: style === s.id && !showCustomStyle ? "rgba(124, 92, 252, 0.08)" : "var(--bg-card)",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</div>
            </button>
          ))}
          <button
            onClick={() => setShowCustomStyle(!showCustomStyle)}
            className="card"
            style={{
              textAlign: "center",
              cursor: "pointer",
              padding: "14px 8px",
              border: `1px dashed ${showCustomStyle ? "var(--accent)" : "var(--border)"}`,
              background: showCustomStyle ? "rgba(124,92,252,0.08)" : "var(--bg-card)",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>✏️</div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>自定义</div>
          </button>
        </div>
        {showCustomStyle && (
          <input
            className="input"
            placeholder="输入自定义画风，如：美式复古、蒸汽朋克、莫兰迪色系..."
            value={customStyle}
            onChange={(e) => setCustomStyle(e.target.value)}
            style={{ marginTop: 4 }}
          />
        )}
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
