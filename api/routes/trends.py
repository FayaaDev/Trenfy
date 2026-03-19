from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Query
from fastapi.responses import JSONResponse

from api.contracts import (
    INVALID_REFRESH_SELECTOR,
    decode_cursor,
    encode_cursor,
    normalize_limit,
    validate_refresh_selector,
)
from trend_agents.shared import source_registry
from tools.nocodb_trends_client import nocodb_trends
from workflows.trends_scheduler import workflow

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("")
async def list_trends(
    platform: Optional[str] = None,
    category: Optional[str] = None,
    region_code: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1),
    cursor: Optional[str] = None,
):
    effective_limit = normalize_limit(limit)
    offset = 0
    sort = "-fetched_at"

    if cursor:
        try:
            decoded = decode_cursor(cursor)
            offset = decoded.get("offset", 0)
            sort = decoded.get("sort") or "-fetched_at"
        except ValueError:
            return JSONResponse(status_code=400, content={"error": "invalid_cursor"})

    items = await nocodb_trends.query_trends(
        platform=platform,
        category=category,
        region_code=region_code,
        start_date=start_date,
        end_date=end_date,
        limit=effective_limit,
        offset=offset,
        sort=sort,
    )

    has_more = len(items) == effective_limit
    next_cursor = (
        encode_cursor(offset + effective_limit, sort=sort) if has_more else None
    )

    return {
        "items": items,
        "paging": {
            "limit": effective_limit,
            "next_cursor": next_cursor,
            "has_more": has_more,
        },
    }


@router.get("/stats")
async def get_stats():
    return await nocodb_trends.get_statistics()


@router.get("/{record_id}")
async def get_trend(record_id: str):
    row = await nocodb_trends.get_trend_by_id(record_id)
    if row is None:
        return JSONResponse(
            status_code=404,
            content={"error": "trend_not_found", "id": record_id},
        )
    return row


@router.post("/refresh")
async def refresh_trends(
    payload: Optional[Dict[str, Optional[str]]] = Body(default=None),
):
    payload = payload or {}
    source_id = (payload.get("source_id") or "").strip() or None
    platform = (payload.get("platform") or "").strip() or None

    try:
        validate_refresh_selector(source_id, platform)
    except ValueError:
        return JSONResponse(
            status_code=422,
            content={"error": INVALID_REFRESH_SELECTOR},
        )

    if source_id:
        source = source_registry.get_source(source_id)
        if source is None:
            return JSONResponse(
                status_code=404,
                content={"error": "source_not_found", "id": source_id},
            )
        selected_sources = [source]
    else:
        enabled_sources = source_registry.list_enabled()
        if platform and platform != "all":
            selected_sources = [s for s in enabled_sources if s.platform == platform]
        else:
            selected_sources = enabled_sources

    results: List[Dict[str, Any]] = []
    for source in selected_sources:
        result = await workflow.scan_source(source)
        results.append(result)

    return {
        "sources_run": len(results),
        "fetched": sum(int(r.get("fetched", 0)) for r in results),
        "stored": sum(int(r.get("stored", 0)) for r in results),
        "duplicates": sum(int(r.get("duplicates", 0)) for r in results),
        "results": results,
    }
