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


if __name__ == "__main__":
    test_cursor_codec_round_trip()
    test_limit_validator_defaults_and_caps()
    test_invalid_cursor_path_uses_invalid_cursor_error()
    test_get_trends_returns_items_and_paging_envelope()
    test_get_trend_by_id_returns_not_found_payload()
    test_get_trends_enforces_limit_defaults_and_caps()
    test_get_trends_rejects_invalid_cursor_with_400()
    print("test_api_trends_read.py: ok")
