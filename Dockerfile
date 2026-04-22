FROM oven/bun:1

WORKDIR /app

COPY package.json ./
COPY bun.lock ./

RUN bun install --frozen-lockfile

COPY backend ./backend
COPY frontend ./frontend
COPY cli.ts ./
COPY tsconfig.json ./

RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV ENABLE_FRONTEND=true
ENV DB_PATH=/app/data/xml-flatten.db

CMD ["bun", "run", "cli.ts", "server"]