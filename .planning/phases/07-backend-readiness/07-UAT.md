---
status: partial
phase: 07-backend-readiness
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md]
started: 2026-03-20T20:33:13Z
updated: 2026-03-20T21:05:14Z
---

## Current Test

[testing paused - 1 items outstanding]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running backend instance, then start the app from scratch. Startup should complete without errors, migrations/seeding should not fail, and a basic request such as GET /api/trends should return live data instead of a boot error.
result: pass

### 2. Approved Trends Filter
expected: Calling GET /api/trends?status=approved returns only approved items, and each returned item exposes status as "approved".
result: pass

### 3. Pending Trends Filter
expected: Calling GET /api/trends?status=pending returns pending items and normalizes any legacy blank/null status rows so the response still shows a non-empty status of "pending".
result: pass

### 4. Invalid Status Rejected
expected: Calling GET /api/trends?status=bogus is rejected with a 400-style invalid-status response instead of silently accepting the value.
result: pass

### 5. Trend Patch Updates Fields
expected: PATCH /api/trends/{id} with a few editable fields updates only the provided fields and returns the refreshed trend object with the new values.
result: pass

### 6. Trend Patch Validation
expected: PATCH /api/trends/{id} rejects unsupported status values and blank titles with a validation error instead of saving bad data.
result: pass

### 7. Trend Delete Removes Record
expected: DELETE /api/trends/{id} returns an acknowledgement like {"id": "...", "deleted": true}, and the deleted trend no longer resolves as an existing record.
result: pass

### 8. Missing Trend Targets Return 404
expected: PATCH or DELETE against a non-existent trend id returns an explicit JSON 404 payload rather than a silent success or generic server error.
result: pass

### 9. Source Toggle Updates Enabled State
expected: PATCH /api/sources/{id} with enabled=true or enabled=false updates that source by stable source id and returns the updated source object showing the new enabled state.
result: pass

### 10. Missing Source Returns 404
expected: PATCH /api/sources/{id} for a non-existent source returns an explicit JSON 404 payload.
result: pass

### 11. CORS Allowlist and Preflight
expected: Browser/API preflight from http://localhost:5173 succeeds for PATCH/DELETE/OPTIONS, wildcard origins are not used, and any extra origins from CORS_ORIGINS are honored explicitly.
result: blocked
blocked_by: server
reason: "the docker server is running at http://localhost:8080/health, not 5173"

## Summary

total: 11
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none yet]
