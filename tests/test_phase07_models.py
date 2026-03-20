"""Phase 07 — Status contract tests for TrendItem and NocoDB serialization."""

import pytest

from trend_agents.shared.models import TrendItem
from tools.nocodb_trends_client import NocoDBTrendsClient


def _make_item(**kwargs) -> TrendItem:
    defaults = dict(
        platform="youtube",
        title="Test Trend",
        url="https://example.com",
    )
    defaults.update(kwargs)
    return TrendItem(**defaults)


def _client() -> NocoDBTrendsClient:
    return NocoDBTrendsClient.__new__(NocoDBTrendsClient)


# ---------------------------------------------------------------------------
# TrendItem status field
# ---------------------------------------------------------------------------


def test_trend_item_default_status_is_none():
    """TrendItem constructed without status exposes status=None."""
    item = _make_item()
    assert item.status is None


def test_trend_item_explicit_status_preserved():
    """TrendItem accepts and retains an explicit status value."""
    item = _make_item(status="approved")
    assert item.status == "approved"


def test_trend_item_existing_fields_unaffected():
    """Adding status field does not break existing TrendItem constructor."""
    item = _make_item(category="gaming", metric_value=100, region_code="SA")
    assert item.category == "gaming"
    assert item.metric_value == 100
    assert item.region_code == "SA"


# ---------------------------------------------------------------------------
# _item_to_record serialization
# ---------------------------------------------------------------------------


def test_item_to_record_defaults_status_to_pending():
    """_item_to_record writes 'pending' when TrendItem.status is unset."""
    client = _client()
    item = _make_item()
    record = client._item_to_record(item)
    assert record["status"] == "pending"


def test_item_to_record_preserves_approved():
    """_item_to_record preserves explicit status='approved'."""
    client = _client()
    item = _make_item(status="approved")
    record = client._item_to_record(item)
    assert record["status"] == "approved"


def test_item_to_record_preserves_rejected():
    """_item_to_record preserves explicit status='rejected'."""
    client = _client()
    item = _make_item(status="rejected")
    record = client._item_to_record(item)
    assert record["status"] == "rejected"


def test_item_to_record_contains_all_existing_keys():
    """_item_to_record does not drop any pre-existing fields."""
    client = _client()
    item = _make_item()
    record = client._item_to_record(item)
    expected_keys = {
        "platform",
        "category",
        "title",
        "description",
        "url",
        "thumbnail_url",
        "published_date",
        "metric_type",
        "metric_value",
        "region_code",
        "metadata",
        "content_hash",
        "fetched_at",
        "notification_sent",
        "ar_translation",
        "status",
    }
    assert expected_keys.issubset(record.keys())
