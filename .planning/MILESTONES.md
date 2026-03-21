# Milestones

## v1.3 React Native Mobile App (Shipped: 2026-03-22)

**Phases completed:** 5 phases (11-15), 14 plans, 31 tasks
**Git range:** `d14a2e2` -> `66cfb7d`
**Timeline:** 2026-03-21 to 2026-03-22

**Key accomplishments:**

- Rebranded the inherited WhiteLabelApp scaffold into Trenfy and routed mobile reads through typed FastAPI helpers only.
- Shipped a 3-tab navigation shell with safe-area handling, TypeScript-enforced routes, and lightweight Categories/Profile surfaces.
- Delivered a live approved-trends mobile feed with FlashList, skeleton loading, pull-to-refresh, infinite scroll, debounced search, and source deep links.
- Added platform, category, and region filtering with persisted preferences, clear-all controls, active-filter UI, and collapsible header behavior.
- Rolled out system dark/light theming plus per-element Arabic RTL support without flipping the overall card layout.
- Archives: `.planning/milestones/v1.3-ROADMAP.md`, `.planning/milestones/v1.3-REQUIREMENTS.md`.

---

## v1.2 Web Admin + Demo Feed (Shipped: 2026-03-21)

**Phases completed:** 4 phases (7-10), 16 plans, 97 tasks
**Git range:** `ff99b88` -> `b3bcaaf`
**Timeline:** 2026-03-20 to 2026-03-21

**Key accomplishments:**

- Added shared moderation status support across NocoDB, Pydantic models, and FastAPI routes.
- Shipped a React web frontend with typed API client, token-gated admin routing, and current shadcn/Tailwind setup.
- Delivered the admin moderation workflow: filters, pagination, sorting, approve/reject/delete, edit modal, and bulk actions.
- Delivered sources and categories admin views with optimistic updates and derived counts.
- Shipped a public approved-only `/demo` feed with filters, load-more pagination, responsive cards, and Arabic translation support.

### Known Gaps Accepted At Ship Time

- No `.planning/v1.2-MILESTONE-AUDIT.md` existed at milestone close; the archive proceeded without formal milestone audit coverage.
- The live `.planning/REQUIREMENTS.md` traceability summary remained `0/49` complete during execution and was reconciled at archive time from phase evidence.
- React Native mobile delivery (`APP-01..APP-12`) and earlier verification debt (`REQ-701..REQ-705`, `INFRA-03` human confirmation) remain deferred.
- Archives: `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.2-REQUIREMENTS.md`.

---

## v1.1 Verification and Mobile Delivery (Shipped: 2026-03-20)

**Phases completed:** 1 phase, 2 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v1.0 MVP (Shipped: 2026-03-20)

**Phases completed:** 5 phases (1-5), 17 plans, 33 tasks
**Git range:** `ca0b621` -> `6506a96`
**Timeline:** 2026-03-19 to 2026-03-20

**Key accomplishments:**

- Removed legacy SehaRadar footprint and established a Trenfy-only backend skeleton.
- Built NocoDB-backed source and trends data foundation with scheduler lifecycle wiring.
- Shipped YouTube and X platform clients with normalization, dedup hashing, retries, and circuit breaker safeguards.
- Delivered public REST endpoints for trends, stats, sources, and manual refresh plus Docker Compose deployment contracts.
- Added ingestion filters (threshold + blocklist), Arabic translation enrichment, and advanced trend query filters (`platform`, `q`, `sort_by`, `min_metric_value`).

### Known Gaps Accepted At Ship Time

- CORE-02, CORE-03, and INFRA-03 remained pending in milestone verification evidence.
- CLEN-01..05, PLAT-01..08, API-01..07, INFRA-01, INFRA-02, and INFRA-04 were treated as implemented with verification debt accepted.
- APP-01..APP-12 were deferred to follow-up milestone work.
- Full audit report: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`.

---
