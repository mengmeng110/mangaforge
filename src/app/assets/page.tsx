"use client";

import { useState, useEffect, useRef } from "react";

interface Asset {
  id: string;
  projectId: string | null;
  type: string;
  name: string;
  path: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  source: string;
  metadata: string | null;
  tags: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  image: "🖼️",
  audio: "🎵",
  video: "🎬",
  subtitle: "📝",
  bgm: "🎶",
};

const TYPE_LABELS: Record<string, string> = {
  image: "图片",
  audio: "音频",
  video: "视频",
  subtitle: "字幕",
  bgm: "背景音乐",
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = () => {
    setLoading(true);
    fetch("/api/assets")
      .then((r) => r.json())
      .then(setAssets)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAssets(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    fd.append("type", file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image");
    fd.append("source", "uploaded");
    try {
      await fetch("/api/assets", { method: "POST", body: fd });
      loadAssets();
    } catch (e) {
      alert("上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个资产？")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets(assets.filter((a) => a.id !== id));
    if (selectedAsset?.id === id) setSelectedAsset(null);
  };

  const filtered = assets.filter((a) => {
    if (filter !== "all" && a.type !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeCounts = { all: assets.length, image: 0, audio: 0, video: 0, subtitle: 0, bgm: 0 };
  assets.forEach((a) => { if (a.type in typeCounts) typeCounts[a.type as keyof typeof typeCounts]++; });

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>📦 资产管理</h2>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0" }}>
            管理所有生成的图片、音频、视频素材
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input ref={fileInputRef} type="file" onChange={handleUpload} style={{ display: "none" }} accept="image/*,audio/*,video/*,.srt,.ass" />
          <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "⏳ 上传中..." : "📤 上传资产"}
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="card" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" placeholder="🔍 搜索资产名称..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                border: `1px solid ${filter === key ? "var(--accent)" : "var(--border)"}`,
                background: filter === key ? "var(--accent)" : "transparent",
                color: filter === key ? "white" : "var(--text-muted)",
              }}>
              {TYPE_ICONS[key]} {label} ({typeCounts[key as keyof typeof typeCounts] || 0})
            </button>
          ))}
          <button onClick={() => setFilter("all")}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              border: `1px solid ${filter === "all" ? "var(--accent)" : "var(--border)"}`,
              background: filter === "all" ? "var(--accent)" : "transparent",
              color: filter === "all" ? "white" : "var(--text-muted)",
            }}>
            全部 ({typeCounts.all})
          </button>
        </div>
      </div>

      {/* 资产列表 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <h3 style={{ marginBottom: 8 }}>暂无资产</h3>
          <p style={{ color: "var(--text-muted)" }}>
            {search ? "没有匹配的资产" : "上传素材或生成漫剧后，资产会自动出现在这里"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {filtered.map((asset) => (
            <div key={asset.id} className="card"
              style={{ cursor: "pointer", padding: 12, border: selectedAsset?.id === asset.id ? "1px solid var(--accent)" : undefined }}
              onClick={() => setSelectedAsset(asset)}>
              {/* 预览 */}
              <div style={{
                width: "100%", height: 140, borderRadius: 8, overflow: "hidden",
                background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,
              }}>
                {asset.type === "image" ? (
                  <img src={asset.url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : asset.type === "video" ? (
                  <video src={asset.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                ) : asset.type === "audio" || asset.type === "bgm" ? (
                  <div style={{ fontSize: 48 }}>{asset.type === "bgm" ? "🎶" : "🎵"}</div>
                ) : (
                  <div style={{ fontSize: 48 }}>📝</div>
                )}
              </div>
              {/* 信息 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {TYPE_ICONS[asset.type]} {TYPE_LABELS[asset.type]} · {formatSize(asset.size)}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4, color: "var(--text-muted)" }}
                  title="删除">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 详情面板 */}
      {selectedAsset && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>📋 资产详情</h3>
            <button onClick={() => setSelectedAsset(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 13 }}>
            <div><span style={{ color: "var(--text-muted)" }}>名称：</span>{selectedAsset.name}</div>
            <div><span style={{ color: "var(--text-muted)" }}>类型：</span>{TYPE_ICONS[selectedAsset.type]} {TYPE_LABELS[selectedAsset.type]}</div>
            <div><span style={{ color: "var(--text-muted)" }}>大小：</span>{formatSize(selectedAsset.size)}</div>
            <div><span style={{ color: "var(--text-muted)" }}>来源：</span>{selectedAsset.source === "ai-generated" ? "🤖 AI生成" : "📤 手动上传"}</div>
            <div><span style={{ color: "var(--text-muted)" }}>MIME：</span>{selectedAsset.mimeType || "—"}</div>
            <div><span style={{ color: "var(--text-muted)" }}>创建时间：</span>{new Date(selectedAsset.createdAt).toLocaleString("zh-CN")}</div>
            {selectedAsset.url && (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)" }}>URL：</span>
                <a href={selectedAsset.url} target="_blank" rel="noopener" style={{ color: "var(--accent)", marginLeft: 4 }}>{selectedAsset.url}</a>
              </div>
            )}
            {selectedAsset.metadata && (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)" }}>元数据：</span>
                <pre style={{ background: "var(--bg)", padding: 8, borderRadius: 8, fontSize: 12, marginTop: 4, overflow: "auto" }}>{selectedAsset.metadata}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
