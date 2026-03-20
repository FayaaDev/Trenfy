import asyncio
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendSource
from tools.nocodb_trends_client import NocoDBTrendsClient


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


class FakeSyncClient(NocoDBTrendsClient):
    def __init__(self):
        self.sources_table_id = "sources"
        self.calls = []

    async def _request(
        self,
        method,
        path,
        *,
        params=None,
        json_body=None,
        allow_404=False,
    ):
        self.calls.append(
            {
                "method": method,
                "path": path,
                "params": params,
                "json_body": json_body,
            }
        )
        if method == "GET":
            return _FakeResponse({"list": []})

        record = (json_body or [{}])[0]
        if record.get("platform") == "x":
            response = httpx.Response(
                400,
                request=httpx.Request(method, f"https://example.test{path}"),
                json={"msg": 'Invalid option(s) "x" provided for column "platform".'},
            )
            raise httpx.HTTPStatusError(
                "bad request",
                request=response.request,
                response=response,
            )

        return _FakeResponse({"list": [record]})


def _source(source_id: str, platform: str) -> TrendSource:
    return TrendSource(
        id=source_id,
        name=source_id,
        platform=platform,
        endpoint="endpoint",
        params={"region": "US"},
        check_interval_minutes=15,
        enabled=True,
    )


async def test_sync_sources_inserts_valid_rows_and_skips_invalid_platforms() -> None:
    client = FakeSyncClient()

    inserted = await client.sync_sources(
        [
            _source("YOUTUBE_TRENDING_US", "youtube"),
            _source("X_RECENT_GLOBAL_EN", "x"),
        ]
    )

    post_calls = [call for call in client.calls if call["method"] == "POST"]

    assert inserted == 1
    assert len(post_calls) == 2
    assert post_calls[0]["json_body"][0]["id"] == "YOUTUBE_TRENDING_US"
    assert post_calls[1]["json_body"][0]["id"] == "X_RECENT_GLOBAL_EN"


if __name__ == "__main__":
    asyncio.run(test_sync_sources_inserts_valid_rows_and_skips_invalid_platforms())
    print("test_nocodb_trends_client.py: ok")
