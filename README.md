# PDF to XLSX Converter

Convert supplier PDF tables into sortable XLSX spreadsheets. Uses a local AI vision model (Ollama) to read tables from any PDF — scanned or digital.

## Windows Setup (one-time)

1. **Install Ollama** — download from https://ollama.com and run the installer
2. **Install Python 3.13+** — download from https://python.org
   During installation, check **"Add Python to PATH"**
3. **Install uv** — open Command Prompt and run:
   ```
   pip install uv
   ```
4. **Download this project** — unzip the folder somewhere (e.g. Desktop)

The app connects to Ollama for AI-powered table extraction.

After that, just double-click **`start.bat`** to run the app. A browser window will open automatically.

## Usage

1. Double-click **`start.bat`** — the app opens in your browser
2. Check the green status bar says "Ollama is running and ready"
3. Select a supplier from the dropdown
4. Drag & drop the PDF (or click to browse)
5. Wait for the conversion (may take up to a minute per page)
6. The XLSX file downloads automatically

To stop the app, close the black terminal window.

## Managing Supplier Profiles

Each supplier's PDF has a different table layout. A **profile** tells the converter what columns to look for.

Click **"Manage suppliers"** in the app to create or edit profiles.

### Creating a Profile

Open one of the supplier's PDFs and look at the table:

1. **Supplier name** — the supplier's name (e.g. "Gunnar V. Jorgensen")
2. **Header marker** — a word from the table's header row (e.g. `Dyrnr.`). The AI uses this to know where the table starts.
3. **Stop marker** — text that appears right after the table ends (e.g. `Bemærkning`). Leave empty to read until end of page.
4. **Column headers** — list each column name on its own line, in the same order as the PDF.

## System Requirements

- **Windows 10/11** (also works on macOS/Linux)
- **8 GB RAM minimum** (16 GB recommended)
- **~5 GB disk space** for the AI model
- A GPU is helpful but not required — the model runs on CPU too (just slower)

## Developer Notes

```bash
# Install dependencies
uv sync

# Run the server (Ollama must be running separately)
uv run python main.py
# Opens at http://localhost:8000

# Override the default model via environment variable
OLLAMA_MODEL=some-model uv run python main.py
```
