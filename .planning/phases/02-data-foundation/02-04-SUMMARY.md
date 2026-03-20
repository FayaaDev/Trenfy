---
phase: 02-data-foundation
plan: "04"
subsystem: scheduler
tags: [fastapi, asyncio, scheduler, nocodb, lifespan]

# Dependency graph
requires:
  - phase: 02-data-foundation
    provides: TrendsWorkflow.scan_source(), NocoDBTrendsClient.sync_sources(), source_registry.list_enabled()
provides:
  - TrendsScheduler with start()/stop()/is_running for per-source interval-based scheduling
  - app.py lifespan context manager starting scheduler and syncing sources on startup
  - /health endpoint returning real scheduler_running state (not hardcoded False)
affects: [03-platform-clients, 04-api-infra]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FastAPI asynccontextmanager lifespan (modern pattern replacing @app.on_event)"
    - "asyncio.create_task() per source for failure isolation"
    - "Module-level singletons (scheduler, workflow) with deferred imports to avoid circular imports"

key-files:
  created:
    - workflows/trends_scheduler.py
  modified:
    - app.py

key-decisions:
  - "asynccontextmanager lifespan chosen over @app.on_event('startup') — modern FastAPI pattern, clean shutdown support"
  - "Per-source imports inside lifespan/health functions to avoid circular imports at module load"
  - "scheduler.is_running checks both _running flag AND task not done — accurate state detection"
  - "Source sync failure is non-fatal — scheduler starts regardless, logged as warning"

patterns-established:
  - "Deferred imports inside async functions for circular import avoidance"
  - "asyncio.create_task with name= parameter for debuggability (trend-scan-{source.id})"
  - "Best-effort error status update in _run_source — scan errors don't cascade"

requirements-completed: [CORE-01, CORE-05, CORE-06]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 2 Plan 04: TrendsScheduler + App Lifespan Summary

**TrendsScheduler with per-source asyncio.create_task() isolation wired into FastAPI lifespan, with /health returning real scheduler.is_running state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T04:37:21Z
- **Completed:** 2026-03-19T04:39:01Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Created `TrendsScheduler` — interval-based scheduler that runs 8 enabled sources, each isolated in its own `asyncio.create_task()` so one failure never affects others
- Wired `app.py` with FastAPI's modern `asynccontextmanager` lifespan pattern — startup syncs sources to NocoDB (non-fatal) then starts the scheduler
- `/health` now returns `scheduler.is_running` (a real property checking both `_running` flag and task state) instead of hardcoded `False`
- Phase 2 end-to-end import chain fully validated: 8 enabled sources detected, /health route confirmed, no circular imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TrendsScheduler** - `50bd949` (feat)
2. **Task 2: Wire app.py — lifespan hook + real /health scheduler state** - `ef4f934` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `workflows/trends_scheduler.py` — TrendsScheduler class with start()/stop()/is_running + module-level `scheduler` singleton
- `app.py` — FastAPI lifespan context manager replacing bare startup, /health wired to real scheduler state

## Decisions Made
- **asynccontextmanager lifespan over @app.on_event**: Modern FastAPI pattern with proper cleanup on shutdown; `@app.on_event("startup")` is deprecated
- **Deferred imports inside lifespan/health**: `from workflows.trends_scheduler import scheduler` inside functions avoids circular import (app.py ← scheduler ← workflow ← nocodb_client) at module load time
- **is_running property checks both _running AND task.done()**: Guards against race where `_running=True` but task unexpectedly died
- **Source sync non-fatal**: Scheduler starts regardless of NocoDB sync result; logged as warning not error

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 end-to-end pipeline complete: source_registry → TrendsWorkflow (stub) → TrendsScheduler → app.py lifespan
- Phase 3 (Platform Clients) can now replace `TrendsWorkflow.scan_source()` stub with real YouTube / X fetch logic — scheduler will automatically use it
- All 8 sources are confirmed enabled and will be picked up on first scheduler tick

---
*Phase: 02-data-foundation*
*Completed: 2026-03-19*
