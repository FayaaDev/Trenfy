"""
One-off remediation: translate any records missing title_ar.

Run with:
    uv run scripts/remediate_translations.py
or:
    .venv/bin/python scripts/remediate_translations.py
"""

import asyncio
import sys
from pathlib import Path

# Project root on path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv()

from tools.nocodb_trends_client import nocodb_trends
from tools.translation import _has_arabic_script, translate_items
from trend_agents.shared.models import TrendItem


async def main() -> None:
    print("Fetching all records ...")

    # Page through all records
    batch_size = 100
    offset = 0
    all_rows: list[dict] = []
    while True:
        rows = await nocodb_trends.query_trends(
            limit=batch_size,
            offset=offset,
            sort="-fetched_at",
        )
        all_rows.extend(rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    print(f"Fetched {len(all_rows)} total records.")

    # Keep only records missing title_ar
    all_rows = [r for r in all_rows if not (r.get("title_ar") or "").strip()]
    print(f"Records with blank title_ar: {len(all_rows)}")

    # Filter: only rows with a non-empty, non-Arabic title that need translation
    to_fix: list[dict] = []
    for row in all_rows:
        title = (row.get("title") or "").strip()
        if not title:
            continue
        if _has_arabic_script(title):
            continue  # already Arabic – nothing to do
        to_fix.append(row)

    print(f"Records needing translation: {len(to_fix)}")
    if not to_fix:
        print("Nothing to do.")
        return

    # Build TrendItem stubs for translation
    items: list[TrendItem] = []
    for row in to_fix:
        item = TrendItem(
            platform=row.get("platform") or "",
            title=row.get("title") or "",
            description=row.get("description") or "",
            url=row.get("url") or "https://example.com",
            region_code=row.get("region_code") or "US",
            metadata={"lang": row.get("lang") or ""},
        )
        items.append(item)

    # Translate in chunks of 20 to stay within LLM context limits
    chunk_size = 20
    for start in range(0, len(items), chunk_size):
        chunk_items = items[start : start + chunk_size]
        chunk_rows = to_fix[start : start + chunk_size]

        print(
            f"Translating chunk {start // chunk_size + 1} ({len(chunk_items)} items) ..."
        )
        await translate_items(chunk_items)

        # Patch NocoDB
        for item, row in zip(chunk_items, chunk_rows):
            record_id = str(row.get("Id") or row.get("id") or "")
            if not record_id:
                continue
            if not item.title_ar and not item.ar_translation:
                print(f"  [SKIP] row {record_id} – translation returned empty")
                continue

            updated = await nocodb_trends.update_trend(
                record_id,
                {
                    "title_ar": item.title_ar,
                    "ar_translation": item.ar_translation,
                },
            )
            if updated:
                print(
                    f"  [OK] row {record_id}: title_ar={repr((item.title_ar or '')[:60])}"
                )
            else:
                print(f"  [FAIL] row {record_id}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
