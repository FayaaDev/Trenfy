import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendSource
from tools.trend_clients.x_client import XTrendClient, X_RECENT_SEARCH_ENDPOINT


def _build_source(query: str = "(ai OR tech) lang:en -is:retweet") -> TrendSource:
    return TrendSource(
        id="X_RECENT_GLOBAL_EN",
        platform="x",
        endpoint="tweets.search.recent",
        params={
            "query": query,
            "region_code": "GLOBAL",
            "category": "news",
            "max_results": 20,
            "sort_order": "recency",
        },
        check_interval_minutes=10,
        enabled=True,
    )


async def test_fetch_normalizes_and_limits_results() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.scheme == "https"
        assert request.url.host == "api.x.com"
        assert request.url.path == "/2/tweets/search/recent"
        assert request.url.params["query"] == "(ai OR tech) lang:en -is:retweet"
        assert int(request.url.params["max_results"]) == 20
        assert request.headers["Authorization"] == "Bearer test-token"

        payload = {
            "data": [
                {
                    "id": f"tweet-{i}",
                    "author_id": "author-1",
                    "text": f"Hot topic {i}",
                    "lang": "en",
                    "created_at": "2026-03-19T11:22:33.000Z",
                    "public_metrics": {
                        "retweet_count": 2,
                        "reply_count": 3,
                        "like_count": 5,
                        "quote_count": 7,
                    },
                }
                for i in range(25)
            ],
            "includes": {
                "users": [
                    {
                        "id": "author-1",
                        "username": "trendbot",
                    }
                ]
            },
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = XTrendClient(
        bearer_token="test-token", transport=httpx.MockTransport(handler)
    )
    rows = await client.fetch(_build_source(), max_items=25)

    assert len(rows) == 20
    first = rows[0]
    assert first.platform == "x"
    assert first.category == "entertainment"
    assert first.metric_type == "engagement"
    assert first.metric_value == 17
    assert first.url == "https://x.com/trendbot/status/tweet-0"
    assert first.published_date == "2026-03-19"
    assert str(first.metadata.get("query") or "") == "(ai OR tech) lang:en -is:retweet"


async def test_missing_token_raises_value_error() -> None:
    client = XTrendClient(bearer_token="")

    try:
        await client.fetch(_build_source(), max_items=20)
    except ValueError as error:
        assert str(error) == "X_BEARER_TOKEN is required"
    else:
        raise AssertionError("Expected ValueError when X_BEARER_TOKEN is missing")


async def test_rows_missing_id_or_text_are_skipped_and_url_falls_back() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/2/tweets/search/recent"
        payload = {
            "data": [
                {
                    "id": "",
                    "text": "missing id",
                },
                {
                    "id": "tweet-2",
                    "text": "",
                },
                {
                    "id": "tweet-3",
                    "author_id": "unknown-author",
                    "text": "Valid tweet",
                    "created_at": "2026-03-19T00:00:00.000Z",
                    "public_metrics": {"like_count": 11},
                },
            ],
            "includes": {"users": []},
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = XTrendClient(
        bearer_token="test-token", transport=httpx.MockTransport(handler)
    )
    rows = await client.fetch(_build_source(), max_items=20)

    assert len(rows) == 1
    assert rows[0].title == "Valid tweet"
    assert rows[0].url == "https://x.com/i/web/status/tweet-3"
    assert rows[0].metric_value == 11


if __name__ == "__main__":
    asyncio.run(test_fetch_normalizes_and_limits_results())
    asyncio.run(test_missing_token_raises_value_error())
    asyncio.run(test_rows_missing_id_or_text_are_skipped_and_url_falls_back())
    print("test_x_client.py: ok")
