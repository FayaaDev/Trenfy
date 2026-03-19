from trend_agents.shared.models import (
    SourceType,
    TrendItem,
    TrendSource,
    generate_trend_hash,
)
from tools.trend_clients.base import BaseTrendClient
from tools.trend_clients.common import normalize_category


def test_source_type_includes_x() -> None:
    assert SourceType.X.value == "x"


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
        base.model_copy(update={"platform": "x"}),
        base.model_copy(update={"title": "Hash Me 2"}),
        base.model_copy(update={"published_date": "2026-03-20"}),
        base.model_copy(update={"region_code": "SA"}),
    ]

    base_hash = generate_trend_hash(base)
    for variant in variants:
        assert generate_trend_hash(variant) != base_hash


def test_normalize_category_known_and_unknown_values() -> None:
    assert normalize_category("Gaming") == "gaming"
    assert normalize_category("MUSIC") == "music"
    assert normalize_category("film") == "entertainment"


def test_base_trend_client_fetch_is_abstract_async_contract() -> None:
    assert "fetch" in BaseTrendClient.__abstractmethods__

    class ConcreteClient(BaseTrendClient):
        platform = "test"

        async def fetch(
            self, source: TrendSource, max_items: int = 20
        ) -> list[TrendItem]:
            return []

    client = ConcreteClient()
    assert client.platform == "test"


if __name__ == "__main__":
    test_source_type_includes_x()
    test_generate_trend_hash_is_deterministic()
    test_generate_trend_hash_changes_on_key_fields()
    test_normalize_category_known_and_unknown_values()
    test_base_trend_client_fetch_is_abstract_async_contract()
    print("test_trend_client_contracts.py: ok")
