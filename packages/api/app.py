"""FastAPI backend for PDF table extraction — pure JSON API."""

import asyncio
import json
import logging
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.requests import Request
from supabase import create_client

from auth import get_current_user

logger = logging.getLogger(__name__)

# Add the agent package to the path
PACKAGES_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(PACKAGES_DIR / "agent"))

app = FastAPI(title="PDF Table Extractor API")

# CORS — allow the Next.js frontend (local + deployed)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_origins = [FRONTEND_URL, "http://localhost:3000"]
# Also allow any Netlify deploy previews
_origins = [o for o in _origins if o] + [
    o for o in os.environ.get("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _mark_stale_runs():
    """Mark any runs stuck in processing/pending as failed after server restart."""
    try:
        sb = get_supabase()
        for status in ("processing", "pending"):
            sb.table("agent_task_runs").update(
                {
                    "status": "failed",
                    "error_message": "Server restarted during processing. Use Retry to rerun.",
                    "progress_message": "Failed — server restarted",
                }
            ).eq("status", status).execute()
        logger.info("Marked stale runs as failed")
    except Exception:
        logger.exception("Failed to clean up stale runs on startup")


# Supabase client (service role for server-side queries)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")


def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


# ---------------------------------------------------------------------------
# Helper: get user's organization_id
# ---------------------------------------------------------------------------


def _get_user_org_id(supabase, user_id: str) -> str:
    res = (
        supabase.table("users")
        .select("organization_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not res.data or not res.data.get("organization_id"):
        raise HTTPException(status_code=403, detail="User has no organization")
    return res.data["organization_id"]


# ---------------------------------------------------------------------------
# Models + Health
# ---------------------------------------------------------------------------

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")


OLLAMA_CLOUD_MODELS = [
    {"id": "qwen3-vl:235b-cloud", "name": "Qwen3 VL 235B", "provider": "ollama", "vision": True},
    {"id": "deepseek-v3.1:671b-cloud", "name": "DeepSeek V3.1 671B", "provider": "ollama", "vision": False},
    {"id": "qwen3-coder:480b-cloud", "name": "Qwen3 Coder 480B", "provider": "ollama", "vision": False},
    {"id": "gpt-oss:120b-cloud", "name": "GPT-OSS 120B", "provider": "ollama", "vision": False},
    {"id": "gpt-oss:20b-cloud", "name": "GPT-OSS 20B", "provider": "ollama", "vision": False},
    {"id": "minimax-m2:cloud", "name": "MiniMax M2", "provider": "ollama", "vision": False},
    {"id": "glm-4.6:cloud", "name": "GLM 4.6", "provider": "ollama", "vision": False},
]


async def _list_ollama_models() -> list[dict]:
    """List models available from the connected Ollama instance."""
    import httpx

    results = []
    # Fetch locally pulled models
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
            resp.raise_for_status()
            models = resp.json().get("models", [])
            for m in models:
                # Check vision capability from model families
                families = m.get("details", {}).get("families", []) or []
                vision = any(
                    f in families for f in ("clip", "llava", "mllama")
                )
                # Also detect by model name patterns
                if not vision:
                    name_lower = m["name"].lower()
                    vision = any(
                        tag in name_lower
                        for tag in ("vision", "-vl", "llava", "bakllava", "moondream")
                    )
                results.append(
                    {
                        "id": m["name"],
                        "name": m["name"],
                        "provider": "ollama",
                        "vision": vision,
                    }
                )
    except Exception:
        pass

    # Add cloud models that aren't already listed locally
    local_ids = {r["id"] for r in results}
    for cm in OLLAMA_CLOUD_MODELS:
        if cm["id"] not in local_ids:
            results.append(cm)

    return results


async def _list_gemini_models() -> list[dict]:
    """List Gemini models available via Google AI."""
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return []
    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        result = await client.aio.models.list()
        models = []
        async for m in result:
            # Only include models that support generateContent
            if hasattr(m, "supported_actions") and m.supported_actions:
                if "generateContent" not in m.supported_actions:
                    continue
            # Detect vision capability
            name_lower = (m.name or "").lower()
            # Gemini 1.5+, 2.x, 3.x models are multimodal (vision)
            # Gemma, TTS, robotics, deep-research are not
            vision = bool(
                re.search(r"gemini-(1\.5|2|3)", name_lower)
                and "tts" not in name_lower
                and "robotics" not in name_lower
                and "deep-research" not in name_lower
            )
            models.append(
                {
                    "id": m.name,
                    "name": m.display_name or m.name,
                    "provider": "gemini",
                    "vision": vision,
                }
            )
        return models
    except Exception:
        return []


@app.get("/api/models")
async def list_models():
    """List available models from all connected providers."""
    ollama_models = await _list_ollama_models()
    gemini_models = await _list_gemini_models()

    providers = []
    if gemini_models:
        providers.append({"name": "gemini", "label": "Google Gemini", "models": gemini_models})
    if ollama_models:
        providers.append({"name": "ollama", "label": "Ollama", "models": ollama_models})

    return {"providers": providers}


@app.get("/api/health/model")
async def model_health():
    """Check which providers are reachable."""
    ollama_models = await _list_ollama_models()
    gemini_models = await _list_gemini_models()

    providers = []
    if gemini_models:
        providers.append({"name": "gemini", "ok": True, "model_count": len(gemini_models)})
    if ollama_models:
        providers.append({"name": "ollama", "ok": True, "model_count": len(ollama_models)})

    if not providers:
        return {"ok": False, "message": "No model providers available", "providers": []}

    return {"ok": True, "message": f"{len(providers)} provider(s) connected", "providers": providers}


# ---------------------------------------------------------------------------
# Templates CRUD
# ---------------------------------------------------------------------------


@app.get("/api/templates")
async def list_templates(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    res = (
        sb.table("extraction_templates")
        .select("*")
        .eq("organization_id", org_id)
        .order("created_at")
        .execute()
    )
    return res.data


@app.get("/api/templates/{template_id}")
async def get_template(
    template_id: str, user: dict = Depends(get_current_user)
):
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    res = (
        sb.table("extraction_templates")
        .select("*")
        .eq("id", template_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return res.data


@app.post("/api/templates")
async def create_template(
    request: Request, user: dict = Depends(get_current_user)
):
    body = await request.json()
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    data = {
        "organization_id": org_id,
        "name": body["name"],
        "headers": body["headers"],
        "header_marker": body["header_marker"],
        "stop_marker": body.get("stop_marker", ""),
        "created_by": user["id"],
    }
    res = sb.table("extraction_templates").insert(data).execute()
    return res.data[0] if res.data else {}


@app.put("/api/templates/{template_id}")
async def update_template(
    template_id: str, request: Request, user: dict = Depends(get_current_user)
):
    body = await request.json()
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    data = {
        "name": body["name"],
        "headers": body["headers"],
        "header_marker": body["header_marker"],
        "stop_marker": body.get("stop_marker", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = (
        sb.table("extraction_templates")
        .update(data)
        .eq("id", template_id)
        .eq("organization_id", org_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return res.data[0]


@app.delete("/api/templates/{template_id}")
async def delete_template(
    template_id: str, user: dict = Depends(get_current_user)
):
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    sb.table("extraction_templates").delete().eq("id", template_id).eq(
        "organization_id", org_id
    ).execute()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Convert — background task with DB progress updates
# ---------------------------------------------------------------------------


async def _run_extraction(
    run_id: str,
    org_id: str,
    pdf_storage_path: str,
    pdf_filename: str,
    xlsx_filename: str,
    template: dict,
    user_provider: str | None,
    user_model: str | None,
):
    """Background extraction task. Downloads PDF from Storage, processes it,
    uploads XLSX result. Updates agent_task_runs in DB for Realtime."""
    sb = get_supabase()

    def _update_progress(pct: int, message: str, **extra):
        data = {
            "progress_pct": pct,
            "progress_message": message,
            **extra,
        }
        sb.table("agent_task_runs").update(data).eq("id", run_id).execute()

    try:
        _update_progress(0, "Starting extraction...", status="processing")

        from table_extractor.prompt import build_extraction_prompt
        from table_extractor.tools import (
            _call_vision_model,
            _extract_json_array,
            _render_page_to_base64,
            _write_xlsx,
        )

        import pdfplumber

        # Download PDF from Supabase Storage
        pdf_bytes = sb.storage.from_("results").download(pdf_storage_path)

        tmp_dir = Path(tempfile.mkdtemp())
        pdf_path = tmp_dir / pdf_filename
        xlsx_path = tmp_dir / xlsx_filename
        pdf_path.write_bytes(pdf_bytes)

        headers_list = template["headers"]
        prompt = build_extraction_prompt(
            headers_list, template["header_marker"], template.get("stop_marker", "")
        )
        num_cols = len(headers_list)
        all_rows: list[list[str]] = []

        with pdfplumber.open(str(pdf_path)) as pdf:
            page_count = len(pdf.pages)
            _update_progress(5, f"Processing {page_count} page(s)...")

            for i, page in enumerate(pdf.pages):
                page_num = i + 1
                percent = 5 + int(85 * page_num / page_count)
                _update_progress(percent, f"Processing page {page_num}/{page_count}...")

                image_b64 = _render_page_to_base64(page)
                response = await _call_vision_model(
                    image_b64, prompt, provider=user_provider, model=user_model
                )
                rows = _extract_json_array(response)

                for row in rows:
                    if len(row) < num_cols:
                        row.extend([""] * (num_cols - len(row)))
                    elif len(row) > num_cols:
                        row = row[:num_cols]
                    all_rows.append(row)

        _update_progress(92, "Generating XLSX...")
        _write_xlsx(headers_list, all_rows, str(xlsx_path))

        # Upload XLSX to Supabase Storage
        _update_progress(95, "Uploading result...")
        xlsx_storage_path = f"{org_id}/{run_id}.xlsx"
        xlsx_bytes = xlsx_path.read_bytes()
        sb.storage.from_("results").upload(
            xlsx_storage_path,
            xlsx_bytes,
            {"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        )

        # Mark completed
        sb.table("agent_task_runs").update(
            {
                "status": "completed",
                "progress_pct": 100,
                "progress_message": f"Done! Extracted {len(all_rows)} rows from {page_count} page(s).",
                "row_count": len(all_rows),
                "page_count": page_count,
                "file_url": xlsx_storage_path,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", run_id).execute()

        # Delete source PDF from Storage (no longer needed after success)
        try:
            sb.storage.from_("results").remove([pdf_storage_path])
            sb.table("agent_task_runs").update(
                {"pdf_url": None}
            ).eq("id", run_id).execute()
        except Exception:
            pass

        # Cleanup temp files
        try:
            for f in tmp_dir.iterdir():
                f.unlink()
            tmp_dir.rmdir()
        except Exception:
            pass

    except Exception as e:
        logger.exception("Extraction failed for run %s", run_id)
        sb.table("agent_task_runs").update(
            {
                "status": "failed",
                "error_message": str(e),
                "progress_message": f"Error: {e}",
            }
        ).eq("id", run_id).execute()


@app.post("/api/convert")
async def convert(
    request: Request,
    file: UploadFile = File(...),
    template_id: str = Form(...),
    user: dict = Depends(get_current_user),
):
    """Start conversion as a background task. Returns run_id immediately."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])

    # Load template
    tmpl_res = (
        sb.table("extraction_templates")
        .select("*")
        .eq("id", template_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    if not tmpl_res.data:
        raise HTTPException(status_code=400, detail="Template not found.")

    tmpl = tmpl_res.data
    pdf_bytes = await file.read()
    xlsx_filename = Path(file.filename).stem + ".xlsx"

    # Load user's model preferences
    settings_res = (
        sb.table("user_settings")
        .select("*")
        .eq("user_id", user["id"])
        .execute()
    )
    user_provider = None
    user_model = None
    if settings_res.data and len(settings_res.data) > 0:
        s = settings_res.data[0]
        user_provider = s.get("llm_provider")
        user_model = s.get("model_name")

    # Create a task run record (pending)
    run_data = {
        "user_id": user["id"],
        "organization_id": org_id,
        "template_id": template_id,
        "file_name": file.filename,
        "status": "pending",
        "progress_pct": 0,
        "progress_message": "Uploading PDF...",
    }
    run_res = sb.table("agent_task_runs").insert(run_data).execute()
    run_id = run_res.data[0]["id"]

    # Upload PDF to Supabase Storage (persists across server restarts)
    pdf_storage_path = f"{org_id}/{run_id}.pdf"
    sb.storage.from_("results").upload(
        pdf_storage_path,
        pdf_bytes,
        {"content-type": "application/pdf"},
    )

    # Store the PDF path in the run record
    sb.table("agent_task_runs").update(
        {"pdf_url": pdf_storage_path, "progress_message": "Queued..."}
    ).eq("id", run_id).execute()

    # Spawn background task
    asyncio.create_task(
        _run_extraction(
            run_id=run_id,
            org_id=org_id,
            pdf_storage_path=pdf_storage_path,
            pdf_filename=file.filename,
            xlsx_filename=xlsx_filename,
            template=tmpl,
            user_provider=user_provider,
            user_model=user_model,
        )
    )

    return {"run_id": run_id}


# ---------------------------------------------------------------------------
# Download — from Supabase Storage
# ---------------------------------------------------------------------------


@app.get("/api/download/{run_id}")
async def download(run_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])

    # Verify the run belongs to the user's org
    res = (
        sb.table("agent_task_runs")
        .select("file_url, file_name, status")
        .eq("id", run_id)
        .eq("organization_id", org_id)
        .execute()
    )
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Run not found.")

    run = res.data[0]
    if run["status"] != "completed" or not run.get("file_url"):
        raise HTTPException(status_code=404, detail="File not available yet.")

    # Download from Supabase Storage
    xlsx_bytes = sb.storage.from_("results").download(run["file_url"])

    filename = Path(run["file_name"]).stem + ".xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Runs (history)
# ---------------------------------------------------------------------------


@app.get("/api/runs")
async def list_runs(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    res = (
        sb.table("agent_task_runs")
        .select("*, extraction_templates(name)")
        .eq("organization_id", org_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    runs = []
    for r in res.data:
        tmpl = r.pop("extraction_templates", None)
        r["template_name"] = tmpl["name"] if tmpl else None
        runs.append(r)
    return runs


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])
    res = (
        sb.table("agent_task_runs")
        .select("*, extraction_templates(name)")
        .eq("id", run_id)
        .eq("organization_id", org_id)
        .execute()
    )
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Run not found.")
    r = res.data[0]
    tmpl = r.pop("extraction_templates", None)
    r["template_name"] = tmpl["name"] if tmpl else None
    return r


@app.post("/api/runs/{run_id}/retry")
async def retry_run(run_id: str, user: dict = Depends(get_current_user)):
    """Retry a failed run using the stored PDF from Supabase Storage."""
    sb = get_supabase()
    org_id = _get_user_org_id(sb, user["id"])

    res = (
        sb.table("agent_task_runs")
        .select("*, extraction_templates(*)")
        .eq("id", run_id)
        .eq("organization_id", org_id)
        .execute()
    )
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Run not found.")

    run = res.data[0]
    if run["status"] not in ("failed",):
        raise HTTPException(status_code=400, detail="Only failed runs can be retried.")
    if not run.get("pdf_url"):
        raise HTTPException(status_code=400, detail="Source PDF not available for retry.")

    tmpl = run.get("extraction_templates")
    if not tmpl:
        raise HTTPException(status_code=400, detail="Template no longer exists.")

    # Load user's model preferences
    settings_res = (
        sb.table("user_settings")
        .select("*")
        .eq("user_id", user["id"])
        .execute()
    )
    user_provider = None
    user_model = None
    if settings_res.data and len(settings_res.data) > 0:
        s = settings_res.data[0]
        user_provider = s.get("llm_provider")
        user_model = s.get("model_name")

    # Reset run state
    sb.table("agent_task_runs").update(
        {
            "status": "pending",
            "progress_pct": 0,
            "progress_message": "Queued for retry...",
            "error_message": None,
            "file_url": None,
            "row_count": None,
            "page_count": None,
            "completed_at": None,
        }
    ).eq("id", run_id).execute()

    # Delete old XLSX result if it exists
    xlsx_path = f"{org_id}/{run_id}.xlsx"
    try:
        sb.storage.from_("results").remove([xlsx_path])
    except Exception:
        pass

    xlsx_filename = Path(run["file_name"]).stem + ".xlsx"

    asyncio.create_task(
        _run_extraction(
            run_id=run_id,
            org_id=org_id,
            pdf_storage_path=run["pdf_url"],
            pdf_filename=run["file_name"],
            xlsx_filename=xlsx_filename,
            template=tmpl,
            user_provider=user_provider,
            user_model=user_model,
        )
    )

    return {"run_id": run_id}


# ---------------------------------------------------------------------------
# User settings
# ---------------------------------------------------------------------------


@app.get("/api/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("user_settings")
        .select("*")
        .eq("user_id", user["id"])
        .execute()
    )
    if res.data and len(res.data) > 0:
        return res.data[0]
    return {
        "user_id": user["id"],
        "llm_provider": "gemini",
        "model_name": None,
        "default_template_id": None,
    }


@app.put("/api/settings")
async def update_settings(
    request: Request, user: dict = Depends(get_current_user)
):
    body = await request.json()
    sb = get_supabase()
    data = {
        "user_id": user["id"],
        "llm_provider": body.get("llm_provider", "gemini"),
        "model_name": body.get("model_name"),
        "default_template_id": body.get("default_template_id"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = sb.table("user_settings").upsert(data).execute()
    return res.data[0] if res.data else data


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
