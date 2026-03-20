# Trenfy

## What This Is

Trenfy is a trend-catching platform for gaming, music, and entertainment. The shipped v1.0 scope delivers a Python FastAPI backend that polls YouTube and X, normalizes and deduplicates trend data, and persists it to NocoDB for API consumption. Mobile app delivery remains the next milestone focus.

## Core Value

Users can open the app and immediately see what's trending right now across gaming, music, and entertainment — filtered to what they care about, tappable to the source.

## Current State

- v1.0 MVP shipped on 2026-03-20 across Phases 1-5 (17 plans, 33 tasks).
- Backend pipeline is live: source registry, per-source scheduler isolation, YouTube/X clients, trend APIs, and filtering/enrichment extensions.
- Milestone was archived with accepted verification debt and deferred mobile app scope. See `.planning/milestones/v1.0-MILESTONE-AUDIT.md` and `.planning/milestones/v1.0-REQUIREMENTS.md`.

## Next Milestone Goals

- Phase 6: Repair requirements baseline and traceability consistency.
- Phase 7: Rebuild missing milestone verification artifacts and backend E2E proof.
- Phase 8: Deliver React Native v1 scope and verify mobile-to-backend flow.

## Requirements Snapshot

### Validated

- [x] NocoDB-backed ingestion pipeline and source lifecycle are implemented.
- [x] YouTube and X clients fetch, normalize, and deduplicate trend data.
- [x] Trend APIs and Docker runtime contracts are implemented and available.
- [x] Filtering and Arabic enrichment capabilities are integrated into ingestion/query paths.

### Active (v1.1 Carry-Over)

- [ ] Verification debt closure for CLEN/PLAT/API/INFRA requirement groups.
- [ ] CORE-02, CORE-03, and INFRA-03 closure evidence.
- [ ] APP-01..APP-12 mobile delivery and verification.

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
- Current risk is process quality (traceability + verification completeness), not backend feature absence.

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
| React Native for mobile | User-specified cross-platform client | ⚠ Deferred to v1.1 |
| Upsert by source id on startup | JSON is additive source of truth; preserves last_fetched_at | ✓ Validated Phase 2 |
| lifespan context manager | Modern FastAPI pattern over @app.on_event | ✓ Validated Phase 2 |
| Ship v1.0 with accepted audit gaps | Preserve release cadence while tracking debt explicitly | ⚠ Requires closure in Phases 6-8 |

---
*Last updated: 2026-03-20 after v1.0 milestone archival*
