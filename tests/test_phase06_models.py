"""
Phase 06 — Data Filtering: Model contract tests (RED phase).
Tests the new fields on TrendSource and TrendItem introduced in Phase 6.
"""

import pytest
from trend_agents.shared.models import TrendItem, TrendSource


class TestTrendSourcePhase6Fields:
    """TrendSource must have min_metric_value and blocked_keywords with safe defaults."""

    def test_trend_source_default_min_metric_value_is_zero(self):
        """min_metric_value defaults to 0 when not provided."""
        source = TrendSource(id="X", platform="youtube")
        assert source.min_metric_value == 0

    def test_trend_source_default_blocked_keywords_is_empty_list(self):
        """blocked_keywords defaults to [] when not provided."""
        source = TrendSource(id="X", platform="youtube")
        assert source.blocked_keywords == []

    def test_trend_source_accepts_min_metric_value(self):
        """min_metric_value is set correctly when provided."""
        source = TrendSource(id="X", platform="youtube", min_metric_value=500)
        assert source.min_metric_value == 500

    def test_trend_source_accepts_blocked_keywords(self):
        """blocked_keywords is set correctly when provided."""
        source = TrendSource(id="X", platform="x", blocked_keywords=["spam", "escort"])
        assert source.blocked_keywords == ["spam", "escort"]

    def test_trend_source_all_new_fields_together(self):
        """min_metric_value and blocked_keywords work together in one construction."""
        source = TrendSource(
            id="X_RECENT_SA_AR",
            platform="x",
            min_metric_value=500,
            blocked_keywords=["massage", "escort"],
        )
        assert source.min_metric_value == 500
        assert "massage" in source.blocked_keywords
        assert "escort" in source.blocked_keywords

    def test_trend_source_blocked_keywords_are_independent_per_instance(self):
        """Two TrendSource instances do not share the same blocked_keywords list."""
        s1 = TrendSource(id="A", platform="x")
        s2 = TrendSource(id="B", platform="x")
        s1.blocked_keywords.append("test")
        assert s2.blocked_keywords == [], "Mutable default shared between instances"

    def test_existing_trend_source_construction_still_works(self):
        """Old-style construction without new fields does not raise."""
        source = TrendSource(
            id="YOUTUBE_TRENDING_US",
            name="YouTube Trending - United States",
            platform="youtube",
            endpoint="videos.list",
            check_interval_minutes=15,
            enabled=True,
        )
        assert source.id == "YOUTUBE_TRENDING_US"
        assert source.min_metric_value == 0
        assert source.blocked_keywords == []


class TestTrendItemPhase6Fields:
    """TrendItem must have ar_translation with a None default."""

    def test_trend_item_default_ar_translation_is_none(self):
        """ar_translation defaults to None when not provided."""
        item = TrendItem(
            platform="youtube", title="Test Video", url="https://example.com"
        )
        assert item.ar_translation is None

    def test_trend_item_accepts_ar_translation(self):
        """ar_translation can be set to an Arabic string."""
        item = TrendItem(
            platform="youtube",
            title="Test Video",
            url="https://example.com",
            ar_translation="فيديو اختبار",
        )
        assert item.ar_translation == "فيديو اختبار"

    def test_existing_trend_item_construction_still_works(self):
        """Old-style construction without ar_translation does not raise."""
        item = TrendItem(
            platform="youtube",
            category="music",
            title="Some Title",
            description="desc",
            url="https://youtube.com/watch?v=abc",
            metric_type="views",
            metric_value=1000000,
            region_code="US",
        )
        assert item.platform == "youtube"
        assert item.ar_translation is None
