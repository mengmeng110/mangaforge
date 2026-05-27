FROM node:20-bookworm

# 安装 FFmpeg 和构建工具
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 用 npm 安装（国内镜像 + 重试 + 兼容 pnpm lockfile）
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --legacy-peer-deps

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动
CMD ["npm", "start"]
