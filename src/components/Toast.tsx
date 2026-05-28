"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** 用于内部计时 */
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let counter = 0;
const uid = () => `toast-${++counter}-${Date.now()}`;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  add: (type, message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: uid(), type, message, createdAt: Date.now() }],
    })),

  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

// ---------------------------------------------------------------------------
// 便捷 API —— 可在任何地方通过 import { toast } 直接调用
// ---------------------------------------------------------------------------

export const toast = {
  success: (message: string) => useToastStore.getState().add("success", message),
  error: (message: string) => useToastStore.getState().add("error", message),
  info: (message: string) => useToastStore.getState().add("info", message),
};

// ---------------------------------------------------------------------------
// Auto‑disappear hook
// ---------------------------------------------------------------------------

const DISMISS_MS = 3000;

function useAutoDismiss() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    if (toasts.length === 0) return;
    const now = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const t of toasts) {
      const remaining = DISMISS_MS - (now - t.createdAt);
      if (remaining <= 0) {
        remove(t.id);
      } else {
        timers.push(setTimeout(() => remove(t.id), remaining));
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);
}

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

const colorMap: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-400 dark:border-red-600",
    text: "text-red-700 dark:text-red-300",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-400 dark:border-blue-600",
    text: "text-blue-700 dark:text-blue-300",
  },
};

// ---------------------------------------------------------------------------
// Single Toast item
// ---------------------------------------------------------------------------

function ToastItem({ toast: t }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const colors = colorMap[t.type];

  return (
    <div
      role="alert"
      className={`
        relative flex items-start gap-3 w-80 p-4 pr-10
        rounded-lg border shadow-lg
        ${colors.bg} ${colors.border} ${colors.text}
        animate-[toast-in_0.25s_ease-out]
      `}
    >
      <span className="mt-0.5 shrink-0">{iconMap[t.type]}</span>
      <p className="text-sm leading-relaxed break-words flex-1">{t.message}</p>
      <button
        onClick={() => remove(t.id)}
        className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="关闭"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Container —— 放在根 layout 中
// ---------------------------------------------------------------------------

export function ToastContainer() {
  useAutoDismiss();

  const toasts = useToastStore((s) => s.toasts);

  return (
    <>
      {/* keyframe 定义 */}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* 固定右上角堆叠 */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </div>
    </>
  );
}
