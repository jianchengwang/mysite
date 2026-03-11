from typing import Optional

from fastapi import Header, HTTPException, Query

from core.config import get_settings


async def require_backend_key(
    x_backend_key: Optional[str] = Header(default=None, alias="X-Backend-Key"),
    backend_key: Optional[str] = Query(default=None)
) -> None:
    settings = get_settings()
    expected_key = (settings.BACKEND_ACCESS_KEY or "").strip()

    if not expected_key:
        return

    provided_key = (x_backend_key or backend_key or "").strip()
    if provided_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid backend key.")
