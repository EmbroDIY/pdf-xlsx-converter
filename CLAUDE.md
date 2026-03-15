# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
uv sync

# Run the server (requires Ollama running separately)
uv run python main.py
# Server starts at http://localhost:8000

# Ollama must be running separately
ollama serve
# Override model via env var: OLLAMA_MODEL=some-model
```

There are no tests or linting configured.

## Architecture

This is a single-file FastAPI web app (`main.py`) with two supporting modules and a `profiles/` data directory.

**Request flow for conversion:**
1. User selects a supplier profile and uploads a PDF via the web UI
2. `POST /convert` in `main.py` checks Ollama availability, then calls `convert_pdf_to_xlsx()`
3. `converter.py` renders each PDF page as an image, sends it to the Ollama vision model with a structured prompt, and parses the JSON response into rows
4. The XLSX file is returned as a download response

**Key modules:**
- `converter.py` — PDF-to-image rendering (pdfplumber), Ollama vision API calls (httpx), JSON response parsing, and XLSX generation (openpyxl). The vision model receives the page image plus a prompt listing expected column headers and returns a JSON array of row arrays.
- `profiles.py` — `SupplierProfile` dataclass + JSON CRUD. Profiles are stored as JSON files in `profiles/` directory. The profile name is sanitized to create the filename.
- `main.py` — FastAPI routes for convert (`/`), Ollama health check (`/health/ollama`), supplier management (`/suppliers`), and static files. Uses Jinja2 templates from `templates/`.

**Supplier profile system:**
Each supplier PDF has a different table layout. A profile encodes:
- `header_marker`: substring that marks the start of the data table (used in the vision model prompt)
- `stop_marker`: optional substring marking end of table
- `headers`: ordered list of column names (sent to the vision model so it knows what columns to extract)

**Vision extraction approach:**
The converter uses Ollama with a vision model to extract tables:
1. Each PDF page is rendered to a PNG image
2. The image is sent to the vision model with a prompt that lists the expected column headers and extraction rules
3. The model returns a JSON array of arrays (one inner array per row)
4. The response is parsed, padded/trimmed to the expected column count, and written to XLSX
