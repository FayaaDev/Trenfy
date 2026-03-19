from datetime import date
from typing import Any

import httpx

from trend_agents.shared.models import TrendItem, TrendSource
from tools.trend_clients.base import BaseTrendClient
from tools.trend_clients.common import compute_content_hash

STEAM_FEATURED_CATEGORIES_ENDPOINT = (
    "https://store.steampowered.com/api/featuredcategories"
)


class SteamTrendClient(BaseTrendClient):
    platform = "steam"

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def fetch(self, source: TrendSource, max_items: int = 20) -> list[TrendItem]:
        limit = min(max_items, 20)

        async with httpx.AsyncClient(timeout=30.0, transport=self._transport) as client:
            response = await client.get(
                STEAM_FEATURED_CATEGORIES_ENDPOINT,
                params={"cc": "us", "l": "en"},
            )
            response.raise_for_status()
            payload = response.json()

        if source.endpoint == "store/top_sellers":
            raw_items = (payload.get("top_sellers") or {}).get("items") or []
        elif source.endpoint == "store/new_releases":
            raw_items = (payload.get("new_releases") or {}).get("items") or []
        else:
            raise ValueError(f"Unsupported Steam endpoint: {source.endpoint}")

        rows: list[TrendItem] = []
        for raw_item in raw_items:
            trend = self._normalize_item(raw_item)
            if trend is None:
                continue
            rows.append(trend)
            if len(rows) >= limit:
                break

        return rows

    def _normalize_item(self, raw_item: dict[str, Any]) -> TrendItem | None:
        app_id = raw_item.get("id")
        title = str(raw_item.get("name") or "").strip()
        if not app_id or not title:
            return None

        url = f"https://store.steampowered.com/app/{app_id}"
        release_ts = str(raw_item.get("release_date") or "")
        price_cents = int(raw_item.get("final_price") or 0)

        trend = TrendItem(
            platform=self.platform,
            category="gaming",
            title=title,
            description="",
            url=url,
            thumbnail_url=str(raw_item.get("large_capsule_image") or "") or None,
            published_date=date.today().isoformat(),
            metric_type="current_players",
            metric_value=0,
            region_code="US",
            metadata={
                "app_id": str(app_id),
                "developer": str(raw_item.get("developer") or ""),
                "publisher": str(raw_item.get("publisher") or ""),
                "genres": raw_item.get("genres") or [],
                "price": f"{price_cents / 100:.2f}",
                "release_date": release_ts,
                "current_players": int(raw_item.get("current_players") or 0),
            },
        )
        trend.content_hash = compute_content_hash(trend)
        return trend
