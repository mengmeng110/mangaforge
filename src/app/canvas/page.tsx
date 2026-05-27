"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ==================== 类型 ====================
interface CanvasProject { id: string; name: string; data: string; thumbnail: string | null; projectId: string | null; updatedAt: string; }
interface Asset { id: string; name: string; type: string; url: string; size: number | null; }

const STORYBOARD_TEMPLATES = [
  { id: "4panel", name: "四格漫画", icon: "📰", cols: 1, rows: 4, w: 400, h: 1200, cellH: 280 },
  { id: "6panel", name: "六格漫画", icon: "🖼️", cols: 2, rows: 3, w: 800, h: 900, cellH: 270 },
  { id: "9panel", name: "九宫格", icon: "▦", cols: 3, rows: 3, w: 900, h: 900, cellH: 270 },
  { id: "cinema", name: "电影宽屏", icon: "🎬", cols: 3, rows: 2, w: 1200, h: 600, cellH: 270 },
  { id: "strip", name: "条漫", icon: "📏", cols: 1, rows: 6, w: 400, h: 1800, cellH: 280 },
  { id: "manga", name: "日漫分镜", icon: "🌸", cols: 0, rows: 0, w: 800, h: 1100, cellH: 0 },
];

const BUBBLE_TYPES = [
  { id: "speech", name: "对话气泡", icon: "💬", shape: "ellipse" },
  { id: "thought", name: "思考气泡", icon: "💭", shape: "cloud" },
  { id: "shout", name: "呐喊气泡", icon: "💥", shape: "burst" },
  { id: "narration", name: "旁白框", icon: "📖", shape: "rectangle" },
  { id: "whisper", name: "低语气泡", icon: "🫧", shape: "dashed" },
  { id: "flashback", name: "回忆框", icon: "⏳", shape: "wavy" },
];

const LAYER_TYPES = [
  { id: "background", name: "背景层", icon: "🏔️", color: "#4ade80" },
  { id: "character", name: "角色层", icon: "🧑", color: "#60a5fa" },
  { id: "effect", name: "特效层", icon: "✨", color: "#f59e0b" },
  { id: "text", name: "文字层", icon: "📝", color: "#ef4444" },
  { id: "ui", name: "UI层", icon: "🔧", color: "#8b5cf6" },
];

const KEYBOARD_SHORTCUTS = [
  { key: "B", desc: "添加气泡" }, { key: "G", desc: "网格开关" },
  { key: "F", desc: "添加分镜框" }, { key: "L", desc: "图层面板" },
  { key: "S", desc: "素材库" }, { key: "D", desc: "演示模式" },
  { key: "Z", desc: "沉浸模式" }, { key: "Ctrl+E", desc: "导出全部" },
  { key: "Ctrl+S", desc: "保存画布" }, { key: "Ctrl+Z", desc: "撤销" },
  { key: "Ctrl+Shift+Z", desc: "重做" }, { key: "=", desc: "放大" },
  { key: "-", desc: "缩小" }, { key: "0", desc: "重置缩放" },
];

// ==================== 主页面 ====================
export default function CanvasPage() {
  const [Excalidraw, setExcalidraw] = useState<any>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [canvases, setCanvases] = useState<CanvasProject[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState("未命名画布");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("background");
  const [showGrid, setShowGrid] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const saveTimer = useRef<any>(null);

  // 加载 Excalidraw
  useEffect(() => {
    // eslint-disable-next-line no-eval
    new Function('m', 'return import(m)')("@excalidraw/excalidraw").then((mod: any) => setExcalidraw(() => mod.Excalidraw)).catch(() => setExcalidraw(null));
  }, []);

  // 加载画布列表和资产
  useEffect(() => {
    Promise.all([
      fetch("/api/canvases").then(r => r.json()),
      fetch("/api/assets").then(r => r.json()),
    ]).then(([c, a]) => { setCanvases(c); setAssets(a); setLoading(false); });
  }, []);

  // 自动保存
  useEffect(() => {
    if (!excalidrawAPI || !currentId) return;
    const timer = setInterval(() => { handleSave(); }, 30000);
    saveTimer.current = timer;
    return () => clearInterval(timer);
  }, [excalidrawAPI, currentId]);

  // 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "b") { e.preventDefault(); togglePanel("bubbles"); }
      if (e.key === "g") { e.preventDefault(); setShowGrid(p => !p); }
      if (e.key === "f") { e.preventDefault(); addFrameTemplate(); }
      if (e.key === "l") { e.preventDefault(); togglePanel("layers"); }
      if (e.key === "s" && !e.ctrlKey) { e.preventDefault(); togglePanel("assets"); }
      if (e.key === "d") { e.preventDefault(); startPresentation(); }
      if (e.key === "z" && !e.ctrlKey) { e.preventDefault(); setZenMode(p => !p); }
      if (e.key === "e" && e.ctrlKey) { e.preventDefault(); exportAll(); }
      if (e.key === "s" && e.ctrlKey) { e.preventDefault(); handleSave(); }
      if (e.key === "?") { e.preventDefault(); setShowShortcuts(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [excalidrawAPI, currentId]);

  const togglePanel = (panel: string) => { setActivePanel(prev => prev === panel ? null : panel); };

  // ==================== 画布操作 ====================
  const createCanvas = async (name = "未命名画布") => {
    const res = await fetch("/api/canvases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    const updated = await fetch("/api/canvases").then(r => r.json());
    setCanvases(updated);
    setCurrentId(data.id);
    setCurrentName(name);
  };

  const loadCanvas = async (id: string) => {
    const canvas = await fetch(`/api/canvases/${id}`).then(r => r.json);
    setCurrentId(canvas.id);
    setCurrentName(canvas.name);
    if (canvas.data && excalidrawAPI) {
      try {
        const parsed = JSON.parse(canvas.data);
        excalidrawAPI.updateScene(parsed);
      } catch {}
    }
  };

  const handleSave = async () => {
    if (!excalidrawAPI || !currentId) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    await fetch("/api/canvases", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, name: currentName, data: JSON.stringify({ elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } }) }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteCanvas = async (id: string) => {
    await fetch(`/api/canvases/${id}`, { method: "DELETE" });
    setCanvases(canvases.filter(c => c.id !== id));
    if (currentId === id) { setCurrentId(null); setCurrentName("未命名画布"); }
  };

  // ==================== 分镜模板 ====================
  const addStoryboardTemplate = (template: typeof STORYBOARD_TEMPLATES[0]) => {
    if (!excalidrawAPI) return;
    const elements: any[] = [];
    const startX = 100, startY = 100, gap = 20;

    if (template.id === "manga") {
      // 日漫不规则分镜
      const panels = [
        { x: 0, y: 0, w: 780, h: 250 }, { x: 0, y: 270, w: 380, h: 250 },
        { x: 400, y: 270, w: 380, h: 350 }, { x: 0, y: 540, w: 500, h: 250 },
        { x: 520, y: 640, w: 260, h: 150 },
      ];
      panels.forEach((p, i) => {
        elements.push({ type: "rectangle", id: `panel_${i}`, x: startX + p.x, y: startY + p.y, width: p.w, height: p.h, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, roughness: 1 });
      });
    } else {
      const cellW = (template.w - gap * (template.cols + 1)) / template.cols;
      for (let r = 0; r < template.rows; r++) {
        for (let c = 0; c < template.cols; c++) {
          const x = startX + gap + c * (cellW + gap);
          const y = startY + gap + r * (template.cellH + gap);
          elements.push({ type: "rectangle", id: `panel_${r}_${c}`, x, y, width: cellW, height: template.cellH, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, roughness: 1 });
        }
      }
    }
    excalidrawAPI.updateScene({ elements: [...excalidrawAPI.getSceneElements(), ...elements] });
    setActivePanel(null);
  };

  const addFrameTemplate = () => { addStoryboardTemplate(STORYBOARD_TEMPLATES[1]); };

  // ==================== 气泡工具 ====================
  const addBubble = (type: typeof BUBBLE_TYPES[0]) => {
    if (!excalidrawAPI) return;
    const els = excalidrawAPI.getSceneElements();
    const vx = window.innerWidth / 2, vy = window.innerHeight / 2;
    const appState = excalidrawAPI.getAppState();
    const x = (vx - appState.offsetX) / appState.zoom.value;
    const y = (vy - appState.offsetY) / appState.zoom.value;

    let bubble: any;
    if (type.shape === "ellipse") {
      bubble = { type: "ellipse", id: `bubble_${Date.now()}`, x, y, width: 200, height: 120, strokeColor: "#1e1e1e", backgroundColor: "#ffffff", fillStyle: "solid", strokeWidth: 2, roughness: 1 };
    } else if (type.shape === "rectangle") {
      bubble = { type: "rectangle", id: `bubble_${Date.now()}`, x, y, width: 250, height: 80, strokeColor: "#1e1e1e", backgroundColor: "#fffde7", fillStyle: "solid", strokeWidth: 1, roughness: 0 };
    } else if (type.shape === "dashed") {
      bubble = { type: "ellipse", id: `bubble_${Date.now()}`, x, y, width: 180, height: 100, strokeColor: "#9e9e9e", backgroundColor: "transparent", strokeStyle: "dashed", strokeWidth: 1, roughness: 2 };
    } else {
      bubble = { type: "ellipse", id: `bubble_${Date.now()}`, x, y, width: 200, height: 130, strokeColor: "#1e1e1e", backgroundColor: "#ffffff", fillStyle: "solid", strokeWidth: 2, roughness: 2 };
    }

    const label = { type: "text", id: `label_${Date.now()}`, x: x + 30, y: y + 30, width: 140, height: 40, text: type.name, fontSize: 16, fontFamily: 1, textAlign: "center", verticalAlign: "middle", strokeColor: "#1e1e1e" };
    excalidrawAPI.updateScene({ elements: [...els, bubble, label] });
    setActivePanel(null);
  };

  // ==================== 图层管理 ====================
  const addLayerGroup = (layerType: typeof LAYER_TYPES[0]) => {
    if (!excalidrawAPI) return;
    const els = excalidrawAPI.getSceneElements();
    const label = { type: "text", id: `layer_${layerType.id}_${Date.now()}`, x: 50, y: 50, width: 200, height: 30, text: `━━━ ${layerType.icon} ${layerType.name} ━━━`, fontSize: 14, fontFamily: 1, strokeColor: layerType.color };
    excalidrawAPI.updateScene({ elements: [...els, label] });
    setActiveLayer(layerType.id);
  };

  // ==================== 素材拖入 ====================
  const addAssetToCanvas = async (asset: Asset) => {
    if (!excalidrawAPI || asset.type !== "image") return;
    const els = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const x = (window.innerWidth / 2 - appState.offsetX) / appState.zoom.value - 150;
    const y = (window.innerHeight / 2 - appState.offsetY) / appState.zoom.value - 150;

    try {
      const resp = await fetch(asset.url);
      const blob = await resp.blob();
      const file = new File([blob], asset.name, { type: blob.type });
      excalidrawAPI.addFiles([file]);
      const imgEl = { type: "image", id: `img_${Date.now()}`, x, y, width: 300, height: 300, fileId: asset.id, strokeColor: "transparent", backgroundColor: "transparent" };
      excalidrawAPI.updateScene({ elements: [...els, imgEl] });
    } catch { alert("加载素材失败"); }
    setActivePanel(null);
  };

  // ==================== AI 生图到画布 ====================
  const generateToCanvas = async () => {
    if (!aiPrompt.trim() || !excalidrawAPI) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, type: "image", source: "ai-generated" }),
      });
      const data = await res.json();
      if (data.url) {
        const els = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const x = (window.innerWidth / 2 - appState.offsetX) / appState.zoom.value;
        const y = (window.innerHeight / 2 - appState.offsetY) / appState.zoom.value;
        const textEl = { type: "text", id: `ai_${Date.now()}`, x: x - 100, y, width: 200, height: 60, text: `🎨 ${aiPrompt}\n⏳ 生成中...`, fontSize: 14 };
        excalidrawAPI.updateScene({ elements: [...els, textEl] });
        setAiPrompt("");
      }
    } catch { alert("AI 生成失败"); }
    setAiGenerating(false);
  };

  // ==================== 导出分镜序列 ====================
  const exportAll = async () => {
    if (!excalidrawAPI) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const elements = excalidrawAPI.getSceneElements();
    const frames = elements.filter((el: any) => el.type === "rectangle" && el.id.startsWith("panel_"));
    if (frames.length === 0) { alert("没有找到分镜格子（需要用模板创建）"); return; }

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const inFrame = elements.filter((el: any) => {
        if (el.id === frame.id) return false;
        return el.x >= frame.x && el.y >= frame.y && el.x + (el.width || 0) <= frame.x + frame.width && el.y + (el.height || 0) <= frame.y + frame.height;
      });
      const blob = await exportToBlob({ elements: [frame, ...inFrame], appState: { viewBackgroundColor: "#ffffff" }, files: null });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `分镜_${i + 1}.png`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ==================== 演示模式 ====================
  const startPresentation = () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const frames = elements.filter((el: any) => el.type === "rectangle" && el.id.startsWith("panel_"));
    if (frames.length === 0) { alert("没有分镜格子，无法演示"); return; }
    setPresentIdx(0);
    setPresenting(true);
  };

  const presentNext = () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const frames = elements.filter((el: any) => el.type === "rectangle" && el.id.startsWith("panel_"));
    if (presentIdx < frames.length - 1) {
      setPresentIdx(p => p + 1);
      const frame = frames[presentIdx + 1];
      excalidrawAPI.scrollToContent([frame], { animate: true, fitToContent: true });
    } else { setPresenting(false); }
  };

  const presentPrev = () => {
    if (!excalidrawAPI || presentIdx <= 0) return;
    setPresentIdx(p => p - 1);
    const elements = excalidrawAPI.getSceneElements();
    const frames = elements.filter((el: any) => el.type === "rectangle" && el.id.startsWith("panel_"));
    const frame = frames[presentIdx - 1];
    excalidrawAPI.scrollToContent([frame], { animate: true, fitToContent: true });
  };

  // ==================== 渲染 ====================
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* 左侧栏 - 画布列表 */}
      {!zenMode && (
        <div style={{ width: 220, background: "var(--bg-card)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
            <button className="btn-primary" style={{ width: "100%", padding: "8px 12px", fontSize: 13 }} onClick={() => createCanvas()}>➕ 新建画布</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            {canvases.map(c => (
              <div key={c.id} onClick={() => loadCanvas(c.id)}
                style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: currentId === c.id ? "var(--accent)" : "transparent", color: currentId === c.id ? "white" : "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteCanvas(c.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "inherit", opacity: 0.6 }}>✕</button>
              </div>
            ))}
            {canvases.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>暂无画布</div>}
          </div>
        </div>
      )}

      {/* 主画布区域 */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* 顶部工具栏 */}
        {!zenMode && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <input className="input" value={currentName} onChange={e => setCurrentName(e.target.value)} style={{ width: 180, padding: "6px 10px", fontSize: 13 }} />
            <div style={{ flex: 1 }} />

            {/* 功能按钮组 */}
            <ToolBtn icon="📐" label="分镜模板" active={activePanel === "templates"} onClick={() => togglePanel("templates")} />
            <ToolBtn icon="💬" label="气泡" active={activePanel === "bubbles"} onClick={() => togglePanel("bubbles")} />
            <ToolBtn icon="📑" label="图层" active={activePanel === "layers"} onClick={() => togglePanel("layers")} />
            <ToolBtn icon="📦" label="素材库" active={activePanel === "assets"} onClick={() => togglePanel("assets")} />
            <ToolBtn icon="🤖" label="AI生图" active={activePanel === "ai"} onClick={() => togglePanel("ai")} />
            <ToolBtn icon="🎬" label="演示" onClick={startPresentation} />
            <ToolBtn icon="📤" label="导出" onClick={exportAll} />
            <ToolBtn icon="🌙" label="沉浸" onClick={() => setZenMode(true)} />
            <ToolBtn icon="⌨️" label="快捷键" onClick={() => setShowShortcuts(true)} />
            <ToolBtn icon="💾" label={saved ? "已保存" : "保存"} onClick={handleSave} />
          </div>
        )}

        {/* 浮动面板 */}
        {activePanel && !zenMode && (
          <div className="card animate-fade-in" style={{ position: "absolute", top: 52, right: 16, zIndex: 200, width: activePanel === "assets" ? 360 : 300, maxHeight: "70vh", overflow: "auto", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 14 }}>
                {activePanel === "templates" && "📐 分镜模板"}
                {activePanel === "bubbles" && "💬 气泡工具"}
                {activePanel === "layers" && "📑 图层管理"}
                {activePanel === "assets" && "📦 素材库"}
                {activePanel === "ai" && "🤖 AI 生图"}
              </h4>
              <button onClick={() => setActivePanel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* 分镜模板面板 */}
            {activePanel === "templates" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {STORYBOARD_TEMPLATES.map(t => (
                  <button key={t.id} className="card" onClick={() => addStoryboardTemplate(t)}
                    style={{ cursor: "pointer", textAlign: "center", padding: "14px 8px", fontSize: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{t.icon}</div>
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {/* 气泡面板 */}
            {activePanel === "bubbles" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {BUBBLE_TYPES.map(b => (
                  <button key={b.id} className="card" onClick={() => addBubble(b)}
                    style={{ cursor: "pointer", textAlign: "center", padding: "14px 8px", fontSize: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{b.icon}</div>
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* 图层面板 */}
            {activePanel === "layers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LAYER_TYPES.map(l => (
                  <button key={l.id} onClick={() => addLayerGroup(l)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${activeLayer === l.id ? l.color : "var(--border)"}`, background: activeLayer === l.id ? `${l.color}15` : "transparent", cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
                    <span>{l.icon}</span><span>{l.name}</span>
                    <span style={{ marginLeft: "auto", width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                  </button>
                ))}
              </div>
            )}

            {/* 素材库面板 */}
            {activePanel === "assets" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {assets.filter(a => a.type === "image").length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>暂无素材，请先上传或生成</div>
                )}
                {assets.filter(a => a.type === "image").map(a => (
                  <div key={a.id} className="card" onClick={() => addAssetToCanvas(a)}
                    style={{ cursor: "pointer", padding: 4, overflow: "hidden" }}>
                    <img src={a.url} alt={a.name} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6 }} />
                    <div style={{ fontSize: 11, padding: "4px 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  </div>
                ))}
              </div>
            )}

            {/* AI 生图面板 */}
            {activePanel === "ai" && (
              <div>
                <textarea className="textarea" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  placeholder="描述你想要的画面，如：\nanime style girl standing in rain, blue umbrella"
                  style={{ minHeight: 100, fontSize: 13, marginBottom: 10 }} />
                <button className="btn-primary" onClick={generateToCanvas} disabled={!aiPrompt.trim() || aiGenerating}
                  style={{ width: "100%", padding: "10px 0", fontSize: 13 }}>
                  {aiGenerating ? "⏳ 生成中..." : "🎨 生成到画布"}
                </button>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>需要在 API 设置中配置图片生成 API</div>
              </div>
            )}
          </div>
        )}

        {/* Excalidraw 画布 */}
        <div style={{ width: "100%", height: "100%" }}>
          {Excalidraw && (
            <Excalidraw
              excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
              gridModeEnabled={showGrid}
              zenModeEnabled={zenMode}
              viewModeEnabled={presenting}
              UIOptions={{
                canvasActions: { changeViewBackgroundColor: true, export: false, loadScene: false, saveToActiveFile: false },
                tools: { image: true },
              }}
            />
          )}
          {!Excalidraw && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>加载画布引擎中...</div>
                <div style={{ fontSize: 13 }}>首次加载可能需要几秒钟</div>
              </div>
            </div>
          )}
        </div>

        {/* 演示模式控制栏 */}
        {presenting && (
          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 20px", display: "flex", gap: 12, alignItems: "center", zIndex: 200 }}>
            <button className="btn-ghost" onClick={presentPrev} disabled={presentIdx <= 0}>◀ 上一格</button>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>分镜 {presentIdx + 1}</span>
            <button className="btn-primary" onClick={presentNext}>下一格 ▶</button>
            <button className="btn-ghost" onClick={() => setPresenting(false)}>✕ 退出</button>
          </div>
        )}

        {/* 沉浸模式退出提示 */}
        {zenMode && (
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 16px", fontSize: 12, color: "var(--text-muted)", zIndex: 200 }}>
            沉浸模式 · 按 <kbd style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>Z</kbd> 退出 · <kbd style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>?</kbd> 快捷键
          </div>
        )}

        {/* 快捷键弹窗 */}
        {showShortcuts && (
          <div className="card animate-fade-in" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 300, width: 400, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>⌨️ 快捷键</h3>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
              {KEYBOARD_SHORTCUTS.map(s => (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <kbd style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{s.key}</kbd>
                  <span style={{ color: "var(--text-muted)" }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 工具栏按钮组件
function ToolBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      style={{ background: active ? "var(--accent)" : "transparent", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: active ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}
