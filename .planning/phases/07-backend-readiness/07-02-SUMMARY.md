---
phase: 07-backend-readiness
plan: "02"
subsystem: api
tags: [fastapi, nocodb, status, filtering, moderation]

requires:
  - phase: 07-01
    provides: TrendItem.status field and NocoDB serialization default
provides:
  - GET /api/trends accepts optional status query param (pending/approved/rejected)
  - 400 response for unsupported status values
  - Legacy null/empty status rows treated as pending
  - validate_status_filter helper in api/contracts.py
  - _normalize_trend_status helper in NocoDBTrendsClient
affects:
  - 07-03-mutation-endpoints
  - 07-04-source-cors
  - frontend-admin-panel

tech-stack:
  added: []
  patterns:
    - "Status validation at route boundary via validate_status_filter"
    - "approved/rejected: NocoDB where clause; pending: post-filter for legacy row compat"
    - "Response normalization: status field always a string when filter is active"

key-files:
  created: []
  modified:
    - api/contracts.py
    - api/routes/trends.py
    - tools/nocodb_trends_client.py
    - tests/test_api_trends_read.py

key-decisions:
  - "pending filter uses post-filter (not NocoDB where) to catch legacy null/empty rows"
  - "Status normalization only applied to response rows when status filter is active — avoids breaking existing callers"
  - "validate_status_filter lives in contracts.py, not inline, for reuse by mutation endpoints"

patterns-established:
  - "Status validation: validate_status_filter(value) -> Optional[str] | raises ValueError('invalid_status')"
  - "Legacy row normalization: _normalize_trend_status(row) -> str, always returns non-empty string"

requirements-completed:
  - DB-02
  - BAPI-02

duration: 20min
completed: 2026-03-20
---

# Plan 07-02: Read-side Status Filter Summary

**`GET /api/trends?status=approved|pending|rejected` with legacy null-row normalization and shared validation helper**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-20
- **Completed:** 2026-03-20
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `VALID_STATUSES`, `validate_status_filter`, `INVALID_STATUS` added to `api/contracts.py`
- `list_trends` accepts `status` query param — validates before other checks, returns 400 on invalid
- `NocoDBTrendsClient.query_trends` gains `status` param — approved/rejected use NocoDB filter, pending uses post-filter for legacy compat
- `_normalize_trend_status` helper handles null/empty/whitespace-only status → `"pending"`
- 8 new tests across both test files (13 model tests + 3 read tests + existing 9 = 25 total)

## Task Commits

1. **Task 1: Status validation helpers** — `660f7fd` (feat: VALID_STATUSES + validate_status_filter)
2. **Task 2: Status-aware filtering** — `c7a95e6` (feat: status filter in route + client)

## Files Created/Modified
- `api/contracts.py` — VALID_STATUSES, validate_status_filter, INVALID_STATUS
- `api/routes/trends.py` — status param + validation + forwarding
- `tools/nocodb_trends_client.py` — _normalize_trend_status + status in query_trends
- `tests/test_api_trends_read.py` — 3 new status filter tests

## Decisions Made
- `pending` filter post-filters after NocoDB query (not a where clause) so legacy rows with null status are included
- Response normalization (`row["status"] = _normalize_trend_status(row)`) only applied when status filter is active — avoids mutating unfiltered responses

## Deviations from Plan
None — plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- Read-side status contract is live — mutation endpoints (07-03) can target the same status values
- `validate_status_filter` is ready for reuse in PATCH/DELETE routes

---
*Phase: 07-backend-readiness*
*Completed: 2026-03-20*
