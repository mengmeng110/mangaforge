FROM node:20-bookworm

RUN apt-get update && apt-get install -y ffmpeg python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml .pnpmrc.json ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN mkdir -p /app/data

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
