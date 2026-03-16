"""Authentication for FastAPI using Supabase."""

import os

from fastapi import HTTPException, Request
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")


async def get_current_user(request: Request) -> dict:
    """Validate the Supabase access token via Supabase Auth API."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth_header[7:]
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
        user_response = sb.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "id": str(user.id),
            "email": user.email,
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
