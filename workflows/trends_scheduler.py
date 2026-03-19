"""
Trends scheduler — runs each enabled source on its configured interval.
Each source runs in an isolated asyncio.create_task() for failure isolation.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from trend_agents.shared import source_registry
from trend_agents.shared.models import TrendSource
from tools.nocodb_trends_client import nocodb_trends
from workflows.trends_workflow import TrendsWorkflow

logger = logging.getLogger(__name__)

# Module-level workflow singleton
workflow = TrendsWorkflow(nocodb_trends)


class TrendsScheduler:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_run: Dict[str, datetime] = {}  # source_id -> last run time

    @property
    def is_running(self) -> bool:
        return self._running and self._task is not None and not self._task.done()

    def _is_due(self, source: TrendSource) -> bool:
        """Return True if source is due to run (interval has elapsed since last run)."""
        last = self._last_run.get(source.id)
        if last is None:
            return True  # Never run — due immediately
        return datetime.utcnow() >= last + timedelta(
            minutes=source.check_interval_minutes
        )

    async def _run_source(self, source: TrendSource) -> None:
        """Run a single source scan with error isolation."""
        try:
            self._last_run[source.id] = datetime.utcnow()
            result = await workflow.scan_source(source)
            logger.info(
                "[Scheduler] %s complete: fetched=%d stored=%d duplicates=%d",
                source.id,
                result.get("fetched", 0),
                result.get("stored", 0),
                result.get("duplicates", 0),
            )
        except Exception as e:
            logger.error("[Scheduler] %s failed (isolated): %s", source.id, e)
            # Update source status to error (best effort)
            try:
                await nocodb_trends.update_source_status(source.id, status="error")
            except Exception:
                pass

    async def _loop(self) -> None:
        """Main scheduler loop — checks due sources every 60 seconds."""
        logger.info(
            "[Scheduler] Starting — %d enabled sources",
            len(source_registry.list_enabled()),
        )
        self._running = True

        try:
            while self._running:
                sources = source_registry.list_enabled()
                for source in sources:
                    if self._is_due(source):
                        asyncio.create_task(
                            self._run_source(source),
                            name=f"trend-scan-{source.id}",
                        )
                await asyncio.sleep(60)
        except asyncio.CancelledError:
            logger.info("[Scheduler] Cancelled — stopping")
        finally:
            self._running = False
            logger.info("[Scheduler] Stopped")

    async def start(self) -> None:
        """Start the scheduler loop as a background task."""
        if self.is_running:
            logger.warning("[Scheduler] Already running")
            return
        self._task = asyncio.create_task(self._loop(), name="trends-scheduler")
        logger.info("[Scheduler] Started")

    async def stop(self) -> None:
        """Stop the scheduler loop."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[Scheduler] Stopped cleanly")


# Module-level singleton
scheduler = TrendsScheduler()
