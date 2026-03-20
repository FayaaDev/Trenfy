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


class FakeTrendClient(NocoDBTrendsClient):
    """Fake NocoDB client for testing trend mutation helpers."""

    def __init__(self, existing_row=None):
        self.trends_table_id = "trends"
        self.calls = []
        self._existing_row = existing_row

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
        if method in ("PATCH", "DELETE"):
            return _FakeResponse({"success": True})
        return _FakeResponse({})

    async def get_trend_by_id(self, record_id):
        return self._existing_row


async def test_update_trend_returns_none_when_not_found():
    """update_trend returns None when the trend does not exist."""
    client = FakeTrendClient(existing_row=None)
    result = await client.update_trend("999", {"status": "approved"})
    assert result is None


async def test_update_trend_returns_updated_row_when_found():
    """update_trend returns the updated row when the trend exists."""
    row = {"Id": "1", "title": "Test", "status": "pending"}
    client = FakeTrendClient(existing_row=row)
    result = await client.update_trend("1", {"status": "approved"})
    assert result is not None
    assert result.get("Id") == "1"


async def test_update_trend_sends_patch_with_correct_body():
    """update_trend sends a PATCH request with the correct body shape."""
    row = {"Id": "42", "title": "Test"}
    client = FakeTrendClient(existing_row=row)
    await client.update_trend("42", {"status": "approved"})
    patch_calls = [c for c in client.calls if c["method"] == "PATCH"]
    assert len(patch_calls) == 1
    body = patch_calls[0]["json_body"]
    assert isinstance(body, list)
    assert body[0]["Id"] == "42"
    assert body[0]["status"] == "approved"


async def test_delete_trend_returns_true_when_found():
    """delete_trend returns True when the trend exists and deletion succeeds."""
    row = {"Id": "7", "title": "Old Trend"}
    client = FakeTrendClient(existing_row=row)
    result = await client.delete_trend("7")
    assert result is True


async def test_delete_trend_sends_delete_with_correct_body():
    """delete_trend sends a DELETE request with the correct body shape."""
    row = {"Id": "7", "title": "Old Trend"}
    client = FakeTrendClient(existing_row=row)
    await client.delete_trend("7")
    delete_calls = [c for c in client.calls if c["method"] == "DELETE"]
    assert len(delete_calls) == 1
    body = delete_calls[0]["json_body"]
    assert isinstance(body, list)
    assert body[0]["Id"] == "7"


class FakeSourceClient(NocoDBTrendsClient):
    """Fake NocoDB client for testing source update helper."""

    def __init__(self, existing_rows=None):
        self.sources_table_id = "sources"
        self.calls = []
        self._existing_rows = existing_rows or []

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
            return _FakeResponse({"list": self._existing_rows})
        if method == "PATCH":
            return _FakeResponse({"success": True})
        return _FakeResponse({})


async def test_update_source_returns_none_when_not_found():
    """update_source returns None when the source does not exist."""
    client = FakeSourceClient(existing_rows=[])
    result = await client.update_source("YOUTUBE_TRENDING_US", True)
    assert result is None


async def test_update_source_sends_patch_with_correct_body():
    """update_source PATCHes by NocoDB row ID, not by stable string ID."""
    rows = [
        {
            "Id": 18,
            "id": "YOUTUBE_TRENDING_US",
            "enabled": True,
            "name": "YT US",
            "platform": "youtube",
            "last_fetched_at": None,
            "last_fetch_status": "",
        }
    ]
    client = FakeSourceClient(existing_rows=rows)
    await client.update_source("YOUTUBE_TRENDING_US", False)
    patch_calls = [c for c in client.calls if c["method"] == "PATCH"]
    assert len(patch_calls) == 1
    body = patch_calls[0]["json_body"]
    assert isinstance(body, list)
    assert body[0]["Id"] == 18
    assert body[0]["enabled"] is False


async def test_update_source_returns_normalized_row():
    """update_source returns a normalized source row on success."""
    rows = [
        {
            "Id": 18,
            "id": "YOUTUBE_TRENDING_US",
            "enabled": True,
            "name": "YT US",
            "platform": "youtube",
            "last_fetched_at": None,
            "last_fetch_status": "",
        }
    ]
    client = FakeSourceClient(existing_rows=rows)
    result = await client.update_source("YOUTUBE_TRENDING_US", False)
    assert result is not None
    assert result["id"] == "YOUTUBE_TRENDING_US"
    assert "enabled" in result


if __name__ == "__main__":
    asyncio.run(test_sync_sources_inserts_valid_rows_and_skips_invalid_platforms())
    print("test_nocodb_trends_client.py: ok")
