"""
Trends workflow — fetch → normalize → dedup → store pipeline.
"""

import logging
from typing import Dict

from trend_agents.shared.models import TrendSource
from tools.nocodb_trends_client import NocoDBTrendsClient
from tools.trend_clients import get_trend_client
from tools.trend_clients.common import compute_content_hash

logger = logging.getLogger(__name__)


class TrendsWorkflow:
    def __init__(self, trends_client: NocoDBTrendsClient):
        self.trends_client = trends_client

    async def scan_source(self, source: TrendSource) -> Dict:
        """Fetch, normalize, dedup, and store trends for a single source."""
        result = {
            "source_id": source.id,
            "fetched": 0,
            "stored": 0,
            "duplicates": 0,
            "invalid": 0,
            "below_threshold": 0,
            "blocked": 0,
            "status": "success",
        }

        try:
            client = get_trend_client(source.platform)
            fetched_items = await client.fetch(source, max_items=20)
            result["fetched"] = len(fetched_items)

            status_reason = ""
            if hasattr(client, "get_status_reason"):
                status_reason = str(client.get_status_reason(source.id) or "")

            if status_reason == "disabled_circuit_breaker":
                result["status"] = "disabled_circuit_breaker"
                await self._update_source_status(source.id, result["status"])
                return result

            valid_items = []
            invalid_count = 0
            for item in fetched_items:
                if not str(item.title or "").strip() or not str(item.url or "").strip():
                    invalid_count += 1
                    continue
                item.content_hash = compute_content_hash(item)
                valid_items.append(item)

            result["invalid"] = invalid_count

            # Metric threshold filter (FILT-02)
            if source.min_metric_value > 0:
                below = [
                    i for i in valid_items if i.metric_value < source.min_metric_value
                ]
                valid_items = [
                    i for i in valid_items if i.metric_value >= source.min_metric_value
                ]
                result["below_threshold"] = len(below)

            # Keyword blocklist filter (FILT-05)
            if source.blocked_keywords:
                blocked_lower = [kw.lower() for kw in source.blocked_keywords]
                blocked = [
                    i
                    for i in valid_items
                    if any(kw in i.title.lower() for kw in blocked_lower)
                ]
                valid_items = [
                    i
                    for i in valid_items
                    if not any(kw in i.title.lower() for kw in blocked_lower)
                ]
                result["blocked"] = len(blocked)

            existing_hashes = await self.trends_client.batch_check_duplicates(
                [item.content_hash for item in valid_items]
            )
            new_items = [
                item for item in valid_items if item.content_hash not in existing_hashes
            ]
            result["duplicates"] = len(valid_items) - len(new_items)

            if new_items:
                created = await self.trends_client.batch_create_trends(new_items)
                result["stored"] = len(created)

            if invalid_count > 0:
                result["status"] = "partial_success"
            else:
                result["status"] = "success"

        except Exception as exc:
            logger.error(
                "[TrendsWorkflow] scan_source error for %s: %s", source.id, exc
            )
            result["status"] = "error"

        await self._update_source_status(source.id, result["status"])
        return result

    async def _update_source_status(self, source_id: str, status: str) -> None:
        try:
            await self.trends_client.update_source_status(source_id, status=status)
        except Exception as exc:
            logger.warning(
                "[TrendsWorkflow] failed to update source status %s=%s: %s",
                source_id,
                status,
                exc,
            )

    async def scan_all(self, sources=None) -> Dict:
        """Run scan_source for all provided sources. Returns aggregate stats."""
        if sources is None:
            from trend_agents.shared import source_registry

            sources = source_registry.list_enabled()

        total = {"fetched": 0, "stored": 0, "duplicates": 0, "sources_run": 0}
        for source in sources:
            try:
                result = await self.scan_source(source)
                total["fetched"] += result.get("fetched", 0)
                total["stored"] += result.get("stored", 0)
                total["duplicates"] += result.get("duplicates", 0)
                total["sources_run"] += 1
            except Exception as e:
                logger.error("[TrendsWorkflow] scan_all error for %s: %s", source.id, e)

        return total
