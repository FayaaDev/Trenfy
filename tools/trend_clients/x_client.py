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

X_RECENT_SEARCH_ENDPOINT = "https://api.x.com/2/tweets/search/recent"


class XTrendClient(BaseTrendClient):
    platform = "x"

    def __init__(
        self,
        bearer_token: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.bearer_token = bearer_token or os.getenv("X_BEARER_TOKEN", "")
        self._transport = transport

    async def fetch(self, source: TrendSource, max_items: int = 20) -> list[TrendItem]:
        if not self.bearer_token:
            raise ValueError("X_BEARER_TOKEN is required")

        source_params = source.params or {}
        query = str(source_params.get("query") or "").strip()
        if not query:
            raise ValueError(f"X source '{source.id}' is missing params.query")

        fetch_limit = _clamp_int(max_items, minimum=1, maximum=100, default=20)
        source_limit = _clamp_int(
            source_params.get("max_results"),
            minimum=1,
            maximum=100,
            default=fetch_limit,
        )
        fetch_limit = min(fetch_limit, source_limit)
        api_limit = max(10, fetch_limit)

        region_code = str(
            source_params.get("region_code")
            or source_params.get("regionCode")
            or "GLOBAL"
        )
        category = normalize_category(str(source_params.get("category") or ""))

        request_params = {
            "query": query,
            "max_results": api_limit,
            "sort_order": str(source_params.get("sort_order") or "recency"),
            "tweet.fields": "created_at,public_metrics,lang,author_id",
            "expansions": "author_id",
            "user.fields": "username,name",
        }

        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json",
        }

        async def _send_request() -> dict[str, Any]:
            async with httpx.AsyncClient(
                timeout=30.0, transport=self._transport
            ) as client:
                response = await client.get(
                    X_RECENT_SEARCH_ENDPOINT,
                    headers=headers,
                    params=request_params,
                )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict):
                return payload
            return {}

        payload = await retry_with_backoff(_send_request, retries=2, base_delay=0.5)
        users = (payload.get("includes") or {}).get("users") or []
        username_by_author_id = {
            str(user.get("id") or ""): str(user.get("username") or "")
            for user in users
            if isinstance(user, dict)
        }

        results: list[TrendItem] = []
        for raw in payload.get("data") or []:
            if not isinstance(raw, dict):
                continue

            tweet_id = str(raw.get("id") or "").strip()
            text = str(raw.get("text") or "").strip()
            if not tweet_id or not text:
                continue

            author_id = str(raw.get("author_id") or "")
            username = username_by_author_id.get(author_id, "")
            if username:
                url = f"https://x.com/{username}/status/{tweet_id}"
            else:
                url = f"https://x.com/i/web/status/{tweet_id}"

            public_metrics = raw.get("public_metrics") or {}
            metric_value = _engagement_score(public_metrics)

            created_at = str(raw.get("created_at") or "")
            published_date = created_at[:10] if len(created_at) >= 10 else ""

            item = TrendItem(
                platform=self.platform,
                category=category,
                title=text,
                description=text,
                url=url,
                published_date=published_date,
                metric_type="engagement",
                metric_value=metric_value,
                region_code=region_code,
                metadata={
                    "tweet_id": tweet_id,
                    "author_id": author_id,
                    "author_username": username,
                    "lang": str(raw.get("lang") or ""),
                    "created_at": created_at,
                    "public_metrics": public_metrics,
                    "query": query,
                },
            )
            item.content_hash = compute_content_hash(item)
            results.append(item)

            if len(results) >= fetch_limit:
                break

        return results


def _engagement_score(public_metrics: Any) -> int:
    if not isinstance(public_metrics, dict):
        return 0

    score = 0
    for key in (
        "retweet_count",
        "reply_count",
        "like_count",
        "quote_count",
        "bookmark_count",
        "impression_count",
    ):
        score += _clamp_int(
            public_metrics.get(key), minimum=0, maximum=10**12, default=0
        )
    return score


def _clamp_int(value: Any, minimum: int, maximum: int, default: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, numeric))


CLIENT_CLASS = XTrendClient
