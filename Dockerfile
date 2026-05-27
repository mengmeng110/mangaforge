FROM node:20-bookworm

# 安装 FFmpeg 和构建工具
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

# 锁定 pnpm 版本
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

# 复制依赖配置文件（必须包含 pnpm-workspace.yaml 的 allowBuilds）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装依赖
RUN pnpm install

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 构建
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动
CMD ["pnpm", "start"]
