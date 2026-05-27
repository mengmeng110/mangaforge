"use client";

import { useState, useEffect, useCallback } from "react";

// 动态导入 Excalidraw（仅客户端）
const ExcalidrawWrapper = ({ onChange, initialData }: { onChange?: (elements: any, state: any) => void; initialData?: any }) => {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      setComp(() => mod.Excalidraw);
    });
  }, []);

  if (!Comp) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div>画布引擎加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <Comp
      initialData={initialData}
      onChange={onChange}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: true,
          export: { saveFileToDisk: true },
          loadScene: true,
          saveToActiveFile: true,
        },
      }}
    />
  );
};

// 分镜模板
const PANEL_TEMPLATES = [
  { name: "📖 漫画竖条", desc: "竖向3格分镜", cols: 1, rows: 3 },
  { name: "🖼️ 田字格", desc: "2x2四格漫画", cols: 2, rows: 2 },
  { name: "🎬 电影宽屏", desc: "横向2格对比", cols: 2, rows: 1 },
  { name: "📺 条漫", desc: "竖向4格长条", cols: 1, rows: 4 },
  { name: "🌀 不规则", desc: "L型特殊构图", cols: 0, rows: 0 },
];

interface CanvasItem {
  id: string;
  name: string;
  data: string | null;
  thumbnail: string | null;
  updatedAt: string;
  projectId: string | null;
}

export default function CanvasPage() {
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [current, setCurrent] = useState<CanvasItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [excalidrawData, setExcalidrawData] = useState<any>(null);

  // 加载画布列表
  const loadCanvases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/canvases");
      const data = await res.json();
      setCanvases(data);
      if (data.length > 0 && !current) setCurrent(data[0]);
    } catch (e) {
      console.error("加载画布失败", e);
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => { loadCanvases(); }, []);

  // 新建画布
  const createCanvas = async (name?: string) => {
    const res = await fetch("/api/canvases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "未命名画布" }),
    });
    const { id } = await res.json();
    await loadCanvases();
    const canvas = canvases.find((c) => c.id === id) || { id, name: name || "未命名画布", data: null, thumbnail: null, updatedAt: new Date().toISOString(), projectId: null };
    setCurrent(canvas);
    return id;
  };

  // 保存画布
  const saveCanvas = async () => {
    if (!current || !excalidrawData) return;
    setSaving(true);
    try {
      await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          name: current.name,
          data: JSON.stringify(excalidrawData),
        }),
      });
      setLastSaved(new Date().toLocaleTimeString("zh-CN"));
    } catch (e) {
      console.error("保存失败", e);
    } finally {
      setSaving(false);
    }
  };

  // 删除画布
  const deleteCanvas = async (id: string) => {
    if (!confirm("确定删除这个画布？")) return;
    await fetch(`/api/canvases/${id}`, { method: "DELETE" });
    const remaining = canvases.filter((c) => c.id !== id);
    setCanvases(remaining);
    if (current?.id === id) setCurrent(remaining[0] || null);
  };

  // 应用分镜模板
  const applyTemplate = (template: typeof PANEL_TEMPLATES[0]) => {
    if (!template.cols) return; // 不规则模板暂不实现
    const elements: any[] = [];
    const panelW = 400;
    const panelH = 500;
    const gap = 20;
    const startX = 100;
    const startY = 100;

    for (let row = 0; row < template.rows; row++) {
      for (let col = 0; col < template.cols; col++) {
        const x = startX + col * (panelW + gap);
        const y = startY + row * (panelH + gap);
        elements.push({
          type: "rectangle",
          x, y,
          width: panelW,
          height: panelH,
          strokeColor: "#1e1e1e",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          id: `panel_${row}_${col}`,
        });
        // 添加编号文本
        elements.push({
          type: "text",
          x: x + 10,
          y: y + 10,
          text: `#${row * template.cols + col + 1}`,
          fontSize: 16,
          strokeColor: "#888",
          id: `label_${row}_${col}`,
        });
      }
    }
    setExcalidrawData({ elements, appState: { viewBackgroundColor: "#ffffff" } });
    setShowTemplates(false);
  };

  // Excalidraw 内容变化回调
  const handleChange = useCallback((elements: any, appState: any) => {
    setExcalidrawData({ elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } });
  }, []);

  // 自动保存（每30秒）
  useEffect(() => {
    const timer = setInterval(() => {
      if (current && excalidrawData) saveCanvas();
    }, 30000);
    return () => clearInterval(timer);
  }, [current, excalidrawData]);

  // 加载已有数据
  const initialData = current?.data ? JSON.parse(current.data) : undefined;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", gap: 0 }}>
      {/* 左侧画布列表 */}
      <div style={{
        width: 220, flexShrink: 0, background: "var(--bg-card)",
        borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>🎨 画布列表</h3>
          <button className="btn-primary" onClick={() => setShowTemplates(true)} style={{ width: "100%", padding: "8px", fontSize: 12 }}>
            ✨ 新建画布
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {loading ? (
            <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>加载中...</div>
          ) : canvases.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>
              暂无画布<br />点击上方创建
            </div>
          ) : (
            canvases.map((c) => (
              <div key={c.id}
                onClick={() => setCurrent(c)}
                style={{
                  padding: "10px", borderRadius: 8, cursor: "pointer", marginBottom: 6,
                  background: current?.id === c.id ? "rgba(124,92,252,0.1)" : "transparent",
                  border: `1px solid ${current?.id === c.id ? "var(--accent)" : "transparent"}`,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteCanvas(c.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>🗑️</button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {new Date(c.updatedAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 主画布区 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 顶部工具栏 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 16px", background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {current && (
              <input
                className="input"
                value={current.name}
                onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                onBlur={saveCanvas}
                style={{ width: 200, padding: "6px 10px", fontSize: 14 }}
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastSaved && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                ✅ {lastSaved} 已保存
              </span>
            )}
            <button className="btn-ghost" onClick={saveCanvas} disabled={saving} style={{ padding: "6px 14px", fontSize: 12 }}>
              {saving ? "⏳ 保存中..." : "💾 保存"}
            </button>
            <button className="btn-ghost" onClick={() => setShowTemplates(true)} style={{ padding: "6px 14px", fontSize: 12 }}>
              📐 模板
            </button>
          </div>
        </div>

        {/* Excalidraw 画布 */}
        <div style={{ flex: 1, position: "relative" }}>
          {current ? (
            <ExcalidrawWrapper
              key={current.id}
              initialData={initialData}
              onChange={handleChange}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
                <h3>选择或创建一个画布</h3>
                <p>用于分镜编排、素材布局、草图标注</p>
                <button className="btn-primary" onClick={() => setShowTemplates(true)} style={{ marginTop: 12 }}>
                  ✨ 新建画布
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 模板选择弹窗 */}
      {showTemplates && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowTemplates(false)}>
          <div className="card" style={{ width: 520, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>📐 选择模板</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {PANEL_TEMPLATES.map((t, i) => (
                <div key={i} className="card"
                  style={{ cursor: "pointer", textAlign: "center", padding: 16 }}
                  onClick={() => applyTemplate(t)}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{t.name.split(" ")[0]}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name.split(" ").slice(1).join(" ")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>或创建空白画布</div>
              <input className="input" placeholder="画布名称..." id="canvas-name"
                style={{ width: "100%", marginBottom: 10 }} />
              <button className="btn-primary" style={{ width: "100%" }} onClick={async () => {
                const name = (document.getElementById("canvas-name") as HTMLInputElement)?.value || "未命名画布";
                await createCanvas(name);
                setShowTemplates(false);
              }}>
                创建空白画布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
