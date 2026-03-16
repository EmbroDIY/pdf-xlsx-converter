"""FastAPI backend for PDF table extraction — pure JSON API."""

import json
import os
import re
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.requests import Request
from sse_starlette.sse import EventSourceResponse
from supabase import create_client

from auth import get_current_user

# Add the agent package to the path
PACKAGES_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(PACKAGES_DIR / "agent"))

app = FastAPI(title="PDF Table Extractor API")

# CORS — allow the Next.js frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (service role for server-side queries)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")


def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


# Store completed XLSX files for async download
_results: dict[str, Path] = {}


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
# Convert
# ---------------------------------------------------------------------------


@app.post("/api/convert")
async def convert(
    request: Request,
    file: UploadFile = File(...),
    template_id: str = Form(...),
    user: dict = Depends(get_current_user),
):
    """Start conversion and stream progress via SSE."""
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
    headers_list = tmpl["headers"]
    pdf_bytes = await file.read()
    result_id = str(uuid.uuid4())
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

    # Create a task run record
    run_data = {
        "user_id": user["id"],
        "organization_id": org_id,
        "template_id": template_id,
        "file_name": file.filename,
        "status": "processing",
    }
    run_res = sb.table("agent_task_runs").insert(run_data).execute()
    run_id = run_res.data[0]["id"] if run_res.data else None

    async def event_stream():
        try:
            tmp_dir = Path(tempfile.mkdtemp())
            pdf_path = tmp_dir / file.filename
            xlsx_path = tmp_dir / xlsx_filename
            pdf_path.write_bytes(pdf_bytes)

            yield {
                "event": "progress",
                "data": json.dumps(
                    {
                        "stage": "starting",
                        "message": "Starting extraction...",
                        "percent": 0,
                    }
                ),
            }

            from table_extractor.prompt import build_extraction_prompt
            from table_extractor.tools import (
                _call_vision_model,
                _extract_json_array,
                _render_page_to_base64,
                _write_xlsx,
            )

            import pdfplumber

            prompt = build_extraction_prompt(
                headers_list, tmpl["header_marker"], tmpl.get("stop_marker", "")
            )
            num_cols = len(headers_list)
            all_rows: list[list[str]] = []

            with pdfplumber.open(str(pdf_path)) as pdf:
                page_count = len(pdf.pages)
                yield {
                    "event": "progress",
                    "data": json.dumps(
                        {
                            "stage": "processing",
                            "message": f"Processing {page_count} page(s)...",
                            "percent": 5,
                        }
                    ),
                }

                for i, page in enumerate(pdf.pages):
                    page_num = i + 1
                    percent = 5 + int(85 * page_num / page_count)
                    yield {
                        "event": "progress",
                        "data": json.dumps(
                            {
                                "stage": "processing",
                                "message": f"Processing page {page_num}/{page_count}...",
                                "percent": percent,
                            }
                        ),
                    }

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

            yield {
                "event": "progress",
                "data": json.dumps(
                    {
                        "stage": "saving",
                        "message": "Generating XLSX...",
                        "percent": 92,
                    }
                ),
            }
            _write_xlsx(headers_list, all_rows, str(xlsx_path))

            _results[result_id] = xlsx_path

            # Update run record
            if run_id:
                sb.table("agent_task_runs").update(
                    {
                        "status": "completed",
                        "row_count": len(all_rows),
                        "page_count": page_count,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("id", run_id).execute()

            yield {
                "event": "complete",
                "data": json.dumps(
                    {
                        "message": f"Done! Extracted {len(all_rows)} rows from {page_count} page(s).",
                        "percent": 100,
                        "download_url": f"/api/download/{result_id}",
                        "filename": xlsx_filename,
                    }
                ),
            }

        except Exception as e:
            if run_id:
                sb.table("agent_task_runs").update(
                    {
                        "status": "failed",
                        "error_message": str(e),
                    }
                ).eq("id", run_id).execute()
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(event_stream())


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------


@app.get("/api/download/{result_id}")
async def download(result_id: str, user: dict = Depends(get_current_user)):
    path = _results.pop(result_id, None)
    if not path or not path.exists():
        raise HTTPException(
            status_code=404, detail="Download expired or not found."
        )

    xlsx_bytes = path.read_bytes()
    filename = path.name

    try:
        parent = path.parent
        for f in parent.iterdir():
            f.unlink()
        parent.rmdir()
    except Exception:
        pass

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
