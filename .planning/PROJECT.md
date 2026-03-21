# Trenfy

## What This Is

Trenfy is a multi-surface trend-catching product for gaming, music, and entertainment. The shipped system now includes the FastAPI + NocoDB ingestion backend, a React web admin and public demo feed, and a React Native mobile app for browsing live approved trends.

## Core Value

Users can open Trenfy and immediately see what's trending right now across gaming, music, and entertainment - filtered to what they care about and tappable back to the source.

## Current State

- `v1.3 React Native Mobile App` shipped on 2026-03-22.
- The mobile app under `WhiteLabelApp/` is now Trenfy-branded and wired to the FastAPI backend with approved-only reads, typed navigation, live feed loading, persisted filters, system theming, and Arabic-safe cards.
- Backend moderation contracts plus the `web/` admin/demo surfaces shipped in `v1.2` remain the operational backbone behind the mobile experience.
- Historical milestone artifacts live under `.planning/milestones/`, including `.planning/milestones/v1.3-ROADMAP.md` and `.planning/milestones/v1.3-REQUIREMENTS.md`.
- Categories and Profile remain intentionally lightweight mobile shells after v1.3 scope reduction; the next milestone should re-scope them explicitly instead of treating them as implicit carry-over.

## Next Milestone Goals

- Define the next mobile milestone with a fresh `.planning/REQUIREMENTS.md` and roadmap via `/gsd-new-milestone`.
- Decide whether the next consumer slice focuses on richer Categories/Profile surfaces, saved trends, or auth-backed personalization.
- Keep delivery scoped to deliberate product slices rather than carrying removed phase ideas forward implicitly.

## Requirements Snapshot

### Validated

- [x] v1.0 backend ingestion pipeline, platform clients, public APIs, and filtering/enrichment capabilities.
- [x] v1.1 requirements traceability repair and baseline reconciliation.
- [x] v1.2 backend moderation endpoints, explicit CORS contract, React web admin, and public demo feed.
- [x] v1.3 mobile foundation: Trenfy branding, FastAPI-only client wiring, approved-trends feed, platform/category/region filtering, system theming, and Arabic RTL-safe presentation.

### Active

- [ ] Re-scope the Categories and Profile tabs from lightweight shells into explicit next-milestone product work.
- [ ] Decide the saved-trends and personalization strategy before writing the next mobile requirements set.

### Deferred

- [ ] Verification debt closure for earlier milestone evidence (`01/03/04-VERIFICATION.md`, `REQ-701..REQ-705`).
- [ ] Human confirmation for `INFRA-03` NocoDB table/schema existence.
- [ ] Auth backend for synced saves/preferences.

## Context

- The codebase is roughly 11.6k LOC across Python, TypeScript, and JavaScript, with the backend still carrying most of the runtime complexity and the mobile app now providing the primary consumer surface.
- Trenfy now spans three shipped product surfaces: backend ingestion/API, web admin/demo, and a React Native feed app.
- The next milestone should start from fresh requirements rather than old carry-over lists; v1.3 proved that removed mobile scope needs to be re-scoped explicitly.

## Constraints

- **Tech stack**: FastAPI backend, NocoDB data store, React web admin/demo, and React Native mobile client.
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
| React Native for mobile | User-specified cross-platform client | ✓ Validated v1.3 |
| Upsert by source id on startup | JSON is additive source of truth; preserves `last_fetched_at` | ✓ Validated Phase 2 |
| `lifespan` context manager | Modern FastAPI pattern over `@app.on_event` | ✓ Validated Phase 2 |
| Ship v1.0 with accepted audit gaps | Preserve release cadence while tracking debt explicitly | ✓ Reconciled in v1.1 |
| Repair traceability in v1.1 before new delivery scope | Earlier evidence debt needed reconciliation before adding more surface area | ✓ Completed v1.1 |
| Ship a React web admin before the mobile app | Unblock moderation and public review workflows with lower scope risk | ✓ Validated v1.2 |
| Use shared `status` moderation state across backend, admin, and demo feed | One approval contract keeps operator actions and public visibility aligned | ✓ Validated v1.2 |
| Keep frontend on relative `/api` requests by default | Vite proxy handles local dev; `VITE_API_URL` stays an explicit override | ✓ Validated v1.2 |
| Use Tailwind v4 with current shadcn tooling | Current shadcn setup no longer cleanly supports the older Tailwind v3 pin | ✓ Validated v1.2 |
| Evolve the existing WhiteLabelApp scaffold in place | Faster path to mobile delivery than re-scaffolding a new Expo app | ✓ Validated v1.3 |
| Route all mobile reads through FastAPI only | Keeps mobile decoupled from NocoDB schema and enforces approved-only consumer data | ✓ Validated v1.3 |
| Prioritize feed and filtering before deeper profile features | The live trend feed is the core consumer value; richer secondary tabs can be scoped later | ✓ Validated v1.3 |
| Use ThemeContext plus system color scheme | One token-driven theming model keeps dark/light support consistent | ✓ Validated v1.3 |
| Apply RTL per text element, not app-wide | Arabic copy needs correct direction without flipping the LTR card layout | ✓ Validated v1.3 |

<details>
<summary>Archived v1.3 planning context</summary>

### Milestone Goal

- Rebuild the WhiteLabelApp as the Trenfy mobile consumer app and wire it to the live Trenfy API.

### Planned Feature Themes

- 3-tab navigation: Trending Now, Categories, Profile
- Live approved-trends feed with FlashList, search, refresh, infinite scroll, and source links
- Platform/category/region filters with persisted preferences
- System dark mode and Arabic RTL support
- Optional future extensions around category discovery, saved trends, and social sign-in

</details>

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-22 after v1.3 milestone completion*
