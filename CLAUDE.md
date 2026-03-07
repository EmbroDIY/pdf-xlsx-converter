# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
uv sync

# Run the server
uv run python main.py
# Server starts at http://localhost:8000

# Install with OCR support (requires tesseract binary)
uv sync --extra ocr
```

There are no tests or linting configured.

## Architecture

This is a single-file FastAPI web app (`main.py`) with two supporting modules and a `profiles/` data directory.

**Request flow for conversion:**
1. User selects a supplier profile and uploads a PDF via the web UI
2. `POST /convert` in `main.py` loads the profile and calls `convert_pdf_to_xlsx()`
3. `converter.py` routes based on profile: OCR → `extract_rows_ocr()`, text → `extract_rows_spatial()`
4. The XLSX file is returned as a download response

**Key modules:**
- `converter.py` — PDF parsing and XLSX generation. Uses spatial word positions (bounding boxes) to assign words to columns. For text PDFs, uses `pdfplumber.extract_words()`; for scanned PDFs, uses `pytesseract.image_to_data()`. Column boundaries are detected from the header row by grouping words into clusters via span-based merging.
- `profiles.py` — `SupplierProfile` dataclass + JSON CRUD. Profiles are stored as JSON files in `profiles/` directory. The profile name is sanitized to create the filename.
- `main.py` — FastAPI routes for convert (`/`), supplier management (`/suppliers`), and static files. Uses Jinja2 templates from `templates/`.

**Supplier profile system:**
Each supplier PDF has a different table layout. A profile encodes:
- `header_marker`: substring that marks the start of the data table (line containing it is skipped; data begins on next line)
- `stop_marker`: optional substring marking end of table
- `headers`: ordered list of column names (count determines how many tokens per row)
- `ocr`: whether to use Tesseract OCR (for scanned PDFs)

**Spatial extraction approach:**
Both `extract_rows_spatial()` (text PDFs) and `extract_rows_ocr()` (scanned PDFs) use the same pipeline: get word bounding boxes → group into lines by y-coordinate → detect column boundaries from header words (`_col_boundaries_from_header`) → assign words to columns by x-position (`_words_to_cells`). This handles empty cells, multi-word fields, and misaligned columns naturally.
