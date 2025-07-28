FROM oven/bun:1.2

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

CMD ["bun", "index.ts"]