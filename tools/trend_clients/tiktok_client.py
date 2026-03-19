import os
from typing import Any

import httpx

from trend_agents.shared.models import TrendItem, TrendSource
from tools.trend_clients.base import BaseTrendClient
from tools.trend_clients.common import (
    compute_content_hash,
    normalize_category,
    retry_with_backoff,
)

TIKTOK_PROVIDER_ENDPOINT = "https://api.tiktok-provider.example/v1/trending"


class TikTokTrendClient(BaseTrendClient):
    platform = "tiktok"

    def __init__(
        self,
        api_key: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> None:
        self.api_key = api_key or os.getenv("TIKTOK_PROVIDER_API_KEY", "")
        self._transport = transport
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.consecutive_failures_by_source: dict[str, int] = {}
        self._circuit_open_sources: set[str] = set()
        self._status_reason_by_source: dict[str, str] = {}

    async def fetch(self, source: TrendSource, max_items: int = 20) -> list[TrendItem]:
        source_id = source.id
        if source_id in self._circuit_open_sources:
            self._status_reason_by_source[source_id] = "disabled_circuit_breaker"
            return []

        if not self.api_key:
            raise ValueError("TIKTOK_PROVIDER_API_KEY is required")

        limit = min(max_items, 20)

        async def _request_once() -> dict[str, Any]:
            async with httpx.AsyncClient(
                timeout=30.0, transport=self._transport
            ) as client:
                response = await client.get(
                    TIKTOK_PROVIDER_ENDPOINT,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    params={
                        "region": (source.params or {}).get("region", "US"),
                        "limit": limit,
                    },
                )
                response.raise_for_status()
                return response.json()

        try:
            payload = await retry_with_backoff(
                _request_once,
                retries=max(self.max_retries - 1, 0),
                base_delay=self.base_delay,
                max_delay=8.0,
            )
        except Exception:
            failures = self.consecutive_failures_by_source.get(source_id, 0) + 1
            self.consecutive_failures_by_source[source_id] = failures
            if failures >= 3:
                self._circuit_open_sources.add(source_id)
                self._status_reason_by_source[source_id] = "disabled_circuit_breaker"
            else:
                self._status_reason_by_source[source_id] = "error"
            return []

        self.consecutive_failures_by_source[source_id] = 0
        self._status_reason_by_source[source_id] = "success"
        self._circuit_open_sources.discard(source_id)

        rows: list[TrendItem] = []
        for raw_item in payload.get("items") or []:
            normalized = self._normalize_item(raw_item, source)
            if normalized is None:
                continue
            rows.append(normalized)
            if len(rows) >= limit:
                break

        return rows

    def reset_circuit(self, source_id: str) -> None:
        self._circuit_open_sources.discard(source_id)
        self.consecutive_failures_by_source[source_id] = 0
        self._status_reason_by_source[source_id] = "success"

    def get_status_reason(self, source_id: str) -> str:
        return self._status_reason_by_source.get(source_id, "")

    def _normalize_item(
        self, raw_item: dict[str, Any], source: TrendSource
    ) -> TrendItem | None:
        title = str(raw_item.get("title") or "").strip()
        url = str(raw_item.get("url") or "").strip()
        if not title or not url:
            return None

        trend = TrendItem(
            platform=self.platform,
            category=normalize_category(str(raw_item.get("category") or "")),
            title=title,
            description=str(raw_item.get("description") or ""),
            url=url,
            thumbnail_url=str(raw_item.get("thumbnail_url") or "") or None,
            published_date=str(raw_item.get("published_date") or "")[:10],
            metric_type="view_count",
            metric_value=int(raw_item.get("view_count") or 0),
            region_code=str((source.params or {}).get("region", "US")),
            metadata={
                "video_id": str(raw_item.get("id") or ""),
                "author": str(raw_item.get("author") or ""),
            },
        )
        trend.content_hash = compute_content_hash(trend)
        return trend
