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
        _sample_source("spotify_global", "spotify"),
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
    assert seen["source_ids"] == ["youtube_us", "spotify_global"]
    payload = response.json()
    assert payload["sources_run"] == 2
    assert payload["fetched"] == 6
    assert payload["stored"] == 4
    assert payload["duplicates"] == 2
    assert len(payload["results"]) == 2


if __name__ == "__main__":
    test_refresh_rejects_payload_with_both_source_id_and_platform()
    test_refresh_by_source_id_runs_exactly_one_source()
    test_refresh_platform_all_runs_all_enabled_sources()
    print("test_api_refresh_and_sources.py: ok")
