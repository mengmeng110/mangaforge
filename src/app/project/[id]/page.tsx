"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSettingsStore } from "@/lib/stores/settings-store";

// ==================== 类型 ====================
interface Character { id: string; name: string; description: string; personality: string; consistencyPrompt: string; referenceImages?: string; }
interface Scene { id: string; index: number; title: string; description: string; location: string; timeOfDay: string; mood: string; bgmStyle: string; }
interface Panel { id: string; index: number; panelType: string; prompt: string; camera: string; characters: string; dialogue: string | null; speaker: string | null; narration: string | null; soundEffect: string | null; duration: number; transition: string; imageUrl: string | null; videoUrl: string | null; status: string; }
interface Project { id: string; title: string; genre: string; style: string; status: string; description: string; characters: Character[]; scenes: Scene[]; panels: Panel[]; }
interface PipelineStep { step: string; status: string; progress: number; message: string; }
interface PipelineState { steps: PipelineStep[]; currentStep: string; overallProgress: number; isRunning: boolean; }
interface Asset { id: string; name: string; type: string; url: string; size: number | null; metadata: string | null; }

type ToastType = "error" | "success" | "info";
interface Toast { type: ToastType; text: string; }

const STEP_ICONS: Record<string, string> = { script: "📝", storyboard: "🎬", characters: "👤", images: "🎨", video: "🎬", voiceover: "🎤", composition: "🎥", export: "📦", done: "✅" };
const STEP_LABELS: Record<string, string> = { script: "剧本分析", storyboard: "分镜生成", characters: "角色提取", images: "图片生成", video: "分镜视频", voiceover: "配音合成", composition: "视频合成", export: "导出输出", done: "完成" };

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const settings = useSettingsStore();
  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tab, setTab] = useState<"storyboard" | "characters" | "timeline" | "export">("storyboard");
  const [analyzing, setAnalyzing] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 显示提示（自动 4 秒消失）
  const showToast = useCallback((type: ToastType, text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // 加载项目
  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        showToast("error", `加载项目失败 (${res.status})`);
        return;
      }
      const data = await res.json();
      if (!data || !data.id) {
        setNotFound(true);
        return;
      }
      setNotFound(false);
      setProject({
        ...data,
        characters: data.characters || [],
        scenes: data.scenes || [],
        panels: data.panels || [],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "网络错误";
      showToast("error", `加载项目失败: ${msg}`);
    }
  }, [id, showToast]);

  // 加载资产
  const loadAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets?projectId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "网络错误";
      showToast("error", `加载资产失败: ${msg}`);
    }
  }, [id, showToast]);

  // 加载管线状态
  const loadPipeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/pipeline`);
      if (!res.ok) return;
      const data = await res.json();
      setPipeline(data && data.steps ? data : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "网络错误";
      showToast("error", `加载管线状态失败: ${msg}`);
    }
  }, [id, showToast]);

  useEffect(() => { loadProject(); loadAssets(); loadPipeline(); }, [loadProject, loadAssets, loadPipeline]);

  // 轮询管线进度
  useEffect(() => {
    if (pipeline?.isRunning) {
      pollRef.current = setInterval(loadPipeline, 2000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pipeline?.isRunning, loadPipeline]);

  // 分析剧本
  const handleAnalyze = async () => {
    if (!settings.llm.apiKey) {
      showToast("error", "⚠️ 请先到 ⚙️ API 设置 页面配置 LLM 的 API Key！");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmConfig: settings.llm }),
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", `分析失败: ${data.error}`);
      } else {
        showToast("success", `✅ 分析完成！角色: ${data.characterCount} 个 · 场景: ${data.sceneCount} 个 · 分镜: ${data.panelCount} 个`);
        loadProject();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "网络错误";
      showToast("error", `分析请求失败: ${msg}`);
    } finally { setAnalyzing(false); }
  };

  // 启动管线
  const handleRunPipeline = async (startFrom?: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmConfig: settings.llm,
          imageGenConfig: settings.imageGen,
          videoGenConfig: settings.videoGen,
          ttsConfig: settings.tts,
          startFrom,
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", data.error);
      } else {
        loadPipeline();
        pollRef.current = setInterval(loadPipeline, 2000);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "网络错误";
      showToast("error", `启动管线失败: ${msg}`);
    }
  };

  // ==================== 404 页面 ====================
  if (notFound) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>项目未找到</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          ID 为 <code style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>{id}</code> 的项目不存在或已被删除。
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 8,
            background: "var(--accent)", color: "white", textDecoration: "none",
            fontWeight: 600, fontSize: 14,
          }}
        >
          ← 返回首页
        </Link>
      </div>
    );
  }

  if (!project) return <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 80 }}>加载中...</div>;

  const imageAssets = assets.filter((a) => a.type === "image");
  const audioAssets = assets.filter((a) => a.type === "audio");
  const videoAssets = assets.filter((a) => a.type === "video");

  return (
    <div className="animate-fade-in">
      {/* Toast 提示 */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontSize: 14,
          maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          background: toast.type === "error" ? "var(--error)" : toast.type === "success" ? "var(--success)" : "var(--accent)",
          color: "white",
        }}>
          {toast.text}
        </div>
      )}

      {/* 返回首页链接 */}
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)", textDecoration: "none", marginBottom: 16 }}>
        ← 返回首页
      </Link>

      {/* 项目头部 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{project.title}</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {project.genre && <span className="tag tag-genre">{project.genre}</span>}
            <span className="tag tag-status">{project.status}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{project.style}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {project.status === "draft" && (
            <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "⏳ 分析中..." : "🧠 分析剧本"}
            </button>
          )}
          {project.status === "analyzed" && (
            <button className="btn-primary" onClick={() => handleRunPipeline("images")} disabled={pipeline?.isRunning}>
              {pipeline?.isRunning ? "⏳ 生成中..." : "🚀 一键生成"}
            </button>
          )}
        </div>
      </div>

      {/* ==================== 管线仪表盘 ==================== */}
      {pipeline && pipeline.steps.some((s) => s.status !== "pending") && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>🔧 生产管线</h3>
            <span style={{ fontSize: 13, color: pipeline.isRunning ? "var(--warning)" : "var(--success)" }}>
              {pipeline.isRunning ? "⏳ 运行中..." : pipeline.overallProgress >= 100 ? "✅ 完成" : "⏸️ 暂停"}
            </span>
          </div>
          {/* 总进度条 */}
          <div style={{ width: "100%", height: 8, background: "var(--bg)", borderRadius: 4, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ width: `${pipeline.overallProgress}%`, height: "100%", background: "var(--accent)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
          {/* 步骤列表 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {pipeline.steps.filter((s) => s.step !== "done").map((step) => (
              <div key={step.step} style={{
                padding: 12, borderRadius: 10,
                background: step.status === "running" ? "rgba(124,92,252,0.08)" : step.status === "done" ? "rgba(34,197,94,0.08)" : step.status === "error" ? "rgba(239,68,68,0.08)" : "var(--bg)",
                border: `1px solid ${step.status === "running" ? "var(--accent)" : step.status === "done" ? "var(--success)" : step.status === "error" ? "var(--error)" : "var(--border)"}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {STEP_ICONS[step.step]} {STEP_LABELS[step.step]}
                </div>
                <div style={{ width: "100%", height: 4, background: "var(--bg)", borderRadius: 2, marginBottom: 4, overflow: "hidden" }}>
                  <div style={{ width: `${step.progress}%`, height: "100%", background: step.status === "error" ? "var(--error)" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {step.message || (step.status === "done" ? "完成" : "等待中")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { icon: "👤", label: "角色", count: project.characters.length },
          { icon: "🎬", label: "场景", count: project.scenes.length },
          { icon: "📐", label: "分镜", count: project.panels.length },
          { icon: "🖼️", label: "图片", count: imageAssets.length },
          { icon: "🎵", label: "音频", count: audioAssets.length },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: 14 }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.count}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 标签页切换 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-card)", borderRadius: 10, padding: 4 }}>
        {[
          { id: "storyboard" as const, label: "📐 分镜列表" },
          { id: "characters" as const, label: "👤 角色" },
          { id: "timeline" as const, label: "⏱️ 时间轴" },
          { id: "export" as const, label: "📦 导出" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === t.id ? "var(--accent)" : "transparent",
            color: tab === t.id ? "white" : "var(--text-muted)",
            fontSize: 13, fontWeight: 600, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ==================== 分镜列表 ==================== */}
      {tab === "storyboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {project.panels.map((panel, i) => (
            <div key={panel.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>#{i + 1}</span>
                <span style={{ fontSize: 11, color: panel.status === "done" ? "var(--success)" : panel.status === "error" ? "var(--error)" : "var(--text-muted)" }}>
                  {panel.camera} · {panel.duration}s
                </span>
              </div>
              {/* 图片预览 */}
              <div style={{ width: "100%", height: 160, borderRadius: 8, background: "var(--bg)", marginBottom: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {panel.imageUrl ? (
                  <img src={panel.imageUrl} alt={`分镜 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {panel.status === "error" ? "❌ 生成失败" : "⏳ 待生成"}
                  </span>
                )}
              </div>
              {/* 台词/旁白 */}
              {panel.dialogue && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>💬</strong> {panel.dialogue}</div>}
              {panel.narration && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>📖 {panel.narration}</div>}
              {/* Prompt */}
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {panel.prompt}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== 角色列表 ==================== */}
      {tab === "characters" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {project.characters.map((char) => (
            <div key={char.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                  {char.name[0]}
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: 16 }}>{char.name}</h4>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>{char.personality}</p>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>{char.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== 时间轴视图 ==================== */}
      {tab === "timeline" && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>⏱️ 分镜时间轴</h3>
          <div style={{ display: "flex", gap: 2, overflowX: "auto", padding: "10px 0" }}>
            {project.panels.map((panel, i) => (
              <div key={panel.id} style={{
                minWidth: panel.duration * 80, height: 80, borderRadius: 6,
                background: panel.imageUrl ? `url(${panel.imageUrl}) center/cover` : "var(--bg)",
                border: "1px solid var(--border)", display: "flex", flexDirection: "column",
                justifyContent: "flex-end", padding: 6, position: "relative", flexShrink: 0,
              }}>
                <div style={{ position: "absolute", top: 4, left: 6, fontSize: 10, background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4, color: "white" }}>
                  #{i + 1} · {panel.duration}s
                </div>
                <div style={{ fontSize: 10, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {panel.dialogue || panel.narration || panel.transition}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
            总时长: {project.panels.reduce((s, p) => s + (p.duration || 3), 0)}秒 · {project.panels.length} 个分镜
          </div>
        </div>
      )}

      {/* ==================== 导出系统 ==================== */}
      {tab === "export" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {[
            { icon: "🖼️", title: "PNG 分镜序列", desc: "导出每格分镜为高清 PNG", action: () => showToast("info", "🖼️ 导出 PNG 功能开发中") },
            { icon: "📄", title: "PDF 漫画", desc: "生成可打印的 PDF 漫画书", action: () => showToast("info", "📄 导出 PDF 功能开发中") },
            { icon: "🎬", title: "MP4 视频", desc: "合成含配音和 BGM 的视频", action: () => handleRunPipeline("composition") },
            { icon: "🎞️", title: "GIF 动图", desc: "生成可分享的 GIF 预览", action: () => showToast("info", "🎞️ 导出 GIF 功能开发中") },
            { icon: "📋", title: "JSON 数据", desc: "导出完整项目数据备份", action: () => { const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${project.title}.json`; a.click(); } },
            { icon: "📝", title: "Markdown 剧本", desc: "导出为 Markdown 格式剧本", action: () => { const md = `# ${project.title}\n\n${project.panels.map((p, i) => `## 分镜 ${i + 1}\n${p.narration || ""}\n${p.dialogue ? `> ${p.dialogue}` : ""}\n`).join("\n")}`; const blob = new Blob([md], { type: "text/markdown" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${project.title}.md`; a.click(); } },
          ].map((item) => (
            <div key={item.title} className="card" style={{ cursor: "pointer", padding: 20 }} onClick={item.action}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{item.icon}</div>
              <h4 style={{ margin: "0 0 4px", fontSize: 15 }}>{item.title}</h4>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ==================== 视频预览浮层 ==================== */}
      {previewAsset && (
        <div onClick={() => setPreviewAsset(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "80vh" }}>
            {previewAsset.type === "video" ? (
              <video src={previewAsset.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12 }} />
            ) : previewAsset.type === "image" ? (
              <img src={previewAsset.url} alt={previewAsset.name} style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12 }} />
            ) : previewAsset.type === "audio" ? (
              <div style={{ background: "var(--bg-card)", padding: 40, borderRadius: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                <audio src={previewAsset.url} controls autoPlay />
                <p style={{ marginTop: 12, color: "var(--text-muted)" }}>{previewAsset.name}</p>
              </div>
            ) : null}
          </div>
          <button onClick={() => setPreviewAsset(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 24, cursor: "pointer", borderRadius: "50%", width: 40, height: 40 }}>✕</button>
        </div>
      )}
    </div>
  );
}
