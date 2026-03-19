import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import workflows.trends_workflow as workflow_module
from trend_agents.shared.models import TrendItem, TrendSource
from tools.trend_clients.common import compute_content_hash
from workflows.trends_workflow import TrendsWorkflow


class FakeTrendsClient:
    def __init__(self, existing_hashes=None, fail_on_create: bool = False):
        self.existing_hashes = set(existing_hashes or [])
        self.fail_on_create = fail_on_create
        self.created_items: list[TrendItem] = []
        self.status_updates: list[tuple[str, str]] = []

    async def batch_check_duplicates(self, hashes, page_size: int = 50):
        return {h for h in hashes if h in self.existing_hashes}

    async def batch_create_trends(self, items):
        if self.fail_on_create:
            raise RuntimeError("create failed")
        self.created_items.extend(items)
        return [
            {"id": i, "content_hash": item.content_hash} for i, item in enumerate(items)
        ]

    async def update_source_status(self, source_id: str, status: str = "success"):
        self.status_updates.append((source_id, status))
        return True


class FakePlatformClient:
    def __init__(
        self, rows=None, should_raise: bool = False, status_reason: str = "success"
    ):
        self.rows = list(rows or [])
        self.should_raise = should_raise
        self.status_reason = status_reason

    async def fetch(self, source: TrendSource, max_items: int = 20):
        if self.should_raise:
            raise RuntimeError("fetch failed")
        return self.rows[:max_items]

    def get_status_reason(self, _source_id: str) -> str:
        return self.status_reason


def _source(platform: str = "youtube", source_id: str = "SRC_1") -> TrendSource:
    return TrendSource(
        id=source_id,
        platform=platform,
        endpoint="videos.list",
        params={"regionCode": "US"},
        check_interval_minutes=15,
        enabled=True,
    )


def _item(title: str, url: str, platform: str = "youtube") -> TrendItem:
    row = TrendItem(
        platform=platform,
        category="music",
        title=title,
        url=url,
        published_date="2026-03-19",
        region_code="US",
        metric_type="view_count",
        metric_value=123,
    )
    row.content_hash = "placeholder"
    return row


async def test_scan_source_dispatches_dedups_and_stores_new_rows() -> None:
    new_item = _item("Fresh", "https://example.com/fresh")
    dup_item = _item("Duplicate", "https://example.com/dup")
    dup_hash = compute_content_hash(dup_item)

    trends_client = FakeTrendsClient(existing_hashes={dup_hash})
    fake_client = FakePlatformClient(rows=[new_item, dup_item])
    workflow_module.get_trend_client = lambda _platform: fake_client

    workflow = TrendsWorkflow(trends_client)
    result = await workflow.scan_source(_source())

    assert result == {
        "source_id": "SRC_1",
        "fetched": 2,
        "stored": 1,
        "duplicates": 1,
        "invalid": 0,
        "status": "success",
    }
    assert len(trends_client.created_items) == 1
    assert trends_client.created_items[0].content_hash == compute_content_hash(new_item)
    assert trends_client.status_updates[-1] == ("SRC_1", "success")


async def test_scan_source_partial_success_when_invalid_items_skipped() -> None:
    valid = _item("Valid", "https://example.com/valid")
    invalid = _item("", "https://example.com/invalid")

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[valid, invalid])
    workflow_module.get_trend_client = lambda _platform: fake_client

    workflow = TrendsWorkflow(trends_client)
    result = await workflow.scan_source(_source())

    assert result["fetched"] == 2
    assert result["stored"] == 1
    assert result["duplicates"] == 0
    assert result["invalid"] == 1
    assert result["status"] == "partial_success"
    assert trends_client.status_updates[-1] == ("SRC_1", "partial_success")


async def test_scan_source_sets_error_and_breaker_open_statuses() -> None:
    source = _source(platform="tiktok", source_id="TIKTOK_TRENDING")

    trends_client = FakeTrendsClient()
    error_client = FakePlatformClient(should_raise=True)
    workflow_module.get_trend_client = lambda _platform: error_client

    workflow = TrendsWorkflow(trends_client)
    error_result = await workflow.scan_source(source)
    assert error_result["status"] == "error"
    assert trends_client.status_updates[-1] == ("TIKTOK_TRENDING", "error")

    breaker_client = FakePlatformClient(
        rows=[], status_reason="disabled_circuit_breaker"
    )
    workflow_module.get_trend_client = lambda _platform: breaker_client
    breaker_result = await workflow.scan_source(source)
    assert breaker_result["status"] == "disabled_circuit_breaker"
    assert trends_client.status_updates[-1] == (
        "TIKTOK_TRENDING",
        "disabled_circuit_breaker",
    )


async def test_scan_all_continues_when_one_source_fails() -> None:
    class IsolationWorkflow(TrendsWorkflow):
        async def scan_source(self, source: TrendSource):
            if source.id == "BAD":
                raise RuntimeError("boom")
            return {
                "source_id": source.id,
                "fetched": 2,
                "stored": 1,
                "duplicates": 1,
                "invalid": 0,
                "status": "success",
            }

    workflow = IsolationWorkflow(FakeTrendsClient())
    result = await workflow.scan_all(
        [
            _source(source_id="GOOD_1"),
            _source(source_id="BAD"),
            _source(source_id="GOOD_2"),
        ]
    )

    assert result == {"fetched": 4, "stored": 2, "duplicates": 2, "sources_run": 2}


if __name__ == "__main__":
    asyncio.run(test_scan_source_dispatches_dedups_and_stores_new_rows())
    asyncio.run(test_scan_source_partial_success_when_invalid_items_skipped())
    asyncio.run(test_scan_source_sets_error_and_breaker_open_statuses())
    asyncio.run(test_scan_all_continues_when_one_source_fails())
    print("test_trends_workflow.py: ok")
