import tempfile
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

from converter import check_ollama_available, convert_pdf_to_xlsx
from profiles import SupplierProfile, delete_profile, list_profiles, load_profile, save_profile

app = FastAPI(title="PDF to XLSX Converter")

BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


# ---------------------------------------------------------------------------
# Convert page
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    profiles = list_profiles()
    return templates.TemplateResponse(request, "index.html", {"profiles": profiles})


@app.get("/health/ollama")
async def ollama_health():
    """Check if Ollama is running and the vision model is available."""
    ok, message = check_ollama_available()
    return {"ok": ok, "message": message}


@app.post("/convert")
async def convert(
    file: UploadFile = File(...),
    supplier: str = Form(...),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return HTMLResponse("Please upload a PDF file.", status_code=400)

    profile = load_profile(supplier)
    if not profile:
        return HTMLResponse(f"Supplier profile '{supplier}' not found.", status_code=400)

    # Check Ollama before starting conversion
    ok, message = check_ollama_available()
    if not ok:
        return HTMLResponse(f"Ollama error: {message}", status_code=503)

    xlsx_filename = Path(file.filename).stem + ".xlsx"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_dir = Path(tmp_dir)
        pdf_path = tmp_dir / file.filename
        xlsx_path = tmp_dir / xlsx_filename

        pdf_path.write_bytes(await file.read())
        convert_pdf_to_xlsx(pdf_path, xlsx_path, profile)

        xlsx_bytes = xlsx_path.read_bytes()

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{xlsx_filename}"'},
    )


# ---------------------------------------------------------------------------
# Supplier profile management
# ---------------------------------------------------------------------------

@app.get("/suppliers", response_class=HTMLResponse)
async def suppliers_page(request: Request):
    profiles = list_profiles()
    return templates.TemplateResponse(request, "suppliers.html", {"profiles": profiles})


@app.get("/suppliers/new", response_class=HTMLResponse)
async def new_supplier_page(request: Request):
    return templates.TemplateResponse(request, "supplier_form.html", {"profile": None})


@app.get("/suppliers/{name}/edit", response_class=HTMLResponse)
async def edit_supplier_page(request: Request, name: str):
    profile = load_profile(name)
    if not profile:
        return HTMLResponse("Profile not found.", status_code=404)
    return templates.TemplateResponse(request, "supplier_form.html", {"profile": profile})


@app.post("/suppliers/save")
async def save_supplier(
    name: str = Form(...),
    headers: str = Form(...),
    header_marker: str = Form(...),
    stop_marker: str = Form(""),
):
    header_list = [h.strip() for h in headers.split("\n") if h.strip()]
    if not header_list:
        return HTMLResponse("At least one header is required.", status_code=400)

    profile = SupplierProfile(
        name=name.strip(),
        headers=header_list,
        header_marker=header_marker.strip(),
        stop_marker=stop_marker.strip(),
    )
    save_profile(profile)
    return RedirectResponse("/suppliers", status_code=303)


@app.post("/suppliers/{name}/delete")
async def delete_supplier(name: str):
    delete_profile(name)
    return RedirectResponse("/suppliers", status_code=303)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
