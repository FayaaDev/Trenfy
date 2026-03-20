# Trenfy

## What This Is

Trenfy is a trend-catching platform that monitors YouTube and X for what's trending in gaming, music, and entertainment. A Python FastAPI backend polls platform APIs on a schedule, normalizes and deduplicates the data, and stores it in NocoDB. A React Native mobile app lets users browse and discover trends filtered by platform or category, and tap through to the original content on its platform.

## Core Value

Users can open the app and immediately see what's trending right now across gaming, music, and entertainment — filtered to what they care about, tappable to the source.

## Requirements

### Validated

*(Validated in Phase 2: data-foundation)*
- [x] NocoDB schema created — `trends` and `trend_sources` tables live in base `ps82pgir3bbih55`
- [x] Source registry loads all configured sources from `config/trend_sources.json`
- [x] Per-source async scheduler with failure isolation (`asyncio.create_task` per source)
- [x] FastAPI app starts scheduler + syncs sources on startup via lifespan hook
- [x] `/health` reports real scheduler state

### Active

- [ ] Backend polls YouTube and X for trending content
- [ ] Trends are normalized, deduplicated, and stored in NocoDB
- [ ] FastAPI server exposes REST endpoints to query trends
- [ ] React Native app displays a browsable, filterable trend feed
- [ ] Users can filter trends by platform (YouTube / X) and category (gaming / music / entertainment)
- [ ] Tapping a trend opens it on its native platform
- [ ] Regions covered: Global (US baseline) + Saudi Arabia focus
- [ ] No user authentication required — fully public app
- [ ] Deployed via Docker Compose (no reverse proxy in v1)
- [ ] Platform scope for v1 remains YouTube + X only; additional platforms are deferred to later milestones

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

- **Existing codebase**: Repo is currently SehaRadar (health surveillance). All SehaRadar code must be removed. A `Trenfy.md` spec document already exists with backend architecture, NocoDB schema, platform client designs, and an implementation order — this is the primary design reference.
- **Partially built**: `trend_agents/shared/models.py` (data models) and `tools/nocodb_trends_client.py` (NocoDB CRUD) are already implemented and should be kept.
- **Infrastructure**: NocoDB is already running (self-hosted Docker). The `trends` and `trend_sources` NocoDB tables need to be created per the schema in `Trenfy.md`.
- **X caveat**: API availability and rate limits vary by account tier; scheduler behavior must remain quota-aware and degrade gracefully.
- **Regions**: YouTube sources already configured for US, SA, JP in `Trenfy.md`. Extend X similarly where API supports it.
- **React Native app**: New addition not in existing spec. Needs Expo or bare RN decision, navigation library, API integration layer.

## Constraints

- **Tech stack**: Python FastAPI backend (already spec'd), React Native mobile app, NocoDB database — no deviations
- **X API**: Access limits vary by account tier and endpoint availability — affects polling strategy and retry behavior
- **YouTube quota**: 10,000 units/day; trending calls cost ~2 units — schedule conservatively (every 15 min = ~96 units/day per region, comfortably within limits)
- **No auth**: App is public; no user table, no sessions, no tokens in v1
- **Docker only**: No Caddy; backend exposed directly on port (or internal Docker network)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove all SehaRadar code | Clean slate — dual-system coexistence causes confusion and bloat | — Pending |
| NocoDB as database | Already self-hosted and running; existing client code reusable | ✓ Validated Phase 2 |
| X via official API (tier-aware) | Keep v1 stable with explicit rate-limit handling and graceful degradation | — Pending |
| No auth in v1 | Simplifies architecture; trends are public data | — Pending |
| Docker only (no Caddy) | Reduce infra complexity for v1 | — Pending |
| React Native for mobile | User specified; cross-platform (iOS + Android) | — Pending |
| Upsert by source id on startup | JSON is additive source of truth; preserves last_fetched_at | ✓ Validated Phase 2 |
| lifespan context manager | Modern FastAPI pattern over @app.on_event | ✓ Validated Phase 2 |

## Current State

Phase 4 complete (2026-03-19) — API contracts and infra hardening are in place.
Phase 5 (React Native App) is next, with platform scope locked to YouTube + X for v1.

---
*Last updated: 2026-03-20 after platform-scope update*
