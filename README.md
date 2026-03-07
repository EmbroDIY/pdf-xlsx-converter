# PDF to XLSX Converter

Convert supplier PDF tables into sortable XLSX spreadsheets. Runs locally on your computer — no cloud services or AI needed.

## Windows Setup (one-time)

1. **Install Python 3.13+** — download from https://python.org
   During installation, check **"Add Python to PATH"**
2. **Install uv** — open Command Prompt and run:
   ```
   pip install uv
   ```
3. **Download this project** — unzip the folder somewhere (e.g. Desktop)

After that, just double-click **`start.bat`** to run the app. A browser window will open automatically.

## Usage

1. Double-click **`start.bat`** — the app opens in your browser
2. Select a supplier from the dropdown
3. Drag & drop the PDF (or click to browse)
4. The XLSX file downloads automatically

To stop the app, close the black terminal window.

## Managing Supplier Profiles

Each supplier's PDF has a different table layout. A **profile** tells the converter where to find the data.

Click **"Manage suppliers"** in the app to create or edit profiles.

### Creating a Profile

Open one of the supplier's PDFs and look at the table:

1. **Supplier name** — the supplier's name (e.g. "Gunnar V. Jorgensen")
2. **Header marker** — a word from the table's header row (e.g. `Dyrnr.`). The converter starts reading data from the line after this text.
3. **Stop marker** — text that appears right after the table ends (e.g. `Bemærkning`). Leave empty to read until end of page.
4. **Column headers** — list each column name on its own line, in the same order as the PDF. The number of columns tells the converter how to split each row.
5. **OCR** — check this only if the PDF is a scanned image (not normal text)

## OCR Setup (optional — for scanned PDFs)

Only needed if a supplier sends scanned image PDFs instead of normal text PDFs.

### Windows

1. Download and install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki
2. During installation, select **Danish** in the language list
3. Make sure "Add to PATH" is checked
4. Run in Command Prompt:
   ```
   uv sync --extra ocr
   ```

### Linux / WSL

```bash
sudo apt install tesseract-ocr tesseract-ocr-dan
uv sync --extra ocr
```

## Developer Notes

```bash
# Install dependencies
uv sync

# Run the server
uv run python main.py
# Opens at http://localhost:8000
```

No tests or linting configured.
