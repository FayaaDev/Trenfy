from trend_agents.shared.models import SourceType, TrendItem, generate_trend_hash


def test_source_type_includes_tiktok() -> None:
    assert SourceType.TIKTOK.value == "tiktok"


def test_generate_trend_hash_is_deterministic() -> None:
    item = TrendItem(
        platform="youtube",
        category="music",
        title="Same Title",
        url="https://example.com/video",
        published_date="2026-03-19",
        region_code="US",
    )

    first = generate_trend_hash(item)
    second = generate_trend_hash(item)

    assert len(first) == 32
    assert first == second


def test_generate_trend_hash_changes_on_key_fields() -> None:
    base = TrendItem(
        platform="youtube",
        category="music",
        title="Hash Me",
        url="https://example.com/base",
        published_date="2026-03-19",
        region_code="US",
    )

    variants = [
        base.model_copy(update={"platform": "spotify"}),
        base.model_copy(update={"title": "Hash Me 2"}),
        base.model_copy(update={"published_date": "2026-03-20"}),
        base.model_copy(update={"region_code": "SA"}),
    ]

    base_hash = generate_trend_hash(base)
    for variant in variants:
        assert generate_trend_hash(variant) != base_hash


if __name__ == "__main__":
    test_source_type_includes_tiktok()
    test_generate_trend_hash_is_deterministic()
    test_generate_trend_hash_changes_on_key_fields()
    print("test_trend_client_contracts.py: ok")
