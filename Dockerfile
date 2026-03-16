# --- Stage 1: Build Next.js frontend ---
FROM node:22-slim AS web-build

WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/web/package.json packages/web/
COPY packages/db/package.json packages/db/
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY packages/web/ packages/web/
# Build requires NEXT_PUBLIC_* env vars at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
RUN cd packages/web && npx next build

# --- Stage 2: Python API ---
FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
COPY packages/agent/ packages/agent/
COPY packages/api/ packages/api/
RUN uv sync --frozen --no-dev

# Copy built Next.js app
COPY --from=web-build /app/packages/web packages/web
COPY --from=web-build /app/node_modules node_modules

EXPOSE 8000 3000

ENV LLM_PROVIDER=gemini
ENV PORT=8000

# Start both services
CMD sh -c "cd packages/web && npx next start -p 3000 & uv run python packages/api/app.py"
