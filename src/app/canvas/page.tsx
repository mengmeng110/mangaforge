"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ExcalidrawWrapper from "@/components/ExcalidrawWrapper";

// ==================== 类型 ====================
interface CanvasProject { id: string; name: string; data: string; thumbnail: string | null; projectId: string | null; updatedAt: string; }
interface Asset { id: string; name: string; type: string; url: string; size: number | null; }

const STORYBOARD_TEMPLATES = [
  { id: "4panel", name: "四格漫画", icon: "📰", cols: 1, rows: 4, w: 400, h: 1200, cellH: 280 },
  { id: "6panel", name: "六格漫画", icon: "🖼️", cols: 2, rows: 3, w: 800, h: 900, cellH: 270 },
  { id: "9panel", name: "九宫格", icon: "⬜", cols: 3, rows: 3, w: 900, h: 900, cellH: 270 },
  { id: "strip", name: "条漫", icon: "📜", cols: 1, rows: 6, w: 360, h: 1800, cellH: 280 },
  { id: "wide", name: "电影宽屏", icon: "🎬", cols: 3, rows: 2, w: 1200, h: 540, cellH: 240 },
];

const BUBBLE_TEMPLATES = [
  { id: "speech", name: "对话气泡", icon: "💬", borderColor: "#000", backgroundColor: "#fff", shape: "ellipse" },
  { id: "thought", name: "思考气泡", icon: "💭", borderColor: "#666", backgroundColor: "#f0f0f0", shape: "ellipse" },
  { id: "narration", name: "旁白框", icon: "📖", borderColor: "#333", backgroundColor: "#fffde7", shape: "rectangle" },
  { id: "shout", name: "呐喊框", icon: "💥", borderColor: "#e53935", backgroundColor: "#fff3e0", shape: "diamond" },
];

const LAYERS = [
  { id: "background", name: "🖼️ 背景层", locked: false },
  { id: "characters", name: "👤 角色层", locked: false },
  { id: "effects", name: "✨ 效果层", locked: false },
  { id: "text", name: "📝 文字层", locked: false },
  { id: "dialogue", name: "💬 对话层", locked: false },
];

const SHORTCUTS = [
  { key: "B", desc: "气泡工具" }, { key: "G", desc: "网格" }, { key: "F", desc: "帧工具" },
  { key: "L", desc: "图层面板" }, { key: "S", desc: "素材库" }, { key: "Z", desc: "沉浸模式" },
  { key: "Ctrl+E", desc: "导出全部" }, { key: "Ctrl+S", desc: "保存" }, { key: "Ctrl+Z", desc: "撤销" },
  { key: "Ctrl+Shift+Z", desc: "重做" }, { key: "=", desc: "放大" }, { key: "-", desc: "缩小" },
];

// ==================== 主组件 ====================
export default function CanvasPage() {
  const excalidrawRef = useRef<any>(null);
  const [canvases, setCanvases] = useState<CanvasProject[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState("未命名画布");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activePanel, setActivePanel] = useState<string | null>("templates");
  const [zenMode, setZenMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [sketchPrompt, setSketchPrompt] = useState("");
  const [presentationIdx, setPresentationIdx] = useState(-1);

  // 加载画布列表
  useEffect(() => {
    fetch("/api/canvases").then(r => r.json()).then(setCanvases).catch(() => {});
    fetch("/api/assets").then(r => r.json()).then(setAssets).catch(() => {});
  }, []);

  // 加载选中画布
  useEffect(() => {
    if (!currentId) return;
    fetch(`/api/canvases/${currentId}`).then(r => r.json()).then((c) => {
      setCurrentName(c.name);
      if (c.data && excalidrawRef.current) {
        try { excalidrawRef.current.updateScene(JSON.parse(c.data)); } catch {}
      }
    }).catch(() => {});
  }, [currentId]);

  // 自动保存
  useEffect(() => {
    const timer = setInterval(() => {
      if (excalidrawRef.current && currentId) {
        const elements = excalidrawRef.current.getSceneElements();
        const appState = excalidrawRef.current.getAppState();
        fetch("/api/canvases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentId, name: currentName, data: JSON.stringify({ elements, appState }) }),
        }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [currentId, currentName]);

  // 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "z" && !e.ctrlKey && !e.metaKey) { setZenMode(z => !z); return; }
      if (e.key === "Escape" && zenMode) { setZenMode(false); return; }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveCanvas(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentId, currentName, zenMode]);

  // 创建新画布
  const createCanvas = async () => {
    const res = await fetch("/api/canvases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新画布" }),
    });
    const data = await res.json();
    setCanvases(prev => [{ id: data.id, name: "新画布", data: "", thumbnail: null, projectId: null, updatedAt: new Date().toISOString() }, ...prev]);
    setCurrentId(data.id);
    setCurrentName("新画布");
  };

  // 保存画布
  const saveCanvas = async () => {
    if (!excalidrawRef.current || !currentId) return;
    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    await fetch("/api/canvases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, name: currentName, data: JSON.stringify({ elements, appState }) }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 删除画布
  const deleteCanvas = async (id: string) => {
    await fetch(`/api/canvases/${id}`, { method: "DELETE" });
    setCanvases(prev => prev.filter(c => c.id !== id));
    if (currentId === id) { setCurrentId(null); setCurrentName("未命名画布"); }
  };

  // 添加分镜模板
  const addStoryboardTemplate = (template: typeof STORYBOARD_TEMPLATES[0]) => {
    if (!excalidrawRef.current) return;
    const elements: any[] = [];
    const gap = 16;
    const cellW = (template.w - gap * (template.cols + 1)) / template.cols;
    for (let r = 0; r < template.rows; r++) {
      for (let c = 0; c < template.cols; c++) {
        const x = gap + c * (cellW + gap);
        const y = gap + r * (template.cellH + gap);
        elements.push({ type: "rectangle", id: `panel_${r}_${c}`, x, y, width: cellW, height: template.cellH, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, roughness: 1 });
      }
    }
    excalidrawRef.current.updateScene({ elements: [...excalidrawRef.current.getSceneElements(), ...elements] });
    setActivePanel(null);
  };

  // 添加气泡
  const addBubble = (bubble: typeof BUBBLE_TEMPLATES[0]) => {
    if (!excalidrawRef.current) return;
    const elem: any = { id: `bubble_${Date.now()}`, x: 200, y: 200, width: 160, height: 120, strokeColor: bubble.borderColor, backgroundColor: bubble.backgroundColor, fillStyle: "solid", strokeWidth: 2, roughness: 1 };
    if (bubble.shape === "ellipse") { elem.type = "ellipse"; }
    else if (bubble.shape === "diamond") { elem.type = "diamond"; }
    else { elem.type = "rectangle"; }
    excalidrawRef.current.updateScene({ elements: [...excalidrawRef.current.getSceneElements(), elem] });
  };

  // 从素材库拖入图片
  const addAssetToCanvas = (asset: Asset) => {
    if (!excalidrawRef.current || asset.type !== "image") return;
    excalidrawRef.current.updateScene({ elements: [...excalidrawRef.current.getSceneElements(), { type: "image", id: `asset_${asset.id}`, x: 100, y: 100, width: 400, height: 300, fileId: asset.id, strokeColor: "transparent", backgroundColor: "transparent" }] });
  };

  // AI 生图到画布
  const generateToCanvas = async () => {
    if (!aiPrompt || !excalidrawRef.current) return;
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, type: "image", source: "ai-generated" }),
      });
      const data = await res.json();
      if (data.url) {
        excalidrawRef.current.updateScene({ elements: [...excalidrawRef.current.getSceneElements(), { type: "image", id: `ai_${Date.now()}`, x: 150, y: 150, width: 512, height: 512, fileId: data.id, strokeColor: "transparent", backgroundColor: "transparent" }] });
      }
    } catch {}
  };

  // 草图转成品
  const sketchToArt = async () => {
    if (!sketchPrompt || !excalidrawRef.current) return;
    try {
      const elements = excalidrawRef.current.getSceneElements();
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${sketchPrompt}, clean lineart, professional manga illustration`, type: "image", source: "ai-generated" }),
      });
      const data = await res.json();
      if (data.url) {
        excalidrawRef.current.updateScene({ elements: [...elements, { type: "image", id: `art_${Date.now()}`, x: 200, y: 200, width: 512, height: 512, fileId: data.id, strokeColor: "transparent", backgroundColor: "transparent" }] });
      }
    } catch {}
  };

  // 导出分镜序列
  const exportPanels = () => {
    if (!excalidrawRef.current) return;
    const elements = excalidrawRef.current.getSceneElements();
    const panels = elements.filter((e: any) => e.type === "rectangle" && e.id.startsWith("panel_"));
    alert(`找到 ${panels.length} 个分镜格子，导出功能需要 excalidraw API 支持`);
  };

  // 演示模式
  const startPresentation = () => {
    if (!excalidrawRef.current) return;
    const elements = excalidrawRef.current.getSceneElements();
    const panels = elements.filter((e: any) => e.type === "rectangle" && e.id.startsWith("panel_")).sort((a: any, b: any) => a.y - b.y || a.x - b.x);
    if (panels.length === 0) { alert("没有分镜格子，请先添加分镜模板"); return; }
    setPresentationIdx(0);
    setZenMode(true);
  };

  const nextPanel = () => {
    const elements = excalidrawRef.current?.getSceneElements() || [];
    const panels = elements.filter((e: any) => e.type === "rectangle" && e.id.startsWith("panel_")).sort((a: any, b: any) => a.y - b.y || a.x - b.x);
    if (presentationIdx < panels.length - 1) {
      setPresentationIdx(i => i + 1);
    } else {
      setPresentationIdx(-1);
      setZenMode(false);
    }
  };

  const togglePanel = (panel: string) => { setActivePanel(prev => prev === panel ? null : panel); };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* 左侧工具栏 */}
      <div style={{ width: zenMode ? 0 : 56, overflow: "hidden", background: "var(--bg-card)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 8, transition: "width 0.3s" }}>
        {[
          { id: "templates", icon: "📐", label: "分镜模板" },
          { id: "bubbles", icon: "💬", label: "气泡" },
          { id: "assets", icon: "📚", label: "素材库" },
          { id: "ai", icon: "🤖", label: "AI 助手" },
          { id: "layers", icon: "📑", label: "图层" },
          { id: "connections", icon: "🔗", label: "场景连线" },
          { id: "shortcuts", icon: "⌨️", label: "快捷键" },
        ].map((tool) => (
          <button key={tool.id} onClick={() => togglePanel(tool.id)} title={tool.label}
            style={{ width: 40, height: 40, borderRadius: 8, border: activePanel === tool.id ? "2px solid var(--accent)" : "1px solid var(--border)", background: activePanel === tool.id ? "rgba(124,92,252,0.1)" : "transparent", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {tool.icon}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setZenMode(z => !z)} title="沉浸模式"
          style={{ width: 40, height: 40, borderRadius: 8, border: zenMode ? "2px solid var(--accent)" : "1px solid var(--border)", background: zenMode ? "rgba(124,92,252,0.1)" : "transparent", cursor: "pointer", fontSize: 18 }}>
          🧘
        </button>
      </div>

      {/* 左侧面板 */}
      {!zenMode && activePanel && (
        <div className="animate-fade-in" style={{ width: 240, background: "var(--bg-card)", borderRight: "1px solid var(--border)", overflow: "auto", padding: 16 }}>
          {/* 分镜模板面板 */}
          {activePanel === "templates" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>📐 分镜模板</h4>
              {STORYBOARD_TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => addStoryboardTemplate(t)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 10, marginBottom: 6, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ fontSize: 13 }}>{t.name}</span>
                </button>
              ))}
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>🖼️ 帧工具</h4>
              <button onClick={() => excalidrawRef.current?.updateScene({ elements: [...excalidrawRef.current.getSceneElements(), { type: "rectangle", id: `frame_${Date.now()}`, x: 100, y: 100, width: 500, height: 400, strokeColor: "#7c5cfc", backgroundColor: "rgba(124,92,252,0.05)", fillStyle: "solid", strokeWidth: 3, roughness: 0 }] })}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text)", fontSize: 13 }}>
                ➕ 添加帧/分组
              </button>
            </div>
          )}

          {/* 气泡面板 */}
          {activePanel === "bubbles" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>💬 气泡工具</h4>
              {BUBBLE_TEMPLATES.map((b) => (
                <button key={b.id} onClick={() => addBubble(b)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 10, marginBottom: 6, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
                  <span style={{ fontSize: 20 }}>{b.icon}</span>
                  <span style={{ fontSize: 13 }}>{b.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* 素材库面板 */}
          {activePanel === "assets" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>📚 素材库</h4>
              {assets.filter(a => a.type === "image").length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>暂无图片素材，请先在资产页面上传</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {assets.filter(a => a.type === "image").map((a) => (
                    <div key={a.id} onClick={() => addAssetToCanvas(a)} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img src={a.url} alt={a.name} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                      <div style={{ padding: "4px 6px", fontSize: 10, color: "var(--text-muted)" }}>{a.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 助手面板 */}
          {activePanel === "ai" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>🤖 AI 画布助手</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>AI 生图到画布</label>
                <textarea className="textarea" placeholder="描述你想生成的画面..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} style={{ minHeight: 80, fontSize: 12, marginTop: 4 }} />
                <button className="btn-primary" onClick={generateToCanvas} style={{ width: "100%", marginTop: 4, padding: 8, fontSize: 12 }}>🎨 生成并添加到画布</button>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>草图转成品</label>
                <textarea className="textarea" placeholder="描述你草稿的风格和细节..." value={sketchPrompt} onChange={e => setSketchPrompt(e.target.value)} style={{ minHeight: 80, fontSize: 12, marginTop: 4 }} />
                <button className="btn-primary" onClick={sketchToArt} style={{ width: "100%", marginTop: 4, padding: 8, fontSize: 12 }}>✨ 草图转成品</button>
              </div>
            </div>
          )}

          {/* 图层面板 */}
          {activePanel === "layers" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>📑 图层管理</h4>
              {LAYERS.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, marginBottom: 4, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13 }}>{l.name}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button title={l.locked ? "解锁" : "锁定"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{l.locked ? "🔒" : "🔓"}</button>
                    <button title="可见/隐藏" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>👁️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 场景连线面板 */}
          {activePanel === "connections" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>🔗 场景连线</h4>
              {[
                { icon: "➡️", name: "箭头连接", desc: "标记剧情流向" },
                { icon: "⤻", name: "虚线连接", desc: "可选剧情分支" },
                { icon: "❤️", name: "情感线", desc: "角色关系变化" },
                { icon: "⚡", name: "冲突线", desc: "矛盾冲突关系" },
              ].map((c, i) => (
                <button key={i} onClick={() => excalidrawRef.current?.updateScene({ elements: [...excalidrawRef.current.getSceneElements(), { type: "arrow", id: `conn_${Date.now()}`, x: 100, y: 100, width: 200, height: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", strokeWidth: 2, roughness: 1 }] })}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 10, marginBottom: 6, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 快捷键面板 */}
          {activePanel === "shortcuts" && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>⌨️ 快捷键</h4>
              {SHORTCUTS.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <kbd style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}>{s.key}</kbd>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 右侧主区域 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 顶部工具栏 */}
        <div style={{ height: 48, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
          {/* 画布选择器 */}
          <select value={currentId || ""} onChange={(e) => { setCurrentId(e.target.value); setCurrentName(canvases.find(c => c.id === e.target.value)?.name || "未命名画布"); }}
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", color: "var(--text)", fontSize: 13, maxWidth: 160 }}>
            <option value="">选择画布...</option>
            {canvases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={createCanvas} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--text)", fontSize: 12 }}>➕ 新建</button>

          {/* 画布名称 */}
          <input value={currentName} onChange={e => setCurrentName(e.target.value)} onBlur={saveCanvas}
            style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 14, fontWeight: 600, flex: 1, outline: "none" }} />

          {/* 操作按钮 */}
          <button onClick={saveCanvas} title="保存" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>{saved ? "✅" : "💾"}</button>
          <button onClick={exportPanels} title="导出分镜" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>📤</button>
          <button onClick={startPresentation} title="演示模式" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>▶️</button>
          {currentId && <button onClick={() => deleteCanvas(currentId)} title="删除画布" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>🗑️</button>}
        </div>

        {/* Excalidraw 画布 */}
        <div style={{ flex: 1, position: "relative" }}>
          <ExcalidrawWrapper ref={excalidrawRef} />
        </div>

        {/* 演示模式覆盖层 */}
        {presentationIdx >= 0 && (
          <div onClick={nextPanel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 100 }}>
            <div style={{ textAlign: "center", color: "white" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>分镜 {presentationIdx + 1}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>点击继续 / ESC 退出</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
