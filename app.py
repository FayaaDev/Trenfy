"""
Trenfy FastAPI Application
Trend-Catching Platform — Python FastAPI backend
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.trends import router as trends_router

logger = logging.getLogger(__name__)


def _env_configured(key: str) -> bool:
    return bool(str(os.getenv(key, "")).strip())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan — startup and shutdown logic."""
    # --- Startup ---
    from trend_agents.shared import source_registry
    from tools.nocodb_trends_client import nocodb_trends
    from workflows.trends_scheduler import scheduler

    # 1. Sync sources to NocoDB (non-fatal)
    try:
        sources = source_registry.list_enabled()
        inserted = await nocodb_trends.sync_sources(sources)
        logger.info("[App] Source sync complete: %d new sources inserted", inserted)
    except Exception as e:
        logger.warning("[App] Source sync failed (non-fatal): %s", e)

    # 2. Start scheduler
    await scheduler.start()
    logger.info("[App] Scheduler started: is_running=%s", scheduler.is_running)

    yield

    # --- Shutdown ---
    from workflows.trends_scheduler import scheduler as _scheduler

    await _scheduler.stop()
    logger.info("[App] Scheduler stopped")


app = FastAPI(
    title="Trenfy API",
    description="Trend-Catching Platform — YouTube and X",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow React Native app requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(trends_router)


@app.get("/health")
async def health() -> dict:
    """Health check endpoint. Reports real scheduler status."""
    from workflows.trends_scheduler import scheduler

    return {
        "status": "ok",
        "scheduler_running": scheduler.is_running,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health/integrations")
async def health_integrations() -> dict:
    platform_source_counts: dict[str, int] = {}
    source_registry_error = ""

    try:
        from trend_agents.shared import source_registry

        for source in source_registry.list_all():
            platform = str(source.platform or "").strip().lower()
            if not platform:
                continue
            platform_source_counts[platform] = (
                platform_source_counts.get(platform, 0) + 1
            )
    except Exception as exc:
        source_registry_error = str(exc)

    payload = {
        "status": "ok",
        "credentials": {
            "youtube_api_key_configured": _env_configured("YOUTUBE_API_KEY"),
            "x_bearer_token_configured": _env_configured("X_BEARER_TOKEN"),
            "nocodb_api_token_configured": _env_configured("NOCODB_API_TOKEN"),
        },
        "platform_source_counts": platform_source_counts,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    if source_registry_error:
        payload["source_registry_error"] = source_registry_error

    return payload


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SERVER_PORT", "8080"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
