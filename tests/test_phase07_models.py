"""Phase 07 — Status contract tests for TrendItem, NocoDB serialization, and validation."""

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


# ---------------------------------------------------------------------------
# validate_status_filter contract (api/contracts.py)
# ---------------------------------------------------------------------------


def test_validate_status_filter_none_returns_none():
    """validate_status_filter(None) passes through as None."""
    from api.contracts import validate_status_filter

    assert validate_status_filter(None) is None


def test_validate_status_filter_blank_returns_none():
    """validate_status_filter('  ') returns None."""
    from api.contracts import validate_status_filter

    assert validate_status_filter("   ") is None


def test_validate_status_filter_normalizes_case():
    """validate_status_filter(' Approved ') returns 'approved'."""
    from api.contracts import validate_status_filter

    assert validate_status_filter(" Approved ") == "approved"


def test_validate_status_filter_pending_passes():
    """validate_status_filter('pending') returns 'pending'."""
    from api.contracts import validate_status_filter

    assert validate_status_filter("pending") == "pending"


def test_validate_status_filter_rejected_passes():
    """validate_status_filter('rejected') returns 'rejected'."""
    from api.contracts import validate_status_filter

    assert validate_status_filter("rejected") == "rejected"


def test_validate_status_filter_invalid_raises():
    """validate_status_filter('archived') raises ValueError('invalid_status')."""
    from api.contracts import validate_status_filter

    try:
        validate_status_filter("archived")
    except ValueError as e:
        assert str(e) == "invalid_status"
    else:
        raise AssertionError("expected ValueError('invalid_status')")


# ---------------------------------------------------------------------------
# PatchTrendRequest contract (api/contracts.py)
# ---------------------------------------------------------------------------


def test_patch_trend_request_model_dump_excludes_unset():
    """model_dump(exclude_unset=True) only includes explicitly provided fields."""
    from api.contracts import PatchTrendRequest

    req = PatchTrendRequest(status="approved")
    updates = req.updates()
    assert updates == {"status": "approved"}


def test_patch_trend_request_preserves_empty_string_for_non_title():
    """Empty description is preserved (not dropped) because it is explicitly set."""
    from api.contracts import PatchTrendRequest

    req = PatchTrendRequest(description="")
    updates = req.updates()
    assert "description" in updates
    assert updates["description"] == ""


def test_patch_trend_request_invalid_status_raises():
    """PatchTrendRequest(status='archived') raises a validation error."""
    import pytest
    from pydantic import ValidationError

    from api.contracts import PatchTrendRequest

    with pytest.raises(ValidationError):
        PatchTrendRequest(status="archived")
