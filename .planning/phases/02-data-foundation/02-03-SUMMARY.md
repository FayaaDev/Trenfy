---
phase: 02-data-foundation
plan: "03"
subsystem: database
tags: [nocodb, python, asyncio, workflow, source-sync]

# Dependency graph
requires:
  - phase: 02-data-foundation
    provides: "NocoDB client with query_sources(), trend_sources table schema, source_registry"
provides:
  - "NocoDBTrendsClient.sync_sources() — upserts JSON sources into trend_sources table"
  - "NocoDBTrendsClient.update_source_status() — updates last_fetched_at and last_fetch_status by string source ID"
  - "TrendsWorkflow stub with scan_source() and scan_all() — ready for Phase 3 platform clients"
affects: [phase-03-platform-clients, phase-04-api-infra]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TYPE_CHECKING guard for forward-reference imports to avoid circular imports"
    - "Non-fatal async exception handling (log warning, return 0/False)"
    - "NocoDB upsert by string ID: fetch existing IDs, diff, insert only new rows"
    - "Two-step PATCH: lookup row by string ID first, then PATCH by NocoDB integer Id"

key-files:
  created:
    - workflows/trends_workflow.py
    - workflows/__init__.py
  modified:
    - tools/nocodb_trends_client.py

key-decisions:
  - "sync_sources() is additive only — JSON sources not in table are inserted, existing rows preserved"
  - "update_source_status() does a two-step lookup+PATCH because NocoDB PATCH requires integer row Id, not string source ID"
  - "scan_source() stub sets status='pending_client' in NocoDB so the table reflects which sources were attempted"
  - "TrendSource import uses TYPE_CHECKING guard to avoid importing models module at runtime (prevents potential circular import)"

patterns-established:
  - "Non-fatal NocoDB operations: wrap in try/except, print warning, return sentinel value"
  - "Workflow class pattern: injected NocoDBTrendsClient dependency, async scan methods"

requirements-completed: [CORE-04]

# Metrics
duration: 1min
completed: 2026-03-19
---

# Phase 02 Plan 03: NocoDB Source Sync Methods and TrendsWorkflow Stub Summary

**Extended NocoDBTrendsClient with sync_sources()/update_source_status() and created TrendsWorkflow stub wiring sources to NocoDB status updates**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-19T04:33:36Z
- **Completed:** 2026-03-19T04:35:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `sync_sources()` upserts all JSON-defined sources into NocoDB `trend_sources` table — inserts missing, preserves existing rows
- `update_source_status()` two-step lookup+PATCH correctly handles string→integer ID translation for NocoDB
- `TrendsWorkflow` stub with `scan_source()` and `scan_all()` fully wired to update NocoDB status per source scan
- All 8 enabled sources verified accessible to workflow via `source_registry.list_enabled()`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sync_sources() and update_source_status()** - `aa1a4c6` (feat)
2. **Task 2: Create TrendsWorkflow stub** - `e3b94c4` (feat)

## Files Created/Modified
- `tools/nocodb_trends_client.py` — Added `sync_sources()`, `update_source_status()`, and `TYPE_CHECKING` import guard
- `workflows/trends_workflow.py` — New file: `TrendsWorkflow` class with `scan_source()` stub and `scan_all()` aggregator
- `workflows/__init__.py` — New file: package init

## Decisions Made
- `sync_sources()` is purely additive — sources not in JSON are left untouched in NocoDB, and existing rows are skipped to preserve `last_fetched_at` and `last_fetch_status`
- `update_source_status()` requires a two-step operation: first `GET` with `where=(id,eq,{source_id})` to find the integer NocoDB row Id, then `PATCH` using that integer Id — because NocoDB's PATCH endpoint uses integer primary keys
- Phase 2 `scan_source()` sets status `"pending_client"` to signal in NocoDB that the source was attempted but no platform client exists yet
- Used `TYPE_CHECKING` guard for `TrendSource` import to keep the runtime import lightweight and avoid any potential circular import issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (Platform Clients) can replace `scan_source()` stub with real YouTube/Spotify/Steam fetch logic
- `sync_sources()` is ready for the startup sync called by the FastAPI lifespan event
- `update_source_status()` is ready for use after each real scan completes
- No blockers

---
*Phase: 02-data-foundation*
*Completed: 2026-03-19*
