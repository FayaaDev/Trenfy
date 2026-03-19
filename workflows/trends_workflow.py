"""
Trends workflow — fetch → normalize → dedup → store pipeline.
Phase 2: scan_source() is a stub — no platform clients yet.
Phase 3 will replace the stub with real platform client calls.
"""

import logging
from typing import Dict

from trend_agents.shared.models import TrendSource
from tools.nocodb_trends_client import NocoDBTrendsClient

logger = logging.getLogger(__name__)


class TrendsWorkflow:
    def __init__(self, trends_client: NocoDBTrendsClient):
        self.trends_client = trends_client

    async def scan_source(self, source: TrendSource) -> Dict:
        """Fetch, normalize, dedup, and store trends for a single source.

        Phase 2 stub: no platform client exists yet. Logs that the source
        was attempted, updates NocoDB status to 'pending_client', returns
        zero counts. Phase 3 replaces this stub with real fetch logic.
        """
        logger.info(
            "[TrendsWorkflow] scan_source: %s (Phase 2 stub — no client yet)",
            source.id,
        )
        result = {"source_id": source.id, "fetched": 0, "stored": 0, "duplicates": 0}

        # Update source status in NocoDB (non-fatal if fails)
        await self.trends_client.update_source_status(
            source.id, status="pending_client"
        )

        return result

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
