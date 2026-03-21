# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install Python dependencies
uv sync

# Install Node dependencies
npm install

# Run the FastAPI backend (port 8000)
uv run python packages/api/app.py

# Run the Next.js frontend (port 3000)
cd packages/web && npm run dev

# Database migrations (from packages/db/)
cd packages/db
npm run db:generate   # generate SQL from schema changes
npm run db:push       # push schema to Supabase (dev)
npm run db:pull       # introspect DB into schema
npm run db:migrate    # run pending migrations
npm run db:studio     # visual DB browser
```

There are no tests or linting configured.

## Architecture

Monorepo with four packages:

### `packages/agent/` — ADK Agent (Python)
- `table_extractor/__init__.py` — Agent definition using Google ADK. Model is selected via `LLM_PROVIDER` env var: Gemini (native) or Ollama via LiteLLM.
- `table_extractor/tools.py` — Two ADK FunctionTools:
  - `extract_table_from_pdf()` — renders PDF pages to images, sends each to vision model (direct httpx for Ollama, google.genai for Gemini), parses JSON response into rows
  - `save_to_xlsx()` — writes rows + headers to XLSX with auto-filter and column sizing
- `table_extractor/prompt.py` — builds the extraction prompt with column headers and markers

### `packages/api/` — FastAPI Backend (Python)
- `app.py` — JSON API: convert (SSE progress stream), template CRUD, run history, user settings, health check, file download. All endpoints require JWT auth except health check.
- `auth.py` — Supabase JWT validation via `SUPABASE_JWT_SIGNING_KEY`
- Uses `supabase-py` with `SUPABASE_SECRET_KEY` for server-side DB queries

### `packages/web/` — Next.js Frontend (TypeScript)
- No SSR — all pages use `"use client"`, data fetched client-side
- Shadcn UI components (`src/components/ui/`)
- Supabase Auth (Google OAuth + email/password) via `@supabase/ssr`
- Pages: `/login`, `/signup`, `/convert`, `/templates`, `/history`, `/settings`
- Talks to FastAPI via `src/lib/api.ts` with Bearer token auth

### `packages/db/` — Database Schema (TypeScript)
- Drizzle ORM schema (`src/schema.ts`): organizations, users, extraction_templates, agent_task_runs, user_settings
- RLS policies and auth trigger (`src/seed.sql`)
- Migrations in `drizzle/` directory

**Request flow for conversion:**
1. User signs in via Supabase Auth (Google OAuth or email/password)
2. User selects an extraction template and uploads a PDF
3. Frontend sends `POST /api/convert` with Bearer token, streams SSE progress events
4. Each PDF page is rendered to PNG, sent to the vision model with a structured prompt
5. The model returns a JSON array of row arrays, parsed and written to XLSX
6. Final SSE event includes a download URL; frontend triggers the download
7. Run is recorded in `agent_task_runs` table

## Environment Variables

```
SUPABASE_URL=...                  # Supabase project URL
SUPABASE_KEY=...                  # Anon/publishable key
SUPABASE_SECRET_KEY=...           # Service role key (server-side)
SUPABASE_JWT_SIGNING_KEY=...      # JWT validation
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=...                  # PostgreSQL connection (for Drizzle)
LLM_PROVIDER=gemini               # or "ollama"
GOOGLE_API_KEY=...                # required when LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3-vl:8b
PORT=8000
```
