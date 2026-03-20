---
phase: 06-data-filtering
plan: 03
subsystem: api
tags: [translation, arabic, openrouter, nocodb, tdd, enrichment]

# Dependency graph
requires:
  - phase: 06-data-filtering
    provides: TrendItem.ar_translation field (Plan 01), ingestion pipeline (Plan 02)
  - phase: 02-data-foundation
    provides: NocoDBTrendsClient and _item_to_record
provides:
  - tools/translation.py with is_arabic() and translate_items() for Arabic enrichment
  - scan_source() now calls translate_items() before batch_create_trends()
  - _item_to_record() includes ar_translation in NocoDB payload
  - NocoDB trends table has ar_translation LongText nullable column
affects: [05-react-native-app, any consumer reading ar_translation from NocoDB]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Best-effort async enrichment: translate_items mutates items in-place, failures leave field None"
    - "Single batched LLM call with SEPARATOR-delimited items for cost efficiency"
    - "Arabic detection via metadata.lang=ar (X) or region_code=SA (YouTube)"

key-files:
  created:
    - tools/translation.py
    - tests/test_phase06_translation.py
  modified:
    - workflows/trends_workflow.py
    - tools/nocodb_trends_client.py

key-decisions:
  - "translate_items() is best-effort — failures (API error, missing key) leave ar_translation=None without raising exceptions"
  - "Single batched OpenRouter call with SEPARATOR-delimited items preferred over parallel calls for cost efficiency"
  - "Arabic detection: X items use metadata.lang==ar; YouTube uses region_code==SA as heuristic"
  - "NocoDB ar_translation column is LongText nullable — added manually via NocoDB UI (no migration tooling)"

patterns-established:
  - "Best-effort enrichment pattern: mutate items before store, never block ingestion on enrichment failure"

requirements-completed: [FILT-07, FILT-08, FILT-09, FILT-10, FILT-11, FILT-12]

# Metrics
duration: ~10min (including human checkpoint for NocoDB schema)
completed: 2026-03-20
---

# Phase 6 Plan 3: Arabic Translation Enrichment Summary

**Batch Arabic translation via OpenRouter added to ingestion pipeline: non-Arabic trends get ar_translation populated before NocoDB storage; Arabic items (X lang=ar, YouTube SA) skip translation gracefully**

## Performance

- **Duration:** ~10 min (including human action checkpoint for NocoDB schema change)
- **Started:** 2026-03-20T04:36:35Z
- **Completed:** 2026-03-20T04:37:23Z
- **Tasks:** 3 (2 auto + 1 human action checkpoint)
- **Files modified:** 4

## Accomplishments

- Created `tools/translation.py` with `is_arabic()` (X lang=ar, YouTube SA detection) and `translate_items()` (async, best-effort batch translation via OpenRouter)
- Wired `translate_items(new_items)` into `scan_source()` before `batch_create_trends()` — enrichment runs on every ingestion cycle
- Updated `_item_to_record()` in `NocoDBTrendsClient` to include `ar_translation` in every NocoDB payload
- NocoDB trends table has `ar_translation` LongText nullable column (verified via MCP: field ci4dsfrpc9s1p7b)
- 18 tests pass covering: Arabic detection heuristics, no-key behavior, API error resilience, in-place mutation, batch parsing

## Task Commits

Each task was committed atomically:

1. **Task 1: Arabic detection + batch translation (TDD RED)** - `408e13e` (test)
2. **Task 1: Arabic detection + batch translation (TDD GREEN)** - `a3242fd` (feat)
3. **Task 2: Wire translation into workflow + record mapper** - `6506a96` (feat)
4. **Task 3: NocoDB column** - Human action (no code commit)

## Files Created/Modified

- `tools/translation.py` — New module: `is_arabic()` and `translate_items()` with OpenRouter batching
- `tests/test_phase06_translation.py` — TDD test suite: 18 tests covering all translation behaviors
- `workflows/trends_workflow.py` — Added `translate_items(new_items)` call before `batch_create_trends()`
- `tools/nocodb_trends_client.py` — Added `ar_translation: item.ar_translation` to `_item_to_record()`

## Decisions Made

- **Best-effort only:** `translate_items()` catches all exceptions and leaves `ar_translation=None` — ingestion never blocked on translation failures
- **Single batch call:** All non-Arabic items are concatenated with `\n---ITEM---\n` separator and sent in one LLM call. Cheaper and simpler than parallel calls.
- **Arabic detection:** X items use `metadata.lang == "ar"` (explicit); YouTube uses `region_code == "SA"` (regional heuristic). Neither platform provides direct Arabic text detection.
- **NocoDB column:** Manual UI addition (no migration tooling in project). Confirmed via MCP field introspection.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all tests passed on first run. NocoDB column was added manually by user as planned (human-action checkpoint).

## User Setup Required

**External service requires manual configuration — already completed.**

The `ar_translation` LongText nullable column was added to the NocoDB trends table (field ID: ci4dsfrpc9s1p7b, confirmed via MCP). No further setup required.

## Next Phase Readiness

- Translation enrichment is live and will run on next pipeline execution
- `ar_translation` will be `None` for existing rows and populated for new non-Arabic ingestions
- Mobile app (Phase 5) can read `ar_translation` from NocoDB trends records
- Phase 6 Plan 4 (API filter extensions) is already complete — Phase 6 is now fully done

---
*Phase: 06-data-filtering*
*Completed: 2026-03-20*
