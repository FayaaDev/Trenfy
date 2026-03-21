import sys
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


def _make_client() -> TestClient:
    from app import app

    app.router.lifespan_context = _noop_lifespan
    return TestClient(app)


def test_cursor_codec_round_trip() -> None:
    from api.contracts import decode_cursor, encode_cursor

    cursor = encode_cursor(offset=150, sort="-published_date")
    decoded = decode_cursor(cursor)

    assert decoded == {"offset": 150, "sort": "-published_date"}


def test_limit_validator_defaults_and_caps() -> None:
    from api.contracts import DEFAULT_LIMIT, MAX_LIMIT, normalize_limit

    assert normalize_limit(None) == DEFAULT_LIMIT
    assert normalize_limit(MAX_LIMIT + 1) == MAX_LIMIT


def test_invalid_cursor_path_uses_invalid_cursor_error() -> None:
    from api.contracts import decode_cursor

    try:
        decode_cursor("not-base64")
    except ValueError as error:
        assert str(error) == "invalid_cursor"
    else:
        raise AssertionError("expected invalid_cursor error")


def test_get_trends_returns_items_and_paging_envelope() -> None:
    from api.routes import trends as trends_route

    calls = {}

    async def fake_query_trends(**kwargs):
        calls.update(kwargs)
        return [{"id": "r1"}, {"id": "r2"}]

    original = trends_route.nocodb_trends.query_trends
    trends_route.nocodb_trends.query_trends = fake_query_trends

    client = _make_client()
    response = client.get(
        "/api/trends",
        params={"limit": 2, "start_date": "2026-01-01", "end_date": "2026-01-31"},
    )

    trends_route.nocodb_trends.query_trends = original

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == [{"id": "r1"}, {"id": "r2"}]
    assert payload["paging"]["has_more"] is True
    assert payload["paging"]["next_cursor"]
    assert calls["sort"] == "-fetched_at"
    assert calls["start_date"] == "2026-01-01"
    assert calls["end_date"] == "2026-01-31"


def test_get_trend_by_id_returns_not_found_payload() -> None:
    from api.routes import trends as trends_route

    async def fake_get_trend_by_id(_record_id):
        return None

    original = trends_route.nocodb_trends.get_trend_by_id
    trends_route.nocodb_trends.get_trend_by_id = fake_get_trend_by_id

    client = _make_client()
    response = client.get("/api/trends/missing-id")

    trends_route.nocodb_trends.get_trend_by_id = original

    assert response.status_code == 404
    assert response.json() == {"error": "trend_not_found", "id": "missing-id"}


def test_get_trends_enforces_limit_defaults_and_caps() -> None:
    from api.routes import trends as trends_route

    calls = []

    async def fake_query_trends(**kwargs):
        calls.append(kwargs)
        return []

    original = trends_route.nocodb_trends.query_trends
    trends_route.nocodb_trends.query_trends = fake_query_trends

    client = _make_client()
    response = client.get("/api/trends", params={"limit": 999})
    default_response = client.get("/api/trends")

    trends_route.nocodb_trends.query_trends = original

    assert response.status_code == 200
    assert response.json()["paging"]["limit"] == 200
    assert default_response.status_code == 200
    assert default_response.json()["paging"]["limit"] == 50
    assert calls[0]["limit"] == 200
    assert calls[1]["limit"] == 50


def test_get_trends_rejects_invalid_cursor_with_400() -> None:
    client = _make_client()
    response = client.get("/api/trends", params={"cursor": "bad-cursor"})

    assert response.status_code == 400
    assert response.json() == {"error": "invalid_cursor"}


def test_get_trends_stats_returns_platform_totals_and_recency() -> None:
    from api.routes import trends as trends_route

    async def fake_get_statistics():
        return {
            "total_trends": 11,
            "by_platform": [
                {
                    "platform": "youtube",
                    "total_trends": 5,
                    "newest_fetched_at": "2026-03-19T10:00:00Z",
                },
                {
                    "platform": "x",
                    "total_trends": 6,
                    "newest_fetched_at": None,
                },
            ],
        }

    original = trends_route.nocodb_trends.get_statistics
    trends_route.nocodb_trends.get_statistics = fake_get_statistics

    client = _make_client()
    response = client.get("/api/trends/stats")

    trends_route.nocodb_trends.get_statistics = original

    assert response.status_code == 200
    payload = response.json()
    by_platform = payload["by_platform"]
    assert {row["platform"] for row in by_platform} == {
        "youtube",
        "x",
    }
    assert payload["total_trends"] == sum(row["total_trends"] for row in by_platform)


def test_get_categories_returns_sorted_unique_labels() -> None:
    from api.routes import trends as trends_route

    async def fake_query_trends(**kwargs):
        assert kwargs["status"] == "approved"
        return [
            {"category": "music"},
            {"category": " gaming "},
            {"category": "music"},
            {"category": ""},
            {},
            {"category": "world_news"},
        ]

    with patch.object(trends_route.nocodb_trends, "query_trends", fake_query_trends):
        client = _make_client()
        response = client.get("/api/categories")

    assert response.status_code == 200
    assert response.json() == [
        {"value": "gaming", "label": "Gaming"},
        {"value": "music", "label": "Music"},
        {"value": "world_news", "label": "World News"},
    ]


def test_health_integrations_reports_config_without_leaking_secrets() -> None:
    import os

    keys = ["YOUTUBE_API_KEY", "X_BEARER_TOKEN", "NOCODB_API_TOKEN"]
    original_values = {key: os.getenv(key) for key in keys}

    os.environ["YOUTUBE_API_KEY"] = "yt-secret-value"
    os.environ["X_BEARER_TOKEN"] = ""
    os.environ["NOCODB_API_TOKEN"] = "nocodb-secret-value"

    try:
        client = _make_client()
        response = client.get("/health/integrations")
    finally:
        for key, value in original_values.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["credentials"] == {
        "youtube_api_key_configured": True,
        "x_bearer_token_configured": False,
        "nocodb_api_token_configured": True,
    }
    assert "youtube" in payload["platform_source_counts"]
    assert "x" in payload["platform_source_counts"]
    assert "yt-secret-value" not in response.text
    assert "nocodb-secret-value" not in response.text


if __name__ == "__main__":
    test_cursor_codec_round_trip()
    test_limit_validator_defaults_and_caps()
    test_invalid_cursor_path_uses_invalid_cursor_error()
    test_get_trends_returns_items_and_paging_envelope()
    test_get_trend_by_id_returns_not_found_payload()
    test_get_trends_enforces_limit_defaults_and_caps()
    test_get_trends_rejects_invalid_cursor_with_400()
    test_get_trends_stats_returns_platform_totals_and_recency()
    test_health_integrations_reports_config_without_leaking_secrets()
    print("test_api_trends_read.py: ok")


# ---------------------------------------------------------------------------
# Phase 07 — status filter tests
# ---------------------------------------------------------------------------


def test_get_trends_with_valid_status_forwards_to_client() -> None:
    """GET /api/trends?status=approved passes status='approved' into query_trends."""
    from api.routes import trends as trends_route

    calls = {}

    async def fake_query_trends(**kwargs):
        calls.update(kwargs)
        return []

    original = trends_route.nocodb_trends.query_trends
    trends_route.nocodb_trends.query_trends = fake_query_trends

    client = _make_client()
    response = client.get("/api/trends", params={"status": "approved"})

    trends_route.nocodb_trends.query_trends = original

    assert response.status_code == 200
    assert calls.get("status") == "approved"


def test_get_trends_with_invalid_status_returns_400() -> None:
    """GET /api/trends?status=invalid returns 400 with error 'invalid_status'."""
    client = _make_client()
    response = client.get("/api/trends", params={"status": "archived"})

    assert response.status_code == 400
    assert response.json() == {"error": "invalid_status"}


def test_normalize_trend_status_treats_null_as_pending() -> None:
    """_normalize_trend_status returns 'pending' for None, empty, and whitespace."""
    from tools.nocodb_trends_client import NocoDBTrendsClient

    client_instance = NocoDBTrendsClient.__new__(NocoDBTrendsClient)

    assert client_instance._normalize_trend_status({}) == "pending"
    assert client_instance._normalize_trend_status({"status": None}) == "pending"
    assert client_instance._normalize_trend_status({"status": ""}) == "pending"
    assert client_instance._normalize_trend_status({"status": "  "}) == "pending"
    assert client_instance._normalize_trend_status({"status": "approved"}) == "approved"
    assert (
        client_instance._normalize_trend_status({"status": " Rejected "}) == "rejected"
    )
