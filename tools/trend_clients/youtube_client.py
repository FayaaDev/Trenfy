import os
from typing import Any

import httpx

from trend_agents.shared.models import TrendItem, TrendSource
from tools.trend_clients.base import BaseTrendClient
from tools.trend_clients.common import compute_content_hash

YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos"

_CATEGORY_BY_ID = {
    "10": "music",
    "20": "gaming",
}


class YouTubeTrendClient(BaseTrendClient):
    platform = "youtube"

    def __init__(
        self,
        api_key: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("YOUTUBE_API_KEY", "")
        self._transport = transport

    async def fetch(self, source: TrendSource, max_items: int = 20) -> list[TrendItem]:
        if not self.api_key:
            raise ValueError("YOUTUBE_API_KEY is required")

        source_params = source.params or {}
        query_max = min(max_items, 20)

        params = {
            "chart": source_params.get("chart", "mostPopular"),
            "regionCode": source_params.get("regionCode", "US"),
            "part": source_params.get("part", "snippet,contentDetails,statistics"),
            "maxResults": query_max,
            "key": self.api_key,
        }

        async with httpx.AsyncClient(timeout=30.0, transport=self._transport) as client:
            response = await client.get(YOUTUBE_VIDEOS_ENDPOINT, params=params)
            response.raise_for_status()
            payload = response.json()

        results: list[TrendItem] = []
        for raw_item in payload.get("items", []):
            item = self._normalize_item(
                raw_item=raw_item, region_code=params["regionCode"]
            )
            if item is None:
                continue
            results.append(item)
            if len(results) >= query_max:
                break

        return results

    def _normalize_item(
        self, raw_item: dict[str, Any], region_code: str
    ) -> TrendItem | None:
        snippet = raw_item.get("snippet") or {}
        stats = raw_item.get("statistics") or {}
        content_details = raw_item.get("contentDetails") or {}

        title = str(snippet.get("title") or "").strip()
        video_id = str(raw_item.get("id") or "").strip()
        if not title or not video_id:
            return None

        url = f"https://www.youtube.com/watch?v={video_id}"
        if not url:
            return None

        category_id = str(snippet.get("categoryId") or "")
        category = _CATEGORY_BY_ID.get(category_id, "entertainment")

        trend = TrendItem(
            platform=self.platform,
            category=category,
            title=title,
            description=str(snippet.get("description") or ""),
            url=url,
            thumbnail_url=(snippet.get("thumbnails") or {}).get("high", {}).get("url"),
            published_date=str(snippet.get("publishedAt") or "")[:10],
            metric_type="view_count",
            metric_value=int(stats.get("viewCount") or 0),
            region_code=region_code,
            metadata={
                "video_id": video_id,
                "channel_title": str(snippet.get("channelTitle") or ""),
                "channel_id": str(snippet.get("channelId") or ""),
                "duration": str(content_details.get("duration") or ""),
                "view_count": int(stats.get("viewCount") or 0),
                "like_count": int(stats.get("likeCount") or 0),
                "comment_count": int(stats.get("commentCount") or 0),
                "category_id": category_id,
                "secondary_category_hint": str(snippet.get("defaultLanguage") or ""),
            },
        )
        trend.content_hash = compute_content_hash(trend)
        return trend


CLIENT_CLASS = YouTubeTrendClient
