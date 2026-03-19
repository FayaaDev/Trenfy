"""
Trenfy FastAPI Application
Trend-Catching Platform — Python FastAPI backend
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Trenfy API",
    description="Trend-Catching Platform — YouTube, Spotify, Steam, TikTok",
    version="0.1.0",
)

# CORS — allow React Native app requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    """Health check endpoint. Reports scheduler status once scheduler is implemented."""
    return {
        "status": "ok",
        "scheduler_running": False,  # Updated in Phase 2 when scheduler starts
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SERVER_PORT", "8080"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
