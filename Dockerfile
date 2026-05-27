FROM node:20-bookworm

# 安装 FFmpeg 和构建工具
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 用 pnpm 安装
RUN pnpm install --frozen-lockfile

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
