# Render deployment — FastAPI backend only
FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
COPY packages/agent/ packages/agent/
COPY packages/api/ packages/api/
RUN uv sync --frozen --no-dev

EXPOSE 8000

ENV PORT=8000

CMD ["uv", "run", "python", "packages/api/app.py"]
