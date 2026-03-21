# Trenfy

## What This Is

Trenfy is a trend-catching platform for gaming, music, and entertainment. The shipped product now includes the FastAPI + NocoDB ingestion backend, a React web admin for moderation and source control, and a public demo feed for approved trends.

## Core Value

Users can open the app and immediately see what's trending right now across gaming, music, and entertainment - filtered to what they care about, tappable to the source.

## Current State

- `v1.2` shipped on 2026-03-21.
- Backend moderation support is live: trend `status`, status-filtered reads, trend PATCH/DELETE, source enable/disable updates, and explicit CORS allowlisting.
- React web surface is live under `web/`: admin auth gate, trends moderation table, sources toggles, categories view, and the public approved-only `/demo` feed.
- Historical milestone artifacts live in `.planning/milestones/v1.2-ROADMAP.md` and `.planning/milestones/v1.2-REQUIREMENTS.md`.
- No next milestone is active yet; start with `/gsd-new-milestone` and a fresh `.planning/REQUIREMENTS.md`.

## Next Milestone Goals

- Deliver the React Native mobile app scope previously deferred as `APP-01..APP-12`.
- Close the remaining verification debt from earlier milestones (`01/03/04-VERIFICATION.md`, `REQ-701..REQ-705`, `INFRA-03` human confirmation, and a proper milestone audit pass).
- Decide whether the web admin/demo surface needs incremental feature work or should stay in maintenance mode while mobile becomes primary.

## Requirements Snapshot

### Validated

- [x] v1.0 backend ingestion pipeline, platform clients, public APIs, and filtering/enrichment capabilities.
- [x] v1.1 requirements traceability repair and baseline reconciliation.
- [x] v1.2 backend moderation endpoints and explicit CORS contract.
- [x] v1.2 React web admin panel for trends, sources, and categories.
- [x] v1.2 public demo feed for approved trends.

### Active

- [ ] No active milestone requirements yet - define the next scope with `/gsd-new-milestone`.

### Deferred

- [ ] React Native mobile app delivery (`APP-01..APP-12`).
- [ ] Verification debt closure for earlier milestone evidence (`01/03/04-VERIFICATION.md`, `REQ-701..REQ-705`).
- [ ] Human confirmation for `INFRA-03` NocoDB table/schema existence.

## Context

- The codebase is roughly 8.1k LOC across Python and TypeScript, with the backend still carrying most of the runtime complexity.
- The React web app now provides operational control and a public review surface, reducing the need to inspect raw NocoDB data directly.
- The main process risk is milestone-close discipline: v1.2 shipped without a milestone audit, and the active requirements file was only reconciled at archive time.

## Constraints

- **Tech stack**: FastAPI backend, NocoDB data store, React web admin/demo now shipped; React Native remains the expected mobile client for the next milestone.
- **X API**: Access limits vary by account tier and endpoint availability - affects polling strategy and retry behavior.
- **YouTube quota**: 10,000 units/day; trending calls cost about 2 units - schedule conservatively.
- **Public product surface**: Demo feed is public; admin access remains token-gated only.
- **Docker only**: No Caddy; backend is exposed directly on port or the internal Docker network.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove all SehaRadar code | Clean slate reduces ambiguity and maintenance overhead | ✓ Validated v1.0 |
| NocoDB as database | Already self-hosted and running; existing client code reusable | ✓ Validated Phase 2 |
| X via official API (tier-aware) | Keep v1 stable with explicit rate-limit handling and graceful degradation | ✓ Implemented v1.0 |
| No auth in v1 | Simplifies public product architecture; trends stay public data | ✓ Kept in v1.0 |
| Docker only (no Caddy) | Reduce infra complexity for v1 | ✓ Kept in v1.0 |
| React Native for mobile | User-specified cross-platform client | ⚠ Deferred to v1.3 |
| Upsert by source id on startup | JSON is additive source of truth; preserves `last_fetched_at` | ✓ Validated Phase 2 |
| `lifespan` context manager | Modern FastAPI pattern over `@app.on_event` | ✓ Validated Phase 2 |
| Ship v1.0 with accepted audit gaps | Preserve release cadence while tracking debt explicitly | ✓ Reconciled in v1.1 |
| Repair traceability in v1.1 before new delivery scope | Earlier evidence debt needed reconciliation before adding more surface area | ✓ Completed v1.1 |
| Ship a React web admin before the mobile app | Unblock moderation and public review workflows with lower scope risk | ✓ Validated v1.2 |
| Use shared `status` moderation state across backend, admin, and demo feed | One approval contract keeps operator actions and public visibility aligned | ✓ Validated v1.2 |
| Keep frontend on relative `/api` requests by default | Vite proxy handles local dev; `VITE_API_URL` stays an explicit override | ✓ Validated v1.2 |
| Use Tailwind v4 with current shadcn tooling | Current shadcn setup no longer cleanly supports the older Tailwind v3 pin | ✓ Validated v1.2 |

<details>
<summary>Archived pre-v1.2 planning context</summary>

### Previous Milestone Focus

- Build a React web admin panel for full content control and a public demo feed page.
- Target features included moderation actions, category/source management, token-gated admin access, and approved-only public browsing.

### Previous Deferred Goals

- Deliver React Native mobile app: `APP-01..APP-12`.
- Close verification debt with `01/03/04-VERIFICATION.md` artifacts.
- Run end-to-end integration coverage for fetch -> persist -> `GET /api/trends` -> client render.

### Previous Requirements Snapshot

- `ADMIN-01..ADMIN-12`, `SRC-01..SRC-04`, `CAT-01..CAT-03`, `DB-01`, and `BAPI-01..BAPI-07` were complete by the end of Phases 07-09.
- `DEMO-01..DEMO-08` remained the final active slice before Phase 10 shipped.

</details>

---
*Last updated: 2026-03-21 after v1.2 milestone archive*
