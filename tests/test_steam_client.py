import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendSource
from tools.trend_clients.steam_client import SteamTrendClient


def _build_source(endpoint: str) -> TrendSource:
    return TrendSource(
        id=f"STEAM_{endpoint.upper().replace('/', '_')}",
        platform="steam",
        endpoint=endpoint,
        params={},
        check_interval_minutes=30,
        enabled=True,
    )


def _steam_payload() -> dict:
    return {
        "top_sellers": {
            "items": [
                {
                    "id": 10,
                    "name": "Top One",
                    "large_capsule_image": "https://img/10.jpg",
                    "final_price": 1999,
                    "release_date": "1700000000",
                }
            ]
        },
        "new_releases": {
            "items": [
                {
                    "id": 20,
                    "name": "New One",
                    "large_capsule_image": "https://img/20.jpg",
                    "final_price": 0,
                    "release_date": "1700000001",
                }
            ]
        },
    }


async def test_top_sellers_returns_normalized_items() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "store.steampowered.com"
        assert request.url.path == "/api/featuredcategories"
        return httpx.Response(200, content=json.dumps(_steam_payload()))

    client = SteamTrendClient(transport=httpx.MockTransport(handler))
    rows = await client.fetch(_build_source("store/top_sellers"), max_items=20)

    assert len(rows) <= 20
    assert len(rows) == 1
    assert rows[0].platform == "steam"
    assert rows[0].category == "gaming"
    assert rows[0].metric_type == "current_players"


async def test_new_releases_returns_normalized_items() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=json.dumps(_steam_payload()))

    client = SteamTrendClient(transport=httpx.MockTransport(handler))
    rows = await client.fetch(_build_source("store/new_releases"), max_items=20)

    assert len(rows) <= 20
    assert len(rows) == 1
    assert rows[0].platform == "steam"
    assert rows[0].title == "New One"


async def test_missing_metadata_is_handled_gracefully() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        payload = {
            "top_sellers": {
                "items": [
                    {
                        "id": 30,
                        "name": "",
                    },
                    {
                        "id": 31,
                        "name": "Fallback Title",
                    },
                ]
            }
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = SteamTrendClient(transport=httpx.MockTransport(handler))
    rows = await client.fetch(_build_source("store/top_sellers"), max_items=20)

    assert len(rows) == 1
    assert rows[0].title == "Fallback Title"


if __name__ == "__main__":
    asyncio.run(test_top_sellers_returns_normalized_items())
    asyncio.run(test_new_releases_returns_normalized_items())
    asyncio.run(test_missing_metadata_is_handled_gracefully())
    print("test_steam_client.py: ok")
