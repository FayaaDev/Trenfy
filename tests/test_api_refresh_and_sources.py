import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from trend_agents.shared.models import TrendSource


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


def _make_client() -> TestClient:
    from app import app

    app.router.lifespan_context = _noop_lifespan
    return TestClient(app)


def _sample_source(source_id: str, platform: str) -> TrendSource:
    return TrendSource(id=source_id, name=source_id, platform=platform, enabled=True)


def test_refresh_rejects_payload_with_both_source_id_and_platform() -> None:
    client = _make_client()
    response = client.post(
        "/api/trends/refresh",
        json={"source_id": "youtube_us", "platform": "youtube"},
    )

    assert response.status_code == 422
    assert response.json() == {"error": "invalid_refresh_selector"}


def test_refresh_by_source_id_runs_exactly_one_source() -> None:
    from api.routes import trends as trends_route

    source = _sample_source("youtube_us", "youtube")
    seen = {"source_ids": []}

    def fake_get_source(source_id: str):
        return source if source_id == "youtube_us" else None

    async def fake_scan_source(source):
        seen["source_ids"].append(source.id)
        return {
            "source_id": source.id,
            "fetched": 12,
            "stored": 7,
            "duplicates": 5,
            "invalid": 0,
            "status": "success",
        }

    original_get_source = trends_route.source_registry.get_source
    original_scan_source = trends_route.workflow.scan_source
    trends_route.source_registry.get_source = fake_get_source
    trends_route.workflow.scan_source = fake_scan_source

    client = _make_client()
    response = client.post("/api/trends/refresh", json={"source_id": "youtube_us"})

    trends_route.source_registry.get_source = original_get_source
    trends_route.workflow.scan_source = original_scan_source

    assert response.status_code == 200
    assert seen["source_ids"] == ["youtube_us"]
    payload = response.json()
    assert payload["sources_run"] == 1
    assert payload["fetched"] == 12
    assert payload["stored"] == 7
    assert payload["duplicates"] == 5
    assert payload["results"] == [
        {
            "source_id": "youtube_us",
            "fetched": 12,
            "stored": 7,
            "duplicates": 5,
            "invalid": 0,
            "status": "success",
        }
    ]


def test_refresh_platform_all_runs_all_enabled_sources() -> None:
    from api.routes import trends as trends_route

    enabled_sources = [
        _sample_source("youtube_us", "youtube"),
        _sample_source("x_global", "x"),
    ]
    seen = {"source_ids": []}

    def fake_list_enabled():
        return enabled_sources

    async def fake_scan_source(source):
        seen["source_ids"].append(source.id)
        return {
            "source_id": source.id,
            "fetched": 3,
            "stored": 2,
            "duplicates": 1,
            "invalid": 0,
            "status": "success",
        }

    original_list_enabled = trends_route.source_registry.list_enabled
    original_scan_source = trends_route.workflow.scan_source
    trends_route.source_registry.list_enabled = fake_list_enabled
    trends_route.workflow.scan_source = fake_scan_source

    client = _make_client()
    response = client.post("/api/trends/refresh", json={"platform": "all"})

    trends_route.source_registry.list_enabled = original_list_enabled
    trends_route.workflow.scan_source = original_scan_source

    assert response.status_code == 200
    assert seen["source_ids"] == ["youtube_us", "x_global"]
    payload = response.json()
    assert payload["sources_run"] == 2
    assert payload["fetched"] == 6
    assert payload["stored"] == 4
    assert payload["duplicates"] == 2
    assert len(payload["results"]) == 2


def test_get_sources_returns_status_focused_fields_only() -> None:
    from api.routes import trends as trends_route

    async def fake_query_sources(platform=None, enabled_only=False):
        return [
            {
                "Id": 18,
                "id": "youtube_us",
                "name": "YouTube US",
                "platform": "youtube",
                "last_fetched_at": "2026-03-19T10:00:00Z",
                "last_fetch_status": "success",
                "enabled": True,
                "xc-token": "secret-should-never-leak",
                "params": '{"region":"US"}',
            }
        ]

    original_query_sources = trends_route.nocodb_trends.query_sources
    trends_route.nocodb_trends.query_sources = fake_query_sources

    client = _make_client()
    response = client.get("/api/sources")

    trends_route.nocodb_trends.query_sources = original_query_sources

    assert response.status_code == 200
    payload = response.json()
    assert payload == [
        {
            "id": "youtube_us",
            "name": "YouTube US",
            "platform": "youtube",
            "last_fetched_at": "2026-03-19T10:00:00Z",
            "last_fetch_status": "success",
            "enabled": True,
        }
    ]


def test_get_sources_platform_filter_is_forwarded() -> None:
    from api.routes import trends as trends_route

    seen = {}

    async def fake_query_sources(platform=None, enabled_only=False):
        seen["platform"] = platform
        seen["enabled_only"] = enabled_only
        return [
            {
                "id": "x_global",
                "name": "X Global",
                "platform": "x",
                "last_fetched_at": None,
                "last_fetch_status": "",
                "enabled": False,
            }
        ]

    original_query_sources = trends_route.nocodb_trends.query_sources
    trends_route.nocodb_trends.query_sources = fake_query_sources

    client = _make_client()
    response = client.get("/api/sources", params={"platform": "x"})

    trends_route.nocodb_trends.query_sources = original_query_sources

    assert response.status_code == 200
    assert seen == {"platform": "x", "enabled_only": False}
    assert response.json()[0]["id"] == "x_global"


def test_patch_trend_updates_fields_and_returns_updated_trend() -> None:
    from api.routes import trends as trends_route

    existing = {"Id": "5", "title": "Old Title", "status": "pending"}
    updated = {"Id": "5", "title": "New Title", "status": "approved"}
    call_count = {"n": 0}

    async def fake_update_trend(record_id, updates):
        call_count["n"] += 1
        return updated

    original_update = trends_route.nocodb_trends.update_trend
    trends_route.nocodb_trends.update_trend = fake_update_trend

    client = _make_client()
    response = client.patch(
        "/api/trends/5", json={"title": "New Title", "status": "approved"}
    )

    trends_route.nocodb_trends.update_trend = original_update

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["title"] == "New Title"
    assert call_count["n"] == 1


def test_patch_trend_returns_404_when_not_found() -> None:
    from api.routes import trends as trends_route

    async def fake_update_trend(record_id, updates):
        return None

    original_update = trends_route.nocodb_trends.update_trend
    trends_route.nocodb_trends.update_trend = fake_update_trend

    client = _make_client()
    response = client.patch("/api/trends/999", json={"status": "approved"})

    trends_route.nocodb_trends.update_trend = original_update

    assert response.status_code == 404
    payload = response.json()
    assert payload["error"] == "trend_not_found"
    assert payload["id"] == "999"


def test_patch_trend_rejects_invalid_status() -> None:
    client = _make_client()
    response = client.patch("/api/trends/5", json={"status": "archived"})
    assert response.status_code == 422


def test_delete_trend_returns_deleted_ack_on_success() -> None:
    from api.routes import trends as trends_route

    existing = {"Id": "3", "title": "To Delete"}

    async def fake_get_trend(record_id):
        return existing

    async def fake_delete_trend(record_id):
        return True

    original_get = trends_route.nocodb_trends.get_trend_by_id
    original_delete = trends_route.nocodb_trends.delete_trend
    trends_route.nocodb_trends.get_trend_by_id = fake_get_trend
    trends_route.nocodb_trends.delete_trend = fake_delete_trend

    client = _make_client()
    response = client.delete("/api/trends/3")

    trends_route.nocodb_trends.get_trend_by_id = original_get
    trends_route.nocodb_trends.delete_trend = original_delete

    assert response.status_code == 200
    payload = response.json()
    assert payload == {"id": "3", "deleted": True}


def test_delete_trend_returns_404_when_not_found() -> None:
    from api.routes import trends as trends_route

    async def fake_get_trend(record_id):
        return None

    original_get = trends_route.nocodb_trends.get_trend_by_id
    trends_route.nocodb_trends.get_trend_by_id = fake_get_trend

    client = _make_client()
    response = client.delete("/api/trends/999")

    trends_route.nocodb_trends.get_trend_by_id = original_get

    assert response.status_code == 404
    payload = response.json()
    assert payload["error"] == "trend_not_found"
    assert payload["id"] == "999"


if __name__ == "__main__":
    test_refresh_rejects_payload_with_both_source_id_and_platform()
    test_refresh_by_source_id_runs_exactly_one_source()
    test_refresh_platform_all_runs_all_enabled_sources()
    test_get_sources_returns_status_focused_fields_only()
    test_get_sources_platform_filter_is_forwarded()
    print("test_api_refresh_and_sources.py: ok")
