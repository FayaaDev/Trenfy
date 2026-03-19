# Trenfy Roadmap

**Generated:** 2026-03-19
**Phases:** 5
**Requirements covered:** 41/41

---

## Phase 1: Clean Slate
**Goal:** Remove all SehaRadar code and establish the Trenfy project skeleton
**Requirements:** CLEN-01, CLEN-02, CLEN-03, CLEN-04, CLEN-05
**Plans:** 2 plans

### Plans
- [x] 01-01-PLAN.md — Delete SehaRadar files, clean tools/ and config/ (CLEN-01, CLEN-02) ✓ ca0b621
- [x] 01-02-PLAN.md — Rewrite pyproject.toml, docker-compose.yml, create app.py skeleton (CLEN-03, CLEN-04, CLEN-05) ✓ cb3c5e9

### Success Criteria
1. The repository contains zero SehaRadar files — no health_agents/, no server.py, no bridge-service.js, no promed scripts; `git ls-files` shows only Trenfy-relevant paths
2. `python -c "import app"` succeeds from the repo root with no import errors from deleted modules
3. `pyproject.toml` identifies the project as `trenfy` with only Trenfy dependencies; `pip install -e .` completes cleanly
4. `docker-compose.yml` and `.env.example` reference only Trenfy services and environment variables — no RSSHub, no Caddy, no SehaRadar keys

---

## Phase 2: Data Foundation
**Goal:** FastAPI core, NocoDB schema, source registry, Pydantic models, and per-source async scheduler running end-to-end
**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, INFRA-03
**Plans:** 3/4 plans executed

### Plans
- [ ] 02-01-PLAN.md — NocoDB table creation via MCP (trends verify + trend_sources create, capture NOCODB_SOURCES_TABLE_ID)
- [ ] 02-02-PLAN.md — Source registry (source_registry.py loading trend_sources.json into List[TrendSource])
- [ ] 02-03-PLAN.md — NocoDB client extension (sync_sources, update_source_status) + TrendsWorkflow stub
- [ ] 02-04-PLAN.md — TrendsScheduler + app.py lifespan wiring + real /health scheduler state

### Success Criteria
1. `GET /health` returns `{"status": "ok", "scheduler_running": true}` within 200ms after server startup
2. The NocoDB `trends` and `trend_sources` tables exist with all columns matching the Trenfy.md schema; the NocoDB client can write a test TrendItem and read it back without error
3. The scheduler starts all four sources (YouTube, Spotify, Steam, TikTok) on their configured intervals; killing one source's task with a simulated exception leaves the other three running unaffected
4. `config/trend_sources.json` loads via the source registry and returns a typed list of `TrendSource` objects with correct intervals and enabled flags

---

## Phase 3: Platform Clients
**Goal:** All four platform clients fetching, normalizing, and persisting real trend data with deduplication and failure isolation
**Requirements:** PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07, PLAT-08

### Success Criteria
1. YouTube client fetches trending videos for US, SA, and JP regions and persists them to NocoDB; running the scheduler twice within 15 minutes produces zero duplicate rows (content_hash dedup confirmed)
2. Spotify client obtains and silently refreshes its OAuth2 token; concurrent refresh calls under `asyncio.Lock` never produce a 401 error reaching NocoDB
3. Steam client returns a non-empty list of top sellers under normal conditions; when the Steam store HTML changes, it logs `SCRAPE_DEGRADED` and returns an empty list rather than raising an exception
4. TikTok client fetches trending content via RapidAPI; after 3 consecutive API failures it auto-disables and logs a clear circuit-breaker message while YouTube, Spotify, and Steam continue polling uninterrupted

---

## Phase 4: API & Infrastructure
**Goal:** All REST endpoints live and reachable, Docker Compose stack deployable with a single `docker compose up`
**Requirements:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, INFRA-01, INFRA-02, INFRA-04

### Success Criteria
1. `GET /api/trends?platform=youtube&region_code=US&limit=20` returns a paginated JSON response with correct filtering; `GET /api/trends/{id}` returns the matching row; `GET /api/trends/stats` returns per-platform counts
2. `POST /api/trends/refresh` with a valid `source_id` triggers an immediate fetch and returns within 5 seconds; `GET /api/sources` reflects the updated `last_fetched_at` for that source
3. `docker compose up` starts both the `trenfy-backend` and `nocodb` services; the FastAPI health endpoint is reachable from the host and backend-to-NocoDB calls use the internal Docker network URL
4. A React Native app running on a local device can call `GET /api/trends` and receive a response — CORS headers present, NocoDB token never visible in any mobile-side network request

---

## Phase 5: React Native App
**Goal:** Expo app with a fully functional, filterable trend feed that deep-links to native platforms and persists user preferences
**Requirements:** APP-01, APP-02, APP-03, APP-04, APP-05, APP-06, APP-07, APP-08, APP-09, APP-10, APP-11, APP-12

### Success Criteria
1. The feed loads and displays trend cards (thumbnail, title, platform icon, metric label, time-ago) within 2 seconds of app open; scrolling 200+ items produces no visible jank (FlashList recycling confirmed)
2. Platform tabs and category filter chips correctly narrow the visible list client-side without additional API calls; selected filters survive an app restart (AsyncStorage persistence confirmed)
3. Tapping a trend card opens the correct source URL in the device's native app or browser; Arabic-titled trends from the SA region render with correct RTL text direction
4. Pull-to-refresh triggers `POST /api/trends/refresh` for the active platform filter; skeleton loaders appear during fetch; an unreachable API shows an error state with a working retry button

---

*Roadmap generated: 2026-03-19*
