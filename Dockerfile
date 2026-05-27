FROM node:20-bookworm

# 安装 FFmpeg 和构建工具
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

# 锁定 pnpm 版本，和 lockfile 匹配
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

# 先复制 package.json
COPY package.json ./

# 安装依赖（不冻结 lockfile，因为 Docker 环境可能有差异）
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
