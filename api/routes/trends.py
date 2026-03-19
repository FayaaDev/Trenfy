from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from api.contracts import decode_cursor, encode_cursor, normalize_limit
from tools.nocodb_trends_client import nocodb_trends

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
