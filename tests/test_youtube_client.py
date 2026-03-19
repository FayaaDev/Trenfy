import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendSource
from tools.trend_clients.youtube_client import YouTubeTrendClient


def _build_source(region_code: str = "US") -> TrendSource:
    return TrendSource(
        id=f"YOUTUBE_TRENDING_{region_code}",
        platform="youtube",
        endpoint="videos.list",
        params={
            "chart": "mostPopular",
            "regionCode": region_code,
            "part": "snippet,contentDetails,statistics",
        },
        check_interval_minutes=15,
        enabled=True,
    )


async def test_fetch_normalizes_and_limits_results() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.scheme == "https"
        assert request.url.host == "www.googleapis.com"
        assert request.url.path == "/youtube/v3/videos"
        assert request.url.params["regionCode"] == "SA"
        assert int(request.url.params["maxResults"]) == 20
        assert request.url.params["chart"] == "mostPopular"
        assert request.url.params["part"] == "snippet,contentDetails,statistics"

        payload = {
            "items": [
                {
                    "id": f"video-{i}",
                    "snippet": {
                        "title": f"Video {i}",
                        "description": "desc",
                        "publishedAt": "2026-03-19T00:00:00Z",
                        "channelTitle": "Channel",
                        "channelId": "channel-1",
                        "categoryId": "20",
                        "thumbnails": {"high": {"url": "https://img/y.jpg"}},
                    },
                    "contentDetails": {"duration": "PT1M"},
                    "statistics": {
                        "viewCount": "100",
                        "likeCount": "10",
                        "commentCount": "2",
                    },
                }
                for i in range(25)
            ]
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = YouTubeTrendClient(
        api_key="test-key", transport=httpx.MockTransport(handler)
    )
    rows = await client.fetch(_build_source("SA"), max_items=25)

    assert len(rows) == 20
    assert all(row.platform == "youtube" for row in rows)
    assert all(row.region_code == "SA" for row in rows)


async def test_unknown_category_maps_to_entertainment() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        payload = {
            "items": [
                {
                    "id": "video-1",
                    "snippet": {
                        "title": "Unknown Category",
                        "publishedAt": "2026-03-19T00:00:00Z",
                        "categoryId": "999",
                    },
                    "statistics": {"viewCount": "99"},
                }
            ]
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = YouTubeTrendClient(
        api_key="test-key", transport=httpx.MockTransport(handler)
    )
    rows = await client.fetch(_build_source("US"), max_items=20)

    assert len(rows) == 1
    assert rows[0].category == "entertainment"


async def test_rows_missing_title_or_url_are_skipped() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        payload = {
            "items": [
                {
                    "id": "",
                    "snippet": {
                        "title": "Valid title but no id",
                        "publishedAt": "2026-03-19T00:00:00Z",
                        "categoryId": "10",
                    },
                },
                {
                    "id": "video-2",
                    "snippet": {
                        "title": "",
                        "publishedAt": "2026-03-19T00:00:00Z",
                        "categoryId": "10",
                    },
                },
                {
                    "id": "video-3",
                    "snippet": {
                        "title": "Valid",
                        "publishedAt": "2026-03-19T00:00:00Z",
                        "categoryId": "10",
                    },
                    "statistics": {"viewCount": "10"},
                },
            ]
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = YouTubeTrendClient(
        api_key="test-key", transport=httpx.MockTransport(handler)
    )
    rows = await client.fetch(_build_source("US"), max_items=20)

    assert len(rows) == 1
    assert rows[0].title == "Valid"


if __name__ == "__main__":
    asyncio.run(test_fetch_normalizes_and_limits_results())
    asyncio.run(test_unknown_category_maps_to_entertainment())
    asyncio.run(test_rows_missing_title_or_url_are_skipped())
    print("test_youtube_client.py: ok")
