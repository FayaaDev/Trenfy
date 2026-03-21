"""
Phase 06-04: Tests for API filter behaviors.
Covers query_trends() extensions and list_trends() API route additions.
"""

import asyncio
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ============================================================
# TASK 1: query_trends() filter logic tests
# ============================================================


@pytest.fixture
def client_instance():
    """Return a NocoDBTrendsClient with mocked _request method."""
    from tools.nocodb_trends_client import NocoDBTrendsClient

    c = NocoDBTrendsClient.__new__(NocoDBTrendsClient)
    c.base_url = "http://nocodb:8080"
    c.internal_base_url = "http://nocodb:8080"
    c.public_base_url = ""
    c.api_token = "testtoken"
    c.trends_table_id = "test_table"
    c.sources_table_id = ""
    return c


def _make_mock_response(items: Optional[List[Dict]] = None) -> MagicMock:
    """Create a mock httpx.Response returning list of items."""
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"list": items or []}
    return mock_resp


# ---- Multi-platform (anyof) ----


@pytest.mark.asyncio
async def test_query_trends_multi_platform_uses_anyof(client_instance):
    """platform='youtube,x' should produce (platform,anyof,youtube,x) filter."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(platform="youtube,x")

    where = captured["params"].get("where", "")
    assert "(platform,anyof,youtube,x)" in where, f"Expected anyof, got: {where!r}"


@pytest.mark.asyncio
async def test_query_trends_single_platform_uses_eq(client_instance):
    """platform='youtube' (no comma) should produce (platform,eq,youtube)."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(platform="youtube")

    where = captured["params"].get("where", "")
    assert "(platform,eq,youtube)" in where, f"Expected eq filter, got: {where!r}"
    assert "anyof" not in where


@pytest.mark.asyncio
async def test_query_trends_multi_category_uses_anyof(client_instance):
    """category='gaming,music' should produce (category,anyof,gaming,music)."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(category="gaming,music")

    where = captured["params"].get("where", "")
    assert "(category,anyof,gaming,music)" in where, (
        f"Expected category anyof, got: {where!r}"
    )


@pytest.mark.asyncio
async def test_query_trends_no_platform_no_filter(client_instance):
    """platform=None should not add any platform filter."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(platform=None)

    where = captured["params"].get("where", "")
    assert "platform" not in where


# ---- Full-text search (q) ----


@pytest.mark.asyncio
async def test_query_trends_q_builds_like_filter(client_instance):
    """q='taylor' should produce like filter on title and description."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(q="taylor")

    where = captured["params"].get("where", "")
    assert "title,like,%taylor%" in where, f"Expected title like, got: {where!r}"
    assert "description,like,%taylor%" in where, f"Expected desc like, got: {where!r}"
    assert "~or" in where


@pytest.mark.asyncio
async def test_query_trends_empty_q_no_filter(client_instance):
    """q='' should not add search filter."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(q="")

    where = captured["params"].get("where", "")
    assert "like" not in where


@pytest.mark.asyncio
async def test_query_trends_whitespace_q_no_filter(client_instance):
    """q='   ' (whitespace) should not add search filter."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(q="   ")

    where = captured["params"].get("where", "")
    assert "like" not in where


@pytest.mark.asyncio
async def test_query_trends_none_q_no_filter(client_instance):
    """q=None should not add search filter."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(q=None)

    where = captured["params"].get("where", "")
    assert "like" not in where


# ---- Metric floor (min_metric_value) ----


@pytest.mark.asyncio
async def test_query_trends_min_metric_value_builds_gte_filter(client_instance):
    """min_metric_value=1000 should produce (metric_value,gte,1000)."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(min_metric_value=1000)

    where = captured["params"].get("where", "")
    assert "(metric_value,gte,1000)" in where, f"Expected gte filter, got: {where!r}"


@pytest.mark.asyncio
async def test_query_trends_none_min_metric_no_filter(client_instance):
    """min_metric_value=None should not add metric filter."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(min_metric_value=None)

    where = captured["params"].get("where", "")
    assert "metric_value,gte" not in where


# ---- Combined filters ----


@pytest.mark.asyncio
async def test_query_trends_all_filters_combined(client_instance):
    """All three new filters together should all appear in where string."""
    captured: Dict[str, Any] = {}

    async def mock_request(
        method, path, *, params=None, json_body=None, allow_404=False
    ):
        captured["params"] = params or {}
        return _make_mock_response()

    client_instance._request = mock_request
    await client_instance.query_trends(
        platform="youtube,x", q="gaming", min_metric_value=500
    )

    where = captured["params"].get("where", "")
    assert "(platform,anyof,youtube,x)" in where
    assert "gaming" in where
    assert "(metric_value,gte,500)" in where


# ============================================================
# TASK 2: list_trends() API route tests
# ============================================================


@pytest.fixture
def test_app():
    """Create FastAPI TestClient with mocked nocodb_trends."""
    from fastapi import FastAPI
    from api.routes.trends import trends_router

    app = FastAPI()
    app.include_router(trends_router)
    return app


@pytest.fixture
def mock_query_trends():
    """Mock nocodb_trends.query_trends to return empty list."""
    with patch("api.routes.trends.nocodb_trends") as mock_nocodb:
        mock_nocodb.query_trends = AsyncMock(return_value=[])
        yield mock_nocodb


def test_sort_by_metric_value_passes_correct_sort(test_app, mock_query_trends):
    """sort_by=metric_value should pass sort='-metric_value' to query_trends."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?sort_by=metric_value")
    assert response.status_code == 200
    call_kwargs = mock_query_trends.query_trends.call_args
    sort_arg = (
        call_kwargs.kwargs.get("sort") or call_kwargs.args[7]
        if call_kwargs.args
        else None
    )
    # Access via kwargs
    kwargs = call_kwargs.kwargs
    assert kwargs.get("sort") == "-metric_value", (
        f"Expected -metric_value, got: {kwargs.get('sort')}"
    )


def test_sort_by_published_date_passes_correct_sort(test_app, mock_query_trends):
    """sort_by=published_date should pass sort='-published_date'."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?sort_by=published_date")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("sort") == "-published_date"


def test_sort_by_invalid_falls_back_to_fetched_at(test_app, mock_query_trends):
    """sort_by=invalid should silently fall back to -fetched_at, returning 200."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?sort_by=foobar_invalid")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("sort") == "-fetched_at"


def test_sort_by_none_defaults_to_fetched_at(test_app, mock_query_trends):
    """No sort_by should use -fetched_at default."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("sort") == "-fetched_at"


def test_min_metric_value_valid_int_passed(test_app, mock_query_trends):
    """min_metric_value=1000 should pass int 1000 to query_trends."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?min_metric_value=1000")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("min_metric_value") == 1000


def test_min_metric_value_invalid_returns_400(test_app, mock_query_trends):
    """min_metric_value=abc should return 400 with error invalid_min_metric_value."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?min_metric_value=abc")
    assert response.status_code == 400
    assert response.json().get("error") == "invalid_min_metric_value"


def test_q_param_passed_to_query_trends(test_app, mock_query_trends):
    """q=gaming should be passed directly to query_trends."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?q=gaming")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("q") == "gaming"


def test_platform_multi_value_passed_unchanged(test_app, mock_query_trends):
    """platform=youtube,x should be passed as-is (multi-value logic in query_trends)."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?platform=youtube%2Cx")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("platform") == "youtube,x"


def test_category_multi_value_passed_unchanged(test_app, mock_query_trends):
    """category=gaming,music should be passed as-is for query_trends anyof logic."""
    with TestClient(test_app) as client:
        response = client.get("/api/trends?category=gaming%2Cmusic")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("category") == "gaming,music"


def test_cursor_sort_takes_precedence_over_sort_by(test_app, mock_query_trends):
    """When cursor is present, cursor's sort overrides sort_by param."""
    from api.contracts import encode_cursor

    cursor = encode_cursor(50, sort="-metric_value")
    with TestClient(test_app) as client:
        # sort_by=fetched_at but cursor has metric_value — cursor wins
        response = client.get(f"/api/trends?sort_by=fetched_at&cursor={cursor}")
    assert response.status_code == 200
    kwargs = mock_query_trends.query_trends.call_args.kwargs
    assert kwargs.get("sort") == "-metric_value"
