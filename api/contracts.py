import base64
import json
from typing import Any, Dict, List, Optional, TypedDict

from pydantic import BaseModel, field_validator

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class PagingMeta(TypedDict):
    limit: int
    next_cursor: Optional[str]
    has_more: bool


class TrendsListResponse(TypedDict):
    items: List[Dict[str, Any]]
    paging: PagingMeta


class PlatformStats(TypedDict):
    platform: str
    total_trends: int
    newest_fetched_at: Optional[str]


class TrendsStatsResponse(TypedDict):
    total_trends: int
    by_platform: List[PlatformStats]


INVALID_REFRESH_SELECTOR = "invalid_refresh_selector"
INVALID_STATUS = "invalid_status"
VALID_STATUSES = {"pending", "approved", "rejected"}


def validate_status_filter(value: Optional[str]) -> Optional[str]:
    """Normalize and validate a status filter value.

    Returns None for None or blank input. Raises ValueError('invalid_status')
    for values not in VALID_STATUSES.
    """
    if value is None:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    if normalized not in VALID_STATUSES:
        raise ValueError(INVALID_STATUS)
    return normalized


class RefreshRequest(TypedDict):
    source_id: Optional[str]
    platform: Optional[str]


class RefreshResult(TypedDict):
    source_id: str
    fetched: int
    stored: int
    duplicates: int
    invalid: int
    status: str


class RefreshResponse(TypedDict):
    sources_run: int
    fetched: int
    stored: int
    duplicates: int
    results: List[RefreshResult]


def validate_refresh_selector(
    source_id: Optional[str], platform: Optional[str]
) -> None:
    has_source = bool(str(source_id or "").strip())
    has_platform = bool(str(platform or "").strip())
    if has_source and has_platform:
        raise ValueError(INVALID_REFRESH_SELECTOR)


class PatchTrendRequest(BaseModel):
    """Partial update payload for PATCH /api/trends/{id}.

    Only fields explicitly set by the caller are included when calling .updates().
    """

    status: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    published_date: Optional[str] = None
    metric_type: Optional[str] = None
    metric_value: Optional[int] = None
    region_code: Optional[str] = None
    ar_translation: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        normalized = str(v).strip().lower()
        if normalized not in VALID_STATUSES:
            raise ValueError(INVALID_STATUS)
        return normalized

    @field_validator("title", mode="before")
    @classmethod
    def validate_title(cls, v):
        if v is not None and not str(v).strip():
            raise ValueError("title cannot be blank")
        return v

    def updates(self) -> Dict[str, Any]:
        """Return only the fields that were explicitly set by the caller."""
        return self.model_dump(exclude_unset=True)


class PatchSourceRequest(BaseModel):
    """Partial update payload for PATCH /api/sources/{id}."""

    enabled: bool


def normalize_limit(value: Optional[int]) -> int:
    if value is None:
        return DEFAULT_LIMIT
    return min(max(1, int(value)), MAX_LIMIT)


def encode_cursor(offset: int, sort: str = "-fetched_at") -> str:
    payload = json.dumps({"offset": int(offset), "sort": sort}).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("utf-8")


def decode_cursor(cursor: str) -> Dict[str, Any]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode("utf-8")))
        offset = int(payload.get("offset", 0))
        sort = str(payload.get("sort") or "-fetched_at")
        if offset < 0:
            raise ValueError("invalid_cursor")
        return {"offset": offset, "sort": sort}
    except Exception as exc:
        raise ValueError("invalid_cursor") from exc
