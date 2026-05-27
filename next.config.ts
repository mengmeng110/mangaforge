import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack: (config, { isServer }) => {
    // 客户端构建时，将 excalidraw 标记为外部依赖（运行时动态加载）
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // 忽略 excalidraw 模块解析错误（运行时动态加载）
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push(({ request }: { request: string }, callback: (err: Error | null, result?: string) => void) => {
        if (request === "@excalidraw/excalidraw") {
          return callback(null, "commonjs @excalidraw/excalidraw");
        }
        callback(null as any);
      });
    }
    return config;
  },
};

export default nextConfig;
