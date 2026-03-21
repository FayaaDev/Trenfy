---
phase: 09-admin-panel
plan: "07"
subsystem: ui
tags: [vite, react, docs, uat, proxy]
requires:
  - phase: 08-web-scaffold-auth
    provides: typed API client with relative /api requests and Vite proxy fallback
provides:
  - corrected local Vite proxy contract aligned to the backend default port
  - explicit VITE_API_URL override guidance for non-default backends
  - UAT and planning docs updated to match the live local runtime contract
affects: [phase-08-docs, phase-09-uat, local-dev]
tech-stack:
  added: []
  patterns: [relative /api requests with Vite proxy default, explicit env override for non-default backends]
key-files:
  created: []
  modified: [web/vite.config.ts, web/.env.example, .planning/phases/09-admin-panel/09-UAT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/phases/08-web-scaffold-auth/08-02-SUMMARY.md, .planning/phases/08-web-scaffold-auth/08-UAT.md]
key-decisions:
  - "Treat localhost:8080 as the authoritative local backend target for the Vite /api proxy."
  - "Keep the frontend on relative /api requests and reserve VITE_API_URL for explicit non-default backend overrides."
patterns-established:
  - "Local runtime contract: planning docs, UAT docs, and Vite proxy defaults must describe the same backend port."
  - "API override contract: empty VITE_API_URL means use the local Vite proxy; set it only for non-default backend targets."
requirements-completed: [WEB-08, ADMIN-01, ADMIN-02]
duration: 1 min
completed: 2026-03-21
---

# Phase 09 Plan 07: Admin Trends Proxy Contract Summary

**Vite's local `/api` proxy now targets the repo default backend on `localhost:8080`, with matching UAT and planning docs that explain `VITE_API_URL` as the supported override path.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-21T05:27:45Z
- **Completed:** 2026-03-21T05:28:36Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Updated `web/vite.config.ts` and `web/.env.example` so local admin requests use the backend's documented default port without changing the API client model.
- Revised `09-UAT.md` so testers start the backend before opening `/admin/trends` and know how to rerun with `VITE_API_URL` when needed.
- Corrected active and referenced planning docs so WEB-08 and Phase 08/09 guidance no longer contradict the live runtime contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Align the frontend dev API default with the backend runtime contract** - `cd7f7c1` (fix)
2. **Task 2: Update Phase 09 UAT with the real backend prerequisite and rerun path** - `2596142` (docs)
3. **Task 3: Correct the authoritative planning docs for the proxy/runtime contract** - `6974f25` (docs)

## Files Created/Modified
- `web/vite.config.ts` - points the dev `/api` proxy at `http://localhost:8080`
- `web/.env.example` - explains the default proxy path and `VITE_API_URL` override contract
- `.planning/phases/09-admin-panel/09-UAT.md` - adds backend startup prerequisites and rerun guidance for `/admin/trends`
- `.planning/REQUIREMENTS.md` - updates WEB-08 to the corrected default backend contract
- `.planning/ROADMAP.md` - aligns Phase 7/8 proxy and smoke-test wording with port `8080`
- `.planning/phases/08-web-scaffold-auth/08-02-SUMMARY.md` - corrects the historical proxy summary and fallback wording
- `.planning/phases/08-web-scaffold-auth/08-UAT.md` - adds the backend prerequisite note for later API-backed admin checks

## Decisions Made
- `localhost:8080` remains the single source of truth for the repo's default local backend runtime.
- The frontend keeps relative `/api` requests; operators only set `VITE_API_URL` when intentionally targeting a different backend URL.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

- `.planning/ROADMAP.md:133` - historical Phase 08 task text still references stub `AdminPage` and `DemoPage` placeholders because it documents what originally shipped, not current runtime behavior.
- `.planning/ROADMAP.md:134` - historical Phase 08 roadmap text mentions a placeholder `VITE_ADMIN_TOKEN` example value in `.env.example`; this is intentional documentation for local setup.
- `.planning/REQUIREMENTS.md:66` - AUTH-04 explicitly requires a placeholder example for `VITE_ADMIN_TOKEN` in `.env.example`; this is intentional and does not block the proxy contract fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 09 gap closure is complete and the local trends-page startup contract is now explicit.
- Phase 09 is ready to remain closed; Phase 10 planning/execution can rely on the corrected frontend-backend dev contract.

## Self-Check: PASSED

- Verified `.planning/phases/09-admin-panel/09-07-SUMMARY.md` exists on disk.
- Verified task commits `cd7f7c1`, `2596142`, and `6974f25` exist in git history.
