"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

// 用变量拼接模块名，彻底阻止 webpack 静态分析
const M = ["@excalidraw", "/", "excalidraw"].join("");

const ExcalidrawWrapper = forwardRef(function ExcalidrawWrapper(
  { onChange, initialData }: { onChange?: (elements: any, state: any) => void; initialData?: any },
  ref
) {
  const [Comp, setComp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<any>(null);

  useImperativeHandle(ref, () => api);

  useEffect(() => {
    // eval 隐藏导入路径，webpack 无法静态分析
    const load = eval(`(function() { return function(m) { return import(m); }; })()`);
    load(M)
      .then((mod: any) => {
        setComp(() => mod.Excalidraw);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>正在加载画布引擎...</div>
        </div>
      </div>
    );
  }

  if (!Comp) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎨</div>
          <div>画布引擎未安装</div>
          <div style={{ fontSize: 12, marginTop: 8, color: "#666" }}>请安装 @excalidraw/excalidraw</div>
        </div>
      </div>
    );
  }

  return (
    <Comp
      initialData={initialData}
      onChange={onChange}
      excalidrawAPI={(api: any) => setApi(api)}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: true,
          export: true,
          loadScene: true,
          saveToActiveFile: true,
          toggleTheme: true,
        },
      }}
    />
  );
});

export default ExcalidrawWrapper;
