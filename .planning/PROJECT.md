# Trenfy

## What This Is

Trenfy is a trend-catching platform for gaming, music, and entertainment. The v1.1 scope delivered requirements traceability repair — reconciling all 59 v1.0 requirement IDs, closing CORE-02/CORE-03 as validated, and establishing the active requirements baseline for next milestone work. The backend pipeline (shipped v1.0) and a cost-safe mockup endpoint are live. Mobile app delivery is the primary next milestone focus.

## Core Value

Users can open the app and immediately see what's trending right now across gaming, music, and entertainment — filtered to what they care about, tappable to the source.

## Current State

- v1.1 shipped on 2026-03-20 with Phase 6 (2 plans, 3 tasks).
- Requirements baseline repaired: 59 v1.0 IDs reconciled across CLEN/CORE/PLAT/API/FILT/APP/INFRA categories.
- CORE-02, CORE-03 formally closed as validated (Phase 2 VERIFICATION.md confirmed); INFRA-03 confirmed satisfied-pending one human NocoDB check.
- 24/59 v1.0 requirements are fully validated; 24 remain satisfied-evidence-pending (code done, missing VERIFICATION.md artifacts); 12 (APP-01..12) remain deferred to next milestone.
  - **Phase 07 (Backend Readiness) complete**: 4 plans, 138 tests green, all 7 BAPI requirements verified. FastAPI backend now exposes status-filtered reads, trend PATCH/DELETE mutations, source enable/disable toggling, and explicit CORS allowlist.
  - **Phase 08 (Web Scaffold + Auth) complete**: 3 plans, Vite + React + TS scaffold, typed API client, AdminGuard auth gate, React Router routes.
  - **Phase 09 (Admin Panel) complete**: 6 plans, 20/20 requirements verified. TrendsPage (table, filters, pagination, sort, approve/reject/delete, edit modal, bulk actions), SourcesPage (toggle with optimistic updates), CategoriesPage (distinct categories + counts).

## Current Milestone: v1.2 Web Admin + Demo Feed

**Goal:** Build a React web admin panel for full content control and a public demo feed page.

**Target features:**
- API control panel (health, stats, refresh, mock endpoints as interactive buttons)
- Trend content list showing both original and Arabic translation columns
- Content review workflow: approve/reject, edit, delete (requires adding `status` field to Trenfy table)
- Category management: enforce controlled category list, move content between categories
- Trend sources panel: view sources, toggle enabled/disabled
- Simple password/token protection on the admin page
- Public demo feed page showing approved-only trends

## Deferred Milestone Goals

- Deliver React Native mobile app: APP-01..APP-12 (scaffold, FlashList feed, filtering, deep links, RTL support, pull-to-refresh, error/loading states).
- Close verification debt: create 01/03/04-VERIFICATION.md artifacts covering CLEN/PLAT/API/INFRA satisfied-evidence-pending requirements.
- Run E2E integration test: fetch→persist→GET /api/trends→mobile render.

## Requirements Snapshot

### Validated

- [x] NocoDB-backed ingestion pipeline and source lifecycle are implemented. — v1.0
- [x] YouTube and X clients fetch, normalize, and deduplicate trend data. — v1.0
- [x] Trend APIs and Docker runtime contracts are implemented and available. — v1.0
- [x] Filtering and Arabic enrichment capabilities are integrated into ingestion/query paths. — v1.0
- [x] Requirements traceability baseline established: 59 v1.0 IDs reconciled with correct statuses. — v1.1
- [x] CORE-02 (source registry) and CORE-03 (Pydantic models) closed as validated via Phase 2 evidence. — v1.1
- [x] INFRA-03 NocoDB schema confirmed satisfied-pending human table check. — v1.1

### Active (v1.2 targets)

  - [x] ADMIN-01..ADMIN-12: React web admin panel — trends table, filters, pagination, sort, approve/reject/delete, edit modal, bulk actions, toasts. — Phase 09 complete
  - [x] SRC-01..SRC-04: Sources panel — toggle enable/disable with optimistic mutations, color-coded status badge. — Phase 09 complete
  - [x] CAT-01..CAT-03: Categories panel — distinct categories with counts, fallback defaults. — Phase 09 complete
  - [ ] DEMO-01..DEMO-0x: Public demo feed page — approved content only.
- [x] DB-01: `status` field (pending/approved/rejected) live in Trenfy NocoDB table — confirmed via MCP.
- [x] BAPI-01..BAPI-07: Backend API backend-readiness endpoints — complete (Phase 07).

### Deferred (next milestone)

- [ ] Verification debt closure: create 01/03/04-VERIFICATION.md for CLEN/PLAT/API/INFRA groups.
- [ ] INFRA-03 human verification: confirm NocoDB `trends` and `trend_sources` table existence.
- [ ] APP-01..APP-12: React Native mobile app delivery.

### Out of Scope

- User authentication / accounts — not needed, app is public
- Push notifications — defer to v2
- Trend bookmarks / favorites — defer to v2
- LLM trend analysis / classification — structured API data is sufficient
- Caddy reverse proxy — Docker only for v1
- Twitch — good for gaming but defer to v2 to reduce scope
- Cross-platform trend scoring — per-platform only in v1
- Email digests — pattern exists in old codebase, defer to v2

## Context

- Backend codebase is approximately 4.3k lines of Python focused on ingestion/workflow/API paths.
- NocoDB base and source table IDs are already established for local runtime.
- Quick-task work exists for cost-safe mockup payload usage without live refresh pressure.
- Current risk is mobile delivery execution (12 APP requirements) and closing 24 satisfied-evidence-pending items with proper VERIFICATION.md artifacts.

## Constraints

- **Tech stack**: Python FastAPI backend (already spec'd), React Native mobile app, NocoDB database — no deviations
- **X API**: Access limits vary by account tier and endpoint availability — affects polling strategy and retry behavior
- **YouTube quota**: 10,000 units/day; trending calls cost ~2 units — schedule conservatively (every 15 min = ~96 units/day per region, comfortably within limits)
- **No auth**: App is public; no user table, no sessions, no tokens in v1
- **Docker only**: No Caddy; backend exposed directly on port (or internal Docker network)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove all SehaRadar code | Clean slate reduces ambiguity and maintenance overhead | ✓ Validated v1.0 |
| NocoDB as database | Already self-hosted and running; existing client code reusable | ✓ Validated Phase 2 |
| X via official API (tier-aware) | Keep v1 stable with explicit rate-limit handling and graceful degradation | ✓ Implemented v1.0 |
| No auth in v1 | Simplifies architecture; trends are public data | ✓ Kept in v1.0 |
| Docker only (no Caddy) | Reduce infra complexity for v1 | ✓ Kept in v1.0 |
| React Native for mobile | User-specified cross-platform client | ⚠ Deferred to v1.2 |
| Upsert by source id on startup | JSON is additive source of truth; preserves last_fetched_at | ✓ Validated Phase 2 |
| lifespan context manager | Modern FastAPI pattern over @app.on_event | ✓ Validated Phase 2 |
| Ship v1.0 with accepted audit gaps | Preserve release cadence while tracking debt explicitly | ✓ Reconciled in v1.1 |
| Repair traceability in v1.1 before mobile work | 24 satisfied-evidence-pending items needed reconciliation before adding new scope | ✓ Completed v1.1 |

---
*Last updated: 2026-03-21 after Phase 09 (Admin Panel) complete*
