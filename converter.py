"""PDF to XLSX converter using supplier profiles.

The profile defines:
- header_marker: text that appears on the line where table data starts
- headers: the column names to use in the XLSX
- stop_marker: text that signals end of table (optional)
- ocr: whether to use OCR for scanned PDFs
"""

from pathlib import Path

import pdfplumber
from openpyxl import Workbook
from openpyxl.utils import get_column_letter

from profiles import SupplierProfile


def _configure_tesseract(pytesseract) -> None:
    """Find tesseract binary on Windows if not already in PATH."""
    import shutil
    import sys

    if sys.platform != "win32" or shutil.which("tesseract"):
        return

    from pathlib import Path as P
    common_paths = [
        P(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
        P(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
    ]
    for p in common_paths:
        if p.exists():
            pytesseract.pytesseract.tesseract_cmd = str(p)
            return

    raise FileNotFoundError(
        "Tesseract not found. Install it from "
        "https://github.com/UB-Mannheim/tesseract/wiki "
        "or add it to your PATH."
    )


def write_xlsx(
    headers: list[str],
    rows: list[list[str]],
    output_path: str | Path,
) -> Path:
    """Write headers + rows to an XLSX file with auto-filter and sizing."""
    output_path = Path(output_path)
    wb = Workbook()
    ws = wb.active
    ws.title = "Data"

    # Headers
    for col, header in enumerate(headers, start=1):
        ws.cell(row=1, column=col, value=header)

    # Data
    for row_idx, row in enumerate(rows, start=2):
        for col_idx, value in enumerate(row, start=1):
            ws.cell(row=row_idx, column=col_idx).value = _maybe_number(value)

    # Auto-filter
    if rows:
        last_col = get_column_letter(len(headers))
        ws.auto_filter.ref = f"A1:{last_col}{len(rows) + 1}"

    # Auto-size columns
    for col_idx, header in enumerate(headers, start=1):
        max_width = len(str(header))
        for row in rows:
            if col_idx - 1 < len(row):
                max_width = max(max_width, len(str(row[col_idx - 1])))
        ws.column_dimensions[get_column_letter(col_idx)].width = min(max_width + 2, 50)

    if not rows:
        ws.cell(row=2, column=1, value="No matching rows found in this PDF.")

    wb.save(output_path)
    return output_path


def _maybe_number(value: str):
    """Try to convert a string to int or float."""
    if not value:
        return value
    cleaned = value.replace(" ", "").replace("\xa0", "")
    try:
        return int(cleaned)
    except ValueError:
        pass
    for attempt in [cleaned, cleaned.replace(",", ".")]:
        try:
            return float(attempt)
        except ValueError:
            pass
    return value


def extract_rows_spatial(pdf_path: str | Path, profile: SupplierProfile) -> list[list[str]]:
    """Extract data rows from a text-based PDF using pdfplumber word positions.

    Uses the same spatial column-boundary approach as OCR extraction,
    but reads word positions directly from the PDF (no Tesseract needed).
    """
    all_rows: list[list[str]] = []
    num_cols = len(profile.headers)

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pdf_words = page.extract_words()
            if not pdf_words:
                continue

            # Convert to (left, top, width, height, text) tuples
            words = [
                (w["x0"], w["top"], w["x1"] - w["x0"], w["bottom"] - w["top"], w["text"])
                for w in pdf_words
            ]
            lines = _group_words_into_lines(words)

            in_table = False
            col_bounds = None

            for i, line_words in enumerate(lines):
                line_text = " ".join(w[4] for w in line_words)

                if not in_table:
                    if profile.header_marker in line_text:
                        in_table = True
                        col_bounds = _col_boundaries_from_header(line_words, num_cols)
                    continue

                if profile.stop_marker and profile.stop_marker in line_text:
                    in_table = False
                    continue

                if col_bounds is None:
                    continue

                row = _words_to_cells(line_words, col_bounds)
                if _is_data_row(row, num_cols):
                    all_rows.append(row)

    return all_rows


def extract_rows_ocr(pdf_path: str | Path, profile: SupplierProfile) -> list[list[str]]:
    """Extract data rows from scanned PDF using OCR with spatial word positions.

    Instead of splitting plain text on whitespace (which loses column structure),
    this uses pytesseract's image_to_data to get word bounding boxes and assigns
    each word to the correct column based on x-coordinate.
    """
    try:
        import pytesseract
    except ImportError:
        raise RuntimeError("pytesseract is not installed. Run: uv sync --extra ocr")

    _configure_tesseract(pytesseract)

    all_rows: list[list[str]] = []
    num_cols = len(profile.headers)

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            img = page.to_image(resolution=400).original
            data = pytesseract.image_to_data(
                img, lang="dan", config="--psm 6",
                output_type=pytesseract.Output.DICT,
            )

            words = _parse_ocr_words(data)
            lines = _group_words_into_lines(words)

            in_table = False
            col_bounds = None
            pending: list[tuple] = []

            for i, line_words in enumerate(lines):
                line_text = " ".join(w[4] for w in line_words)

                if not in_table:
                    if profile.header_marker in line_text:
                        in_table = True
                        # Combine with the line above (upper part of two-line header)
                        # for better column position detection
                        combined = line_words
                        if i > 0:
                            combined = sorted(
                                lines[i - 1] + line_words, key=lambda w: w[0]
                            )
                        col_bounds = _col_boundaries_from_header(combined, num_cols)
                    continue

                if profile.stop_marker and profile.stop_marker in line_text:
                    if pending and col_bounds:
                        row = _words_to_cells(pending, col_bounds)
                        if _is_data_row(row, num_cols):
                            all_rows.append(row)
                    pending = []
                    in_table = False
                    continue

                if col_bounds is None:
                    continue

                # Orphan line (1-3 words): merge with pending row
                if len(line_words) <= 3 and pending:
                    pending.extend(line_words)
                    continue

                # Flush pending row
                if pending:
                    row = _words_to_cells(pending, col_bounds)
                    if _is_data_row(row, num_cols):
                        all_rows.append(row)

                pending = list(line_words)

            # Flush at end of page
            if pending and col_bounds:
                row = _words_to_cells(pending, col_bounds)
                if _is_data_row(row, num_cols):
                    all_rows.append(row)

    return all_rows


def _parse_ocr_words(data: dict) -> list[tuple]:
    """Parse pytesseract image_to_data dict into (left, top, width, height, text) tuples."""
    words = []
    for i in range(len(data["text"])):
        text = str(data["text"][i]).strip()
        conf = int(data["conf"][i])
        if conf <= 0 or not text:
            continue
        words.append((
            int(data["left"][i]),
            int(data["top"][i]),
            int(data["width"][i]),
            int(data["height"][i]),
            text,
        ))
    return words


def _group_words_into_lines(words: list[tuple]) -> list[list[tuple]]:
    """Group word tuples into lines by y-coordinate proximity."""
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: (w[1], w[0]))
    avg_height = sum(w[3] for w in sorted_words) / len(sorted_words)
    tolerance = avg_height * 0.5

    lines: list[list[tuple]] = []
    current = [sorted_words[0]]

    for w in sorted_words[1:]:
        if abs(w[1] - current[0][1]) <= tolerance:
            current.append(w)
        else:
            lines.append(sorted(current, key=lambda w: w[0]))
            current = [w]

    if current:
        lines.append(sorted(current, key=lambda w: w[0]))

    return lines


def _col_boundaries_from_header(words: list[tuple], num_cols: int) -> list[float] | None:
    """Determine column boundary x-positions from header line words.

    Groups header words into num_cols clusters by iteratively merging the
    adjacent pair that produces the smallest combined span (total width).
    Returns num_cols-1 boundary positions (left edge of each group except first).
    """
    if len(words) < num_cols:
        return None

    # Start with each word as its own group
    groups: list[list[tuple]] = [[w] for w in words]

    while len(groups) > num_cols:
        # Find adjacent pair whose merge produces the smallest total span
        best_idx = 0
        best_span = float("inf")
        for i in range(len(groups) - 1):
            left = groups[i][0][0]
            right_w = groups[i + 1][-1]
            span = right_w[0] + right_w[2] - left
            if span < best_span:
                best_span = span
                best_idx = i

        groups[best_idx] = groups[best_idx] + groups[best_idx + 1]
        del groups[best_idx + 1]

    # Boundary between col i and col i+1 is the left edge of group i+1
    boundaries = []
    for i in range(1, len(groups)):
        boundaries.append(float(groups[i][0][0]))

    return boundaries


def _words_to_cells(words: list[tuple], col_boundaries: list[float]) -> list[str]:
    """Assign words to columns based on boundary positions."""
    num_cols = len(col_boundaries) + 1
    cells: list[list[str]] = [[] for _ in range(num_cols)]

    for w in sorted(words, key=lambda w: w[0]):
        x_center = w[0] + w[2] / 2
        col = num_cols - 1
        for i, boundary in enumerate(col_boundaries):
            if x_center < boundary:
                col = i
                break
        cells[col].append(w[4])

    return [" ".join(parts) for parts in cells]


def _is_data_row(row: list[str], num_cols: int) -> bool:
    """Check if a row looks like actual data (not noise)."""
    non_empty = sum(1 for cell in row if cell.strip())
    return non_empty >= max(3, num_cols // 3)


def convert_pdf_to_xlsx(
    pdf_path: str | Path,
    output_path: str | Path,
    profile: SupplierProfile,
) -> Path:
    """Main entry point: convert a PDF to XLSX using a supplier profile."""
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)

    if profile.ocr:
        rows = extract_rows_ocr(pdf_path, profile)
    else:
        rows = extract_rows_spatial(pdf_path, profile)

    return write_xlsx(profile.headers, rows, output_path)
