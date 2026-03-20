"""
Arabic translation enrichment for TrendItem ingestion.
Uses OpenRouter (via get_openai_client) to translate non-Arabic content.
Translation is best-effort — failures leave ar_translation=None.
"""

import logging
from typing import List

from trend_agents.shared.models import TrendItem

logger = logging.getLogger(__name__)
SEPARATOR = "\n---ITEM---\n"


def is_arabic(item: TrendItem) -> bool:
    """Return True if this item's content is already in Arabic."""
    # Priority 1: X items with explicit lang metadata
    if item.metadata.get("lang") == "ar":
        return True
    # Priority 2: YouTube SA region heuristic
    if item.region_code == "SA":
        return True
    return False


async def translate_items(items: List[TrendItem]) -> List[TrendItem]:
    """
    Populate ar_translation on non-Arabic items via a single batched OpenRouter call.
    Arabic items: ar_translation = None (no call needed).
    If key absent or call fails: ar_translation = None, ingestion continues.
    Mutates items in-place and returns them.
    """
    # Mark Arabic items as needing no translation
    to_translate = []
    for item in items:
        if is_arabic(item):
            item.ar_translation = None
        else:
            to_translate.append(item)

    # Lazy import to avoid import-time failure when openai/agents SDK not installed
    from tools.openai_client import (
        get_default_llm_model,
        get_openai_client,
        has_openrouter_api_key,
    )  # noqa: PLC0415

    if not to_translate or not has_openrouter_api_key():
        return items

    try:
        client = get_openai_client()
        # Build batch prompt: each item as "title\n\ndescription" separated by SEPARATOR
        batch_text = SEPARATOR.join(
            f"{item.title}\n\n{item.description}" for item in to_translate
        )
        prompt = (
            "Translate the following texts to Modern Standard Arabic. "
            "Output ONLY the translated texts in the same order, "
            f"separated by '{SEPARATOR.strip()}'. No explanations.\n\n"
            f"{batch_text}"
        )
        response = await client.chat.completions.create(
            model=get_default_llm_model(),
            messages=[{"role": "user", "content": prompt}],
        )
        result_text = response.choices[0].message.content or ""
        translations = result_text.split(SEPARATOR.strip())

        for i, item in enumerate(to_translate):
            if i < len(translations):
                item.ar_translation = translations[i].strip() or None
            else:
                item.ar_translation = None

    except Exception as exc:
        logger.warning("[translation] batch translate failed (non-fatal): %s", exc)
        for item in to_translate:
            item.ar_translation = None

    return items
