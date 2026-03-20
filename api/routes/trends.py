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

trends_router = APIRouter(prefix="/api/trends", tags=["trends"])
sources_router = APIRouter(prefix="/api", tags=["sources"])

VALID_SORT_FIELDS = {"fetched_at", "metric_value", "published_date"}


def _build_mockup_sections(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    latest = list(rows)
    hero = latest[0] if latest else None
    highlights = latest[1:2] if len(latest) > 1 else []
    return {
        "hero": hero,
        "highlights": highlights,
        "latest": latest,
    }


@trends_router.get("")
async def list_trends(
    platform: Optional[str] = None,
    category: Optional[str] = None,
    region_code: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1),
    cursor: Optional[str] = None,
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    min_metric_value: Optional[str] = Query(default=None),
):
    effective_limit = normalize_limit(limit)

    # Validate min_metric_value before anything else
    min_metric_int: Optional[int] = None
    if min_metric_value is not None:
        try:
            min_metric_int = int(min_metric_value)
        except ValueError:
            return JSONResponse(
                status_code=400, content={"error": "invalid_min_metric_value"}
            )

    # Build sort from sort_by (cursor sort overrides when paginating)
    sort = "-fetched_at"
    if sort_by and sort_by in VALID_SORT_FIELDS:
        sort = f"-{sort_by}"

    offset = 0
    if cursor:
        try:
            decoded = decode_cursor(cursor)
            offset = decoded.get("offset", 0)
            sort = decoded.get("sort") or sort
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
        q=q,
        min_metric_value=min_metric_int,
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


@trends_router.get("/mockup")
async def get_trends_mockup(
    limit: int = Query(default=12, ge=1, le=50),
    platform: Optional[str] = None,
    category: Optional[str] = None,
):
    rows = await nocodb_trends.query_trends(
        platform=platform,
        category=category,
        limit=limit,
        offset=0,
        sort="-fetched_at",
    )
    return _build_mockup_sections(rows)


@trends_router.get("/stats")
async def get_stats():
    return await nocodb_trends.get_statistics()


@trends_router.get("/{record_id}")
async def get_trend(record_id: str):
    row = await nocodb_trends.get_trend_by_id(record_id)
    if row is None:
        return JSONResponse(
            status_code=404,
            content={"error": "trend_not_found", "id": record_id},
        )
    return row


@trends_router.post("/refresh")
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


@sources_router.get("/sources")
@trends_router.get("/sources")
async def list_sources(platform: Optional[str] = None):
    rows = await nocodb_trends.query_sources(platform=platform, enabled_only=False)
    return [
        {
            "id": row.get("id") or row.get("Id") or "",
            "name": row.get("name") or "",
            "platform": row.get("platform") or "",
            "last_fetched_at": row.get("last_fetched_at"),
            "last_fetch_status": row.get("last_fetch_status") or "",
            "enabled": bool(row.get("enabled", False)),
        }
        for row in rows
    ]


router = APIRouter()
router.include_router(trends_router)
router.include_router(sources_router)
