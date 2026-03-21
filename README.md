# PDF Table Extractor

Extract table data from any PDF into sortable XLSX spreadsheets. Uses AI vision models (Google Gemini or local Ollama) to read tables from scanned or digital PDFs.

## Quick Start

### Prerequisites

- Python 3.13+ with [uv](https://docs.astral.sh/uv/)
- Node.js 22+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
# Clone and install
git clone <repo-url> && cd pdf-xlsx-converter
uv sync
npm install

# Configure environment
cp .env.example .env
# Fill in your Supabase keys, LLM provider config, etc.

# Push database schema
cd packages/db && npm run db:push && cd ../..

# Apply RLS policies (run seed.sql in Supabase SQL Editor)
# See packages/db/src/seed.sql
```

### Run

```bash
# Terminal 1: FastAPI backend
uv run python packages/api/app.py

# Terminal 2: Next.js frontend
cd packages/web && npm run dev
```

Open http://localhost:3000 in your browser.

## Usage

1. Sign in with Google or email/password
2. Create an extraction template (Templates page) — define the column headers and table markers for your PDF type
3. Go to Convert, select a template, drag & drop your PDF
4. Watch the progress bar as each page is processed
5. The XLSX file downloads automatically when done

## Docker

```bash
docker build -t pdf-table-extractor \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 .

docker run -p 8000:8000 -p 3000:3000 --env-file .env pdf-table-extractor
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `gemini` | `gemini` or `ollama` |
| `GOOGLE_API_KEY` | — | Required for Gemini |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model name |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3-vl:8b` | Ollama vision model |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase anon key |
| `SUPABASE_SECRET_KEY` | — | Supabase service role key |
| `SUPABASE_JWT_SIGNING_KEY` | — | JWT signing key |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PORT` | `8000` | FastAPI server port |

## System Requirements

- Python 3.13+
- Node.js 22+
- For Ollama: 8 GB RAM minimum, GPU recommended
- For Gemini: just an API key
