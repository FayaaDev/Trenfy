---
phase: quick-260320-bpk-calling-x-and-youtube-apis-is-expensive
plan: 01
subsystem: api
tags: [fastapi, nocodb, mockup, cost-control, testing]
requires:
  - phase: 05-data-filtering
    provides: trends query API and NocoDB trends data access
provides:
  - Read-only /api/trends/mockup endpoint backed by existing NocoDB rows
  - Automated endpoint tests proving no refresh workflow calls
  - Mockup-safe runtime runbook with scheduler disabled mode
affects: [api, docs, mockup, demo]
tech-stack:
  added: []
  patterns: [read-only mockup projection from existing query_trends path]
key-files:
  created: [tests/test_api_trends_mockup.py, docs/mockup-mode.md, .planning/quick/260320-bpk-calling-x-and-youtube-apis-is-expensive-/260320-bpk-SUMMARY.md]
  modified: [api/routes/trends.py, .env.example, .planning/STATE.md]
key-decisions:
  - "Expose mockup response as hero/highlights/latest sections derived from query_trends sorted by fetched_at."
  - "Keep mockup endpoint strictly read-only by using nocodb_trends.query_trends only and never calling workflow.scan_source."
patterns-established:
  - "Mock/demo endpoints should use existing storage reads and avoid live platform polling paths."
requirements-completed: [MOCK-01, MOCK-02, MOCK-03]
duration: 11min
completed: 2026-03-20
---

# Phase quick Plan 01: Mockup API Cost Guardrail Summary

**Read-only mockup trends endpoint now serves deterministic UI sections from stored NocoDB data, enabling demos without X/YouTube polling costs.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-20T05:29:16Z
- **Completed:** 2026-03-20T05:39:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `GET /api/trends/mockup` in `api/routes/trends.py` with small controls (`limit`, `platform`, `category`) and deterministic `hero`, `highlights`, `latest` sections.
- Added dedicated endpoint tests in `tests/test_api_trends_mockup.py` (RED then GREEN) proving grouped payload behavior and no `workflow.scan_source` calls.
- Documented cheap mockup runtime in `.env.example` and `docs/mockup-mode.md`, including copy-paste start/curl commands and expected response keys.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add read-only NocoDB-backed mockup endpoint (TDD RED)** - `84a2c04` (test)
2. **Task 1: Add read-only NocoDB-backed mockup endpoint (TDD GREEN)** - `54cb4ba` (feat)
3. **Task 2: Document and harden mockup-safe runtime mode** - `7d45e19` (chore)

## Files Created/Modified

- `tests/test_api_trends_mockup.py` - New tests for `/api/trends/mockup` payload contract and read-only behavior.
- `api/routes/trends.py` - Added `/api/trends/mockup` and helper projection for grouped mockup sections.
- `.env.example` - Added explicit mockup-mode note for `TRENDS_ENABLED=false`.
- `docs/mockup-mode.md` - Added quick runbook for low-cost mock sessions.

## Decisions Made

- Used existing `nocodb_trends.query_trends` as the sole data source for mockups to guarantee no live platform client activity.
- Kept mockup payload intentionally compact (`hero`, single `highlights` card, `latest` list) to support stable UI card demos.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test command environment mismatch (`python`/`pytest`)**
- **Found during:** Task 1 verification
- **Issue:** `python` binary and direct `pytest` module were unavailable in shell environment.
- **Fix:** Switched verification execution to `uv run pytest ...` for project-managed runtime.
- **Files modified:** None
- **Verification:** `uv run pytest tests/test_api_trends_mockup.py -x -q` and `uv run pytest tests/test_api_trends_read.py -x -q` passed
- **Committed in:** N/A (execution-only adaptation)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope change; execution path adjusted to repository runtime tooling.

## Issues Encountered

- None beyond local test command runtime mismatch.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mock/demo consumers can use `/api/trends/mockup` immediately with scheduler disabled.
- Endpoint is covered by focused tests and documented for repeatable local validation.

## Self-Check: PASSED
