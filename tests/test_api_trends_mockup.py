import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


def _make_client() -> TestClient:
    from app import app

    app.router.lifespan_context = _noop_lifespan
    return TestClient(app)


def test_mockup_endpoint_returns_grouped_payload_from_nocodb_rows() -> None:
    from api.routes import trends as trends_route

    captured = {}
    rows = [
        {
            "id": "t1",
            "title": "Hero Trend",
            "platform": "youtube",
            "category": "music",
            "metric_value": 52000,
            "fetched_at": "2026-03-20T00:00:00Z",
        },
        {
            "id": "t2",
            "title": "Highlight Trend",
            "platform": "x",
            "category": "music",
            "metric_value": 32000,
            "fetched_at": "2026-03-19T23:00:00Z",
        },
        {
            "id": "t3",
            "title": "Latest Trend",
            "platform": "youtube",
            "category": "music",
            "metric_value": 12000,
            "fetched_at": "2026-03-19T22:00:00Z",
        },
    ]

    async def fake_query_trends(**kwargs):
        captured.update(kwargs)
        return rows

    original = trends_route.nocodb_trends.query_trends
    trends_route.nocodb_trends.query_trends = fake_query_trends

    client = _make_client()
    response = client.get(
        "/api/trends/mockup",
        params={"limit": 3, "platform": "youtube", "category": "music"},
    )

    trends_route.nocodb_trends.query_trends = original

    assert response.status_code == 200
    payload = response.json()

    assert payload["hero"]["id"] == "t1"
    assert [item["id"] for item in payload["highlights"]] == ["t2"]
    assert [item["id"] for item in payload["latest"]] == ["t1", "t2", "t3"]
    assert captured["limit"] == 3
    assert captured["platform"] == "youtube"
    assert captured["category"] == "music"
    assert captured["sort"] == "-fetched_at"


def test_mockup_endpoint_is_read_only_and_never_calls_refresh_workflow() -> None:
    from api.routes import trends as trends_route

    called = {"scan_source": 0}

    async def fake_query_trends(**_kwargs):
        return []

    async def fail_scan_source(_source):
        called["scan_source"] += 1
        raise AssertionError(
            "workflow.scan_source must not be called by mockup endpoint"
        )

    original_query = trends_route.nocodb_trends.query_trends
    original_scan = trends_route.workflow.scan_source

    trends_route.nocodb_trends.query_trends = fake_query_trends
    trends_route.workflow.scan_source = fail_scan_source

    client = _make_client()
    response = client.get("/api/trends/mockup")

    trends_route.nocodb_trends.query_trends = original_query
    trends_route.workflow.scan_source = original_scan

    assert response.status_code == 200
    assert called["scan_source"] == 0
    payload = response.json()
    assert payload["hero"] is None
    assert payload["highlights"] == []
    assert payload["latest"] == []
