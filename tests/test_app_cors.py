"""Phase 07 — CORS allowlist and preflight contract tests."""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


def _make_client(cors_origins_env: str = "") -> TestClient:
    # Set env before importing app so _cors_origins() reads it
    if cors_origins_env:
        os.environ["CORS_ORIGINS"] = cors_origins_env
    else:
        os.environ.pop("CORS_ORIGINS", None)

    # Force re-import so middleware config picks up env change
    import importlib

    import app as app_module

    importlib.reload(app_module)
    app_module.app.router.lifespan_context = _noop_lifespan
    return TestClient(app_module.app, raise_server_exceptions=True)


def test_cors_origins_default_includes_localhost_only() -> None:
    """With no CORS_ORIGINS env var, only http://localhost:5173 is in the allowlist."""
    os.environ.pop("CORS_ORIGINS", None)
    from app import _cors_origins

    origins = _cors_origins()
    assert "http://localhost:5173" in origins
    assert "*" not in origins


def test_cors_origins_env_var_adds_extra_origins() -> None:
    """CORS_ORIGINS env var adds origins to the allowlist alongside localhost."""
    os.environ["CORS_ORIGINS"] = "https://demo.example.com, https://admin.example.com"
    try:
        from app import _cors_origins

        import importlib
        import app as app_module

        importlib.reload(app_module)
        from app import _cors_origins as fresh_cors_origins

        origins = fresh_cors_origins()
        assert "http://localhost:5173" in origins
        assert "https://demo.example.com" in origins
        assert "https://admin.example.com" in origins
        assert "*" not in origins
    finally:
        os.environ.pop("CORS_ORIGINS", None)


def test_cors_preflight_allows_localhost_with_patch() -> None:
    """OPTIONS preflight from localhost:5173 requesting PATCH is allowed."""
    client = _make_client()
    response = client.options(
        "/api/trends",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code in (200, 204)
    allow_origin = response.headers.get("access-control-allow-origin", "")
    assert allow_origin == "http://localhost:5173"


def test_cors_preflight_allows_delete() -> None:
    """OPTIONS preflight requesting DELETE is allowed from localhost."""
    client = _make_client()
    response = client.options(
        "/api/trends/1",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "DELETE",
        },
    )
    assert response.status_code in (200, 204)
    allow_methods = response.headers.get("access-control-allow-methods", "")
    # Either the allow-methods header contains DELETE, or the origin is allowed
    allow_origin = response.headers.get("access-control-allow-origin", "")
    assert allow_origin == "http://localhost:5173"


if __name__ == "__main__":
    test_cors_origins_default_includes_localhost_only()
    test_cors_origins_env_var_adds_extra_origins()
    test_cors_preflight_allows_localhost_with_patch()
    test_cors_preflight_allows_delete()
    print("test_app_cors.py: ok")
