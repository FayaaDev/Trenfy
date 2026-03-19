import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendSource
from tools.trend_clients.tiktok_client import TikTokTrendClient


def _build_source() -> TrendSource:
    return TrendSource(
        id="TIKTOK_TRENDING",
        platform="tiktok",
        endpoint="trending",
        params={"region": "US"},
        check_interval_minutes=30,
        enabled=True,
    )


async def test_temporary_failures_retry_up_to_three_attempts() -> None:
    attempts = 0

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(503, content="upstream busy")

        payload = {
            "items": [
                {
                    "id": "abc",
                    "title": "TikTok Trend",
                    "url": "https://www.tiktok.com/@x/video/abc",
                    "category": "music",
                    "view_count": 123,
                    "published_date": "2026-03-19",
                }
            ]
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = TikTokTrendClient(
        api_key="key",
        transport=httpx.MockTransport(handler),
        max_retries=3,
        base_delay=0.01,
    )
    rows = await client.fetch(_build_source(), max_items=20)

    assert attempts == 3
    assert len(rows) == 1
    assert rows[0].platform == "tiktok"


async def test_three_failures_open_circuit_and_skip_fetch() -> None:
    attempts = 0

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(503, content="always down")

    client = TikTokTrendClient(
        api_key="key",
        transport=httpx.MockTransport(handler),
        max_retries=3,
        base_delay=0.01,
    )
    source = _build_source()

    for _ in range(3):
        rows = await client.fetch(source, max_items=20)
        assert rows == []

    attempts_after_trip = attempts
    rows = await client.fetch(source, max_items=20)
    assert rows == []
    assert attempts == attempts_after_trip
    assert client.get_status_reason(source.id) == "disabled_circuit_breaker"


async def test_manual_reset_clears_breaker_and_allows_fetch() -> None:
    attempts = 0

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts <= 9:
            return httpx.Response(503, content="down")

        payload = {
            "items": [
                {
                    "id": "ok-1",
                    "title": "Recovered",
                    "url": "https://www.tiktok.com/@x/video/ok-1",
                    "category": "entertainment",
                    "view_count": 50,
                    "published_date": "2026-03-19",
                }
            ]
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = TikTokTrendClient(
        api_key="key",
        transport=httpx.MockTransport(handler),
        max_retries=3,
        base_delay=0.01,
    )
    source = _build_source()

    for _ in range(3):
        await client.fetch(source, max_items=20)

    assert client.get_status_reason(source.id) == "disabled_circuit_breaker"
    client.reset_circuit(source.id)

    rows = await client.fetch(source, max_items=20)
    assert len(rows) == 1
    assert client.get_status_reason(source.id) == "success"


if __name__ == "__main__":
    asyncio.run(test_temporary_failures_retry_up_to_three_attempts())
    asyncio.run(test_three_failures_open_circuit_and_skip_fetch())
    asyncio.run(test_manual_reset_clears_breaker_and_allows_fetch())
    print("test_tiktok_client.py: ok")
