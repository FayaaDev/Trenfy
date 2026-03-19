# Trenfy

## What This Is

Trenfy is a trend-catching platform that monitors YouTube, Spotify, Steam, and TikTok for what's trending in gaming, music, and entertainment. A Python FastAPI backend polls platform APIs on a schedule, normalizes and deduplicates the data, and stores it in NocoDB. A React Native mobile app lets users browse and discover trends filtered by platform or category, and tap through to the original content on its platform.

## Core Value

Users can open the app and immediately see what's trending right now across gaming, music, and entertainment — filtered to what they care about, tappable to the source.

## Requirements

### Validated

*(Validated in Phase 2: data-foundation)*
- [x] NocoDB schema created — `trends` and `trend_sources` tables live in base `ps82pgir3bbih55`
- [x] Source registry loads all 8 configured sources from `config/trend_sources.json`
- [x] Per-source async scheduler with failure isolation (`asyncio.create_task` per source)
- [x] FastAPI app starts scheduler + syncs sources on startup via lifespan hook
- [x] `/health` reports real scheduler state

### Active

- [ ] Backend polls YouTube, Spotify, Steam, and TikTok for trending content
- [ ] Trends are normalized, deduplicated, and stored in NocoDB
- [ ] FastAPI server exposes REST endpoints to query trends
- [ ] React Native app displays a browsable, filterable trend feed
- [ ] Users can filter trends by platform (YouTube / Spotify / Steam / TikTok) and category (gaming / music / entertainment)
- [ ] Tapping a trend opens it on its native platform
- [ ] Regions covered: Global (US baseline) + Saudi Arabia focus
- [ ] No user authentication required — fully public app
- [ ] Deployed via Docker Compose (no reverse proxy in v1)

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
- **TikTok caveat**: No official public API. Approach is RapidAPI TikTok scraper or unofficial web scraping — needs investigation during research phase.
- **Regions**: YouTube sources already configured for US, SA, JP in `Trenfy.md`. Extend Spotify/Steam similarly where API supports it.
- **React Native app**: New addition not in existing spec. Needs Expo or bare RN decision, navigation library, API integration layer.

## Constraints

- **Tech stack**: Python FastAPI backend (already spec'd), React Native mobile app, NocoDB database — no deviations
- **TikTok API**: No official API; must use RapidAPI or scraping — affects reliability and rate limits
- **YouTube quota**: 10,000 units/day; trending calls cost ~2 units — schedule conservatively (every 15 min = ~96 units/day per region, comfortably within limits)
- **No auth**: App is public; no user table, no sessions, no tokens in v1
- **Docker only**: No Caddy; backend exposed directly on port (or internal Docker network)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove all SehaRadar code | Clean slate — dual-system coexistence causes confusion and bloat | — Pending |
| NocoDB as database | Already self-hosted and running; existing client code reusable | ✓ Validated Phase 2 |
| TikTok via RapidAPI/scraping | No official public API available | — Pending |
| No auth in v1 | Simplifies architecture; trends are public data | — Pending |
| Docker only (no Caddy) | Reduce infra complexity for v1 | — Pending |
| React Native for mobile | User specified; cross-platform (iOS + Android) | — Pending |
| Upsert by source id on startup | JSON is additive source of truth; preserves last_fetched_at | ✓ Validated Phase 2 |
| lifespan context manager | Modern FastAPI pattern over @app.on_event | ✓ Validated Phase 2 |

## Current State

Phase 2 complete (2026-03-19) — Data foundation in place. Scheduler runs, NocoDB schema live,
source registry working. Phase 3 (Platform Clients) is next: YouTube, Spotify, Steam clients
with real API calls replacing the Phase 2 stubs.

---
*Last updated: 2026-03-19 after Phase 2 completion*
