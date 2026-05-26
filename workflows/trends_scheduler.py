"""
Trends scheduler — runs each enabled source on its configured interval.
Each source runs in an isolated asyncio.create_task() for failure isolation.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

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

    def _is_due_from(self, source: TrendSource, last: Optional[datetime]) -> bool:
        """Return True if source is due to run after a known last run time."""
        if last is None:
            return True  # Never run — due immediately
        return _utcnow() >= last + timedelta(
            minutes=source.check_interval_minutes
        )

    def _is_due(self, source: TrendSource) -> bool:
        """Return True if source is due to run in the in-process scheduler."""
        return self._is_due_from(source, self._last_run.get(source.id))

    async def _run_source(self, source: TrendSource) -> None:
        """Run a single source scan with error isolation."""
        try:
            self._last_run[source.id] = _utcnow()
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

    async def run_due_sources(self, batch_size: int = 5) -> Dict[str, Any]:
        """Run a bounded batch of due enabled sources for cron-triggered Workers.

        This method is intentionally one-shot: Cloudflare Cron Triggers should not
        start the long-running scheduler loop used by local/VPS runtimes.
        """
        batch_size = max(1, batch_size)
        configured_sources = source_registry.list_enabled()
        source_rows = await nocodb_trends.query_sources(enabled_only=False)
        row_by_id = {str(row.get("id") or ""): row for row in source_rows}

        due_sources: list[TrendSource] = []
        skipped_disabled = 0
        skipped_not_due = 0

        for source in configured_sources:
            row = row_by_id.get(source.id)
            if row is not None and not bool(row.get("enabled", False)):
                skipped_disabled += 1
                continue

            last_fetched_at = (
                _parse_timestamp(row.get("last_fetched_at")) if row else None
            )
            if self._is_due_from(source, last_fetched_at):
                due_sources.append(source)
            else:
                skipped_not_due += 1

        selected_sources = due_sources[:batch_size]
        total: Dict[str, Any] = {
            "fetched": 0,
            "stored": 0,
            "duplicates": 0,
            "sources_due": len(due_sources),
            "sources_run": 0,
            "skipped_disabled": skipped_disabled,
            "skipped_not_due": skipped_not_due,
            "results": [],
        }

        for source in selected_sources:
            result = await workflow.scan_source(source)
            total["fetched"] += int(result.get("fetched", 0))
            total["stored"] += int(result.get("stored", 0))
            total["duplicates"] += int(result.get("duplicates", 0))
            total["sources_run"] += 1
            total["results"].append(result)

        return total

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


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if not value:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
