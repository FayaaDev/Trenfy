from datetime import datetime, timedelta, timezone

import workflows.trends_scheduler as scheduler_module
from trend_agents.shared.models import TrendSource
from workflows.trends_scheduler import TrendsScheduler, _parse_timestamp


def _source(source_id: str, interval: int = 15) -> TrendSource:
    return TrendSource(
        id=source_id,
        platform="youtube",
        endpoint="videos.list",
        check_interval_minutes=interval,
        enabled=True,
    )


class FakeNocoDB:
    def __init__(self, rows):
        self.rows = rows

    async def query_sources(self, platform=None, enabled_only=False):
        return self.rows


class FakeWorkflow:
    def __init__(self):
        self.source_ids = []

    async def scan_source(self, source):
        self.source_ids.append(source.id)
        return {
            "source_id": source.id,
            "fetched": 3,
            "stored": 2,
            "duplicates": 1,
            "status": "success",
        }


async def test_run_due_sources_uses_nocodb_state_and_batch_limit(monkeypatch):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    sources = [
        _source("OLD_DUE", interval=15),
        _source("RECENT_NOT_DUE", interval=15),
        _source("DISABLED", interval=15),
        _source("MISSING_ROW_DUE", interval=15),
    ]
    rows = [
        {
            "id": "OLD_DUE",
            "enabled": True,
            "last_fetched_at": (now - timedelta(minutes=20)).isoformat(),
        },
        {
            "id": "RECENT_NOT_DUE",
            "enabled": True,
            "last_fetched_at": (now - timedelta(minutes=5)).isoformat(),
        },
        {"id": "DISABLED", "enabled": False, "last_fetched_at": None},
    ]

    fake_workflow = FakeWorkflow()
    monkeypatch.setattr(scheduler_module.source_registry, "list_enabled", lambda: sources)
    monkeypatch.setattr(scheduler_module, "nocodb_trends", FakeNocoDB(rows))
    monkeypatch.setattr(scheduler_module, "workflow", fake_workflow)

    result = await TrendsScheduler().run_due_sources(batch_size=1)

    assert fake_workflow.source_ids == ["OLD_DUE"]
    assert result["sources_due"] == 2
    assert result["sources_run"] == 1
    assert result["skipped_disabled"] == 1
    assert result["skipped_not_due"] == 1
    assert result["fetched"] == 3
    assert result["stored"] == 2
    assert result["duplicates"] == 1


def test_parse_timestamp_accepts_z_suffix_as_utc_naive():
    assert _parse_timestamp("2026-05-26T10:00:00Z") == datetime(2026, 5, 26, 10, 0)


def test_parse_timestamp_invalid_returns_none():
    assert _parse_timestamp("not-a-date") is None
