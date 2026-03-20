"""
Tests for tools/translation.py — Arabic detection and batch translation enrichment.
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendItem


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _item(
    platform: str = "youtube",
    title: str = "Hello World",
    region_code: str = "US",
    lang: str = "",
) -> TrendItem:
    metadata = {}
    if lang:
        metadata["lang"] = lang
    return TrendItem(
        platform=platform,
        title=title,
        url="https://example.com/t",
        region_code=region_code,
        metadata=metadata,
    )


# ---------------------------------------------------------------------------
# is_arabic() detection tests
# ---------------------------------------------------------------------------


def test_is_arabic_x_item_with_lang_ar_returns_true():
    from tools.translation import is_arabic

    item = _item(platform="x", lang="ar")
    assert is_arabic(item) is True


def test_is_arabic_youtube_sa_region_returns_true():
    from tools.translation import is_arabic

    item = _item(platform="youtube", region_code="SA")
    assert is_arabic(item) is True


def test_is_arabic_x_item_with_lang_en_returns_false():
    from tools.translation import is_arabic

    item = _item(platform="x", lang="en")
    assert is_arabic(item) is False


def test_is_arabic_youtube_us_region_returns_false():
    from tools.translation import is_arabic

    item = _item(platform="youtube", region_code="US")
    assert is_arabic(item) is False


def test_is_arabic_item_with_no_metadata_lang_returns_false():
    from tools.translation import is_arabic

    item = _item(platform="x")  # no lang set
    assert is_arabic(item) is False


def test_is_arabic_lang_ar_takes_precedence_over_non_sa_region():
    """lang=ar on X item overrides region_code logic."""
    from tools.translation import is_arabic

    item = _item(platform="x", region_code="US", lang="ar")
    assert is_arabic(item) is True


# ---------------------------------------------------------------------------
# translate_items() — Arabic items stay None, no API call
# ---------------------------------------------------------------------------


async def test_translate_items_arabic_items_stay_none():
    """Arabic items (lang=ar or SA) must have ar_translation=None, no API call."""
    from tools.translation import translate_items

    ar_item = _item(platform="x", lang="ar", title="مرحبا")
    sa_item = _item(platform="youtube", region_code="SA", title="عالم")

    with patch("tools.translation.has_openrouter_api_key", return_value=True):
        with patch("tools.translation.get_openai_client") as mock_client_fn:
            await translate_items([ar_item, sa_item])
            # No API call should be made for Arabic items
            mock_client_fn.assert_not_called()

    assert ar_item.ar_translation is None
    assert sa_item.ar_translation is None


# ---------------------------------------------------------------------------
# translate_items() — No API key: all ar_translation=None, no exception
# ---------------------------------------------------------------------------


async def test_translate_items_no_api_key_all_none_no_exception():
    """If OPENROUTER_API_KEY absent, translate_items returns without error."""
    from tools.translation import translate_items

    item1 = _item(platform="youtube", title="Gaming highlights")
    item2 = _item(platform="x", lang="en", title="Music chart")

    with patch("tools.translation.has_openrouter_api_key", return_value=False):
        result = await translate_items([item1, item2])

    # No exception raised, all ar_translation stay None
    assert result is not None
    assert item1.ar_translation is None
    assert item2.ar_translation is None


# ---------------------------------------------------------------------------
# translate_items() — API present: batched call, translations populated
# ---------------------------------------------------------------------------


async def test_translate_items_non_arabic_get_translated():
    """Non-Arabic items with API key should receive translations."""
    from tools.translation import SEPARATOR, translate_items

    item1 = _item(platform="youtube", title="Gaming highlights", region_code="US")
    item2 = _item(platform="x", title="Music chart", lang="en")

    # Simulate 2-item batch response
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    translation1 = "أبرز الألعاب"
    translation2 = "قائمة الموسيقى"
    mock_response.choices[
        0
    ].message.content = f"{translation1}{SEPARATOR.strip()}{translation2}"

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("tools.translation.has_openrouter_api_key", return_value=True):
        with patch("tools.translation.get_openai_client", return_value=mock_client):
            result = await translate_items([item1, item2])

    assert result is not None
    assert item1.ar_translation == translation1
    assert item2.ar_translation == translation2


async def test_translate_items_single_api_call_for_all_non_arabic():
    """translate_items must use a single batched API call (not one per item)."""
    from tools.translation import translate_items

    items = [
        _item(platform="youtube", title=f"Title {i}", region_code="US")
        for i in range(5)
    ]

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    # Return 5 translations separated by SEPARATOR
    from tools.translation import SEPARATOR

    mock_response.choices[0].message.content = SEPARATOR.strip().join(
        [f"ترجمة {i}" for i in range(5)]
    )

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("tools.translation.has_openrouter_api_key", return_value=True):
        with patch("tools.translation.get_openai_client", return_value=mock_client):
            await translate_items(items)

    # Exactly 1 API call for 5 items (batched)
    assert mock_client.chat.completions.create.call_count == 1


# ---------------------------------------------------------------------------
# translate_items() — API failure: all ar_translation=None, no exception propagated
# ---------------------------------------------------------------------------


async def test_translate_items_api_error_all_none_no_exception():
    """If the API call raises, ar_translation=None and no exception propagates."""
    from tools.translation import translate_items

    item1 = _item(platform="youtube", title="Gaming")
    item2 = _item(platform="x", title="Music", lang="en")

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=RuntimeError("API down")
    )

    with patch("tools.translation.has_openrouter_api_key", return_value=True):
        with patch("tools.translation.get_openai_client", return_value=mock_client):
            result = await translate_items([item1, item2])  # must not raise

    assert result is not None
    assert item1.ar_translation is None
    assert item2.ar_translation is None


# ---------------------------------------------------------------------------
# translate_items() — Mixed Arabic + non-Arabic batch
# ---------------------------------------------------------------------------


async def test_translate_items_mixed_batch():
    """Arabic items stay None; non-Arabic items get translated in same call."""
    from tools.translation import SEPARATOR, translate_items

    ar_item = _item(platform="x", lang="ar", title="مرحبا")
    en_item = _item(platform="youtube", title="Hello", region_code="US")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "مرحبا يا عالم"

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("tools.translation.has_openrouter_api_key", return_value=True):
        with patch("tools.translation.get_openai_client", return_value=mock_client):
            await translate_items([ar_item, en_item])

    assert ar_item.ar_translation is None
    assert en_item.ar_translation == "مرحبا يا عالم"


# ---------------------------------------------------------------------------
# translate_items() — Returns items list (mutates in-place)
# ---------------------------------------------------------------------------


async def test_translate_items_returns_items_and_mutates_in_place():
    """translate_items must return the same list and mutate items in-place."""
    from tools.translation import translate_items

    item = _item(platform="youtube", title="Hello")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "مرحبا"

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("tools.translation.has_openrouter_api_key", return_value=True):
        with patch("tools.translation.get_openai_client", return_value=mock_client):
            result = await translate_items([item])

    # Same list returned
    assert result is not None
    # In-place mutation
    assert item.ar_translation == "مرحبا"


# ---------------------------------------------------------------------------
# Run as script
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(test_translate_items_arabic_items_stay_none())
    asyncio.run(test_translate_items_no_api_key_all_none_no_exception())
    asyncio.run(test_translate_items_non_arabic_get_translated())
    asyncio.run(test_translate_items_single_api_call_for_all_non_arabic())
    asyncio.run(test_translate_items_api_error_all_none_no_exception())
    asyncio.run(test_translate_items_mixed_batch())
    asyncio.run(test_translate_items_returns_items_and_mutates_in_place())
    print("test_phase06_translation.py: ok")
