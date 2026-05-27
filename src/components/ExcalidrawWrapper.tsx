"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import dynamic from "next/dynamic";

// 使用 next/dynamic 动态加载，webpack 正确处理打包和 chunk 分割
const ExcalidrawBase = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>正在加载画布引擎...</div>
        </div>
      </div>
    ),
  }
);

const ExcalidrawWrapper = forwardRef(function ExcalidrawWrapper(
  { onChange, initialData }: { onChange?: (elements: any, state: any) => void; initialData?: any },
  ref
) {
  const [api, setApi] = useState<any>(null);
  useImperativeHandle(ref, () => api);

  return (
    <ExcalidrawBase
      initialData={initialData}
      onChange={onChange}
      excalidrawAPI={(a: any) => setApi(a)}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: true,
          export: false,
          loadScene: true,
          saveToActiveFile: true,
          toggleTheme: true,
        },
      }}
    />
  );
});

export default ExcalidrawWrapper;
