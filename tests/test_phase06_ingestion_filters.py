"""
Phase 06 Plan 02 — Ingestion filter tests.

Tests for:
  - Metric threshold filter (FILT-02, FILT-03)
  - Keyword blocklist filter (FILT-05, FILT-06)
  - Combined filter behavior
  - Existing result keys preserved

Reuses FakeTrendsClient and FakePlatformClient patterns from test_trends_workflow.py.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import workflows.trends_workflow as workflow_module
from trend_agents.shared.models import TrendItem, TrendSource
from workflows.trends_workflow import TrendsWorkflow


# ---------------------------------------------------------------------------
# Fake infrastructure (mirrors test_trends_workflow.py)
# ---------------------------------------------------------------------------


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


def _source(
    platform: str = "youtube",
    source_id: str = "SRC_1",
    min_metric_value: int = 0,
    blocked_keywords=None,
) -> TrendSource:
    return TrendSource(
        id=source_id,
        platform=platform,
        endpoint="videos.list",
        params={"regionCode": "US"},
        check_interval_minutes=15,
        enabled=True,
        min_metric_value=min_metric_value,
        blocked_keywords=blocked_keywords or [],
    )


def _item(
    title: str = "Some Title",
    url: str = "https://example.com/item",
    metric_value: int = 1000,
    platform: str = "youtube",
) -> TrendItem:
    return TrendItem(
        platform=platform,
        category="music",
        title=title,
        url=url,
        published_date="2026-03-19",
        region_code="US",
        metric_type="view_count",
        metric_value=metric_value,
    )


# ---------------------------------------------------------------------------
# Threshold filter tests (FILT-02, FILT-03)
# ---------------------------------------------------------------------------


async def test_threshold_drops_item_below_floor() -> None:
    """Item with metric_value < min_metric_value is dropped; below_threshold = 1."""
    item = _item(title="Below Floor", metric_value=999)
    source = _source(min_metric_value=1000)

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["below_threshold"] == 1
    assert result["stored"] == 0
    assert trends_client.created_items == []


async def test_threshold_keeps_item_at_floor_boundary() -> None:
    """Item with metric_value == min_metric_value is kept (>= boundary)."""
    item = _item(title="At Floor", metric_value=1000)
    source = _source(min_metric_value=1000)

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["below_threshold"] == 0
    assert result["stored"] == 1


async def test_threshold_keeps_item_above_floor() -> None:
    """Item with metric_value > min_metric_value is kept."""
    item = _item(title="Above Floor", metric_value=5000)
    source = _source(min_metric_value=1000)

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["below_threshold"] == 0
    assert result["stored"] == 1


async def test_threshold_zero_passes_all_items() -> None:
    """min_metric_value=0 passes all items (existing behavior unchanged, FILT-03)."""
    items = [
        _item(title="Low", metric_value=0),
        _item(title="High", metric_value=999999, url="https://example.com/high"),
    ]
    source = _source(min_metric_value=0)

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=items)
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["below_threshold"] == 0
    assert result["stored"] == 2


async def test_threshold_result_key_always_present() -> None:
    """result dict always contains 'below_threshold' key even when filter not active."""
    source = _source(min_metric_value=0)
    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert "below_threshold" in result
    assert result["below_threshold"] == 0


# ---------------------------------------------------------------------------
# Blocklist filter tests (FILT-05, FILT-06)
# ---------------------------------------------------------------------------


async def test_blocklist_drops_exact_keyword_match() -> None:
    """Item title containing a blocked keyword is dropped; blocked = 1."""
    item = _item(title="Escort service listings")
    source = _source(blocked_keywords=["escort"])

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["blocked"] == 1
    assert result["stored"] == 0
    assert trends_client.created_items == []


async def test_blocklist_case_insensitive_match() -> None:
    """Blocklist match is case-insensitive — UPPERCASE keyword drops lowercase title."""
    item = _item(title="massage therapy tips")
    source = _source(blocked_keywords=["MASSAGE"])

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["blocked"] == 1
    assert result["stored"] == 0


async def test_blocklist_substring_match() -> None:
    """Blocked keyword appearing as substring in title triggers drop."""
    item = _item(title="Property escort listing details")
    source = _source(blocked_keywords=["escort"])

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["blocked"] == 1
    assert result["stored"] == 0


async def test_blocklist_empty_passes_all_items() -> None:
    """blocked_keywords=[] passes all items (existing behavior unchanged, FILT-06)."""
    items = [
        _item(title="Escort service"),
        _item(title="Massage therapy", url="https://example.com/massage"),
    ]
    source = _source(blocked_keywords=[])

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=items)
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["blocked"] == 0
    assert result["stored"] == 2


async def test_blocklist_result_key_always_present() -> None:
    """result dict always contains 'blocked' key even when filter not active."""
    source = _source(blocked_keywords=[])
    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert "blocked" in result
    assert result["blocked"] == 0


# ---------------------------------------------------------------------------
# Combined threshold + blocklist tests
# ---------------------------------------------------------------------------


async def test_threshold_runs_before_blocklist() -> None:
    """Items failing threshold are dropped before blocklist check runs."""
    # item_low: fails threshold (metric 500 < 1000), also has blocked keyword
    # item_ok: passes threshold (metric 1500 >= 1000), has blocked keyword → blocked
    # item_clean: passes threshold, no blocked keyword → stored
    item_low = _item(
        title="escort low", metric_value=500, url="https://example.com/low"
    )
    item_ok = _item(
        title="Escort high", metric_value=1500, url="https://example.com/ok"
    )
    item_clean = _item(
        title="Clean content", metric_value=2000, url="https://example.com/clean"
    )

    source = _source(min_metric_value=1000, blocked_keywords=["escort"])
    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item_low, item_ok, item_clean])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["below_threshold"] == 1  # item_low dropped by threshold
    assert result["blocked"] == 1  # item_ok dropped by blocklist
    assert result["stored"] == 1  # item_clean stored


async def test_both_filters_default_pass_all() -> None:
    """Source with min_metric_value=0 and blocked_keywords=[] stores all items (FILT-03 + FILT-06)."""
    items = [
        _item(title="escort", metric_value=0),
        _item(title="massage", metric_value=1, url="https://example.com/2"),
        _item(title="Normal content", metric_value=999999, url="https://example.com/3"),
    ]
    source = _source(min_metric_value=0, blocked_keywords=[])

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=items)
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    assert result["below_threshold"] == 0
    assert result["blocked"] == 0
    assert result["stored"] == 3


# ---------------------------------------------------------------------------
# Existing result keys preserved
# ---------------------------------------------------------------------------


async def test_existing_result_keys_preserved_with_filters_active() -> None:
    """All original result keys remain present when both filters are active."""
    item = _item(title="Valid content", metric_value=5000)
    source = _source(min_metric_value=1000, blocked_keywords=["spam"])

    trends_client = FakeTrendsClient()
    fake_client = FakePlatformClient(rows=[item])
    workflow_module.get_trend_client = lambda _: fake_client

    result = await TrendsWorkflow(trends_client).scan_source(source)

    for key in ("source_id", "fetched", "stored", "duplicates", "invalid", "status"):
        assert key in result, f"Missing key: {key}"
    assert "below_threshold" in result
    assert "blocked" in result


if __name__ == "__main__":
    asyncio.run(test_threshold_drops_item_below_floor())
    asyncio.run(test_threshold_keeps_item_at_floor_boundary())
    asyncio.run(test_threshold_keeps_item_above_floor())
    asyncio.run(test_threshold_zero_passes_all_items())
    asyncio.run(test_threshold_result_key_always_present())
    asyncio.run(test_blocklist_drops_exact_keyword_match())
    asyncio.run(test_blocklist_case_insensitive_match())
    asyncio.run(test_blocklist_substring_match())
    asyncio.run(test_blocklist_empty_passes_all_items())
    asyncio.run(test_blocklist_result_key_always_present())
    asyncio.run(test_threshold_runs_before_blocklist())
    asyncio.run(test_both_filters_default_pass_all())
    asyncio.run(test_existing_result_keys_preserved_with_filters_active())
    print("test_phase06_ingestion_filters.py: ok")
