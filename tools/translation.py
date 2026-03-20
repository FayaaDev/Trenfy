"""
Arabic translation enrichment for TrendItem ingestion.
Uses OpenRouter (via get_openai_client) to translate non-Arabic content.
Translation is best-effort — failures leave ar_translation=None.
"""

import logging
import importlib
import json
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

    if not to_translate:
        return items

    try:
        openai_client = importlib.import_module("tools.openai_client")
        get_default_llm_model = openai_client.get_default_llm_model
        get_openai_client = openai_client.get_openai_client
        has_openrouter_api_key = openai_client.has_openrouter_api_key

        if not has_openrouter_api_key():
            return items

        client = get_openai_client()
        batch_payload = [
            {
                "index": index,
                "title": item.title,
                "description": item.description,
            }
            for index, item in enumerate(to_translate)
        ]
        prompt = (
            "Translate every item to fluent Modern Standard Arabic. "
            "Translate Japanese, English, Korean, and mixed-language text fully. "
            "Do not summarize, omit lines, or keep source-language UI words like "
            "official, trailer, file, practice, cover, or実況 when an Arabic translation exists. "
            "Keep brand names, artist names, and product names recognizable, but translate the rest. "
            "Return valid JSON only with this shape: "
            '{"translations":[{"index":0,"text":"..."}]}. '
            "Preserve item order and include exactly one output per input item.\n\n"
            f"{json.dumps(batch_payload, ensure_ascii=False)}"
        )
        response = await client.chat.completions.create(
            model=get_default_llm_model(),
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are a careful translator that outputs valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        result_text = response.choices[0].message.content or ""
        translations = _parse_translations(result_text)

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


def _parse_translations(result_text: str) -> List[str]:
    try:
        payload = json.loads(result_text)
    except json.JSONDecodeError:
        return [chunk.strip() for chunk in result_text.split(SEPARATOR.strip())]

    rows = payload.get("translations") or []
    indexed: dict[int, str] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        raw_index = row.get("index")
        try:
            index = int(raw_index) if raw_index is not None else -1
        except (TypeError, ValueError):
            continue
        if index < 0:
            continue
        text = str(row.get("text") or "").strip()
        indexed[index] = text

    if not indexed:
        return []

    return [indexed[index] for index in sorted(indexed)]
