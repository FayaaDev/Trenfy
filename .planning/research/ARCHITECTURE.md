# Trenfy — Architecture Research

## 1. Component Boundaries

### Platform Pollers (`tools/trend_clients/`)
**Owns:**
- All HTTP communication with external platform APIs (YouTube Data API v3, Spotify Web API, Steam Store API/scraper, TikTok via RapidAPI)
- Platform-specific auth (YouTube API key, Spotify OAuth2 token lifecycle, Steam key, RapidAPI header)
- Response parsing: raw API JSON → `TrendItem` list
- Per-client caching (TTL-based, in-memory)
- Retry logic for transient failures

**Does NOT own:**
- Deduplication (that's the workflow)
- Persistence (that's NocoDB client)
- Scheduling (that's the scheduler)
- Business-level error recovery (that's the workflow caller)

---

### Trends Workflow (`workflows/trends_workflow.py`)
**Owns:**
- Orchestrating one full scan cycle for a single `TrendSource`
- Calling the correct platform client based on `source.platform`
- Generating `content_hash` per item
- Batch dedup check against NocoDB
- Storing new items via NocoDB client
- Writing `last_fetched_at` + `last_fetch_status` back to `trend_sources`
- Returning structured stats (`{fetched, stored, duplicates}`)

**Does NOT own:**
- Knowing when to run (that's the scheduler)
- HTTP transport (that's the platform clients)
- NocoDB REST mechanics (that's the NocoDB client)

---

### Scheduler (`workflows/trends_scheduler.py`)
**Owns:**
- In-process asyncio loop, checking every 60 seconds
- Per-source due-time calculation using `check_interval_minutes`
- Launching `asyncio.create_task(workflow.scan_source(source))` for due sources
- Not blocking on individual source runs (tasks are fire-and-forget)
- Tracking consecutive failure counts per source (for backoff/disable logic)

**Does NOT own:**
- The scan logic itself (that's the workflow)
- HTTP transport (that's the clients)
- Exposing a manual trigger endpoint (that's FastAPI)

---

### NocoDB Client (`tools/nocodb_trends_client.py`)
**Owns:**
- All NocoDB REST API calls for `trends` and `trend_sources` tables
- URL fallback chain (internal Docker URL → public URL → fallback)
- Translating `TrendItem` Pydantic models to/from NocoDB row format
- Bulk insert, dedup hash lookup, source status updates

**Does NOT own:**
- Business logic (whether a trend is a duplicate is decided by the workflow)
- Scheduling or polling
- Serving data to the mobile app (that's FastAPI)

---

### FastAPI Server (`app.py`)
**Owns:**
- HTTP REST API contract for the mobile app
- Query parameter validation and pagination
- Translating NocoDB responses to clean API response shapes
- Rate limiting on `/api/trends/refresh` (POST)
- Health check endpoint

**Does NOT own:**
- Polling logic or scheduling (never directly calls platform clients)
- Persistence mechanics (delegates entirely to NocoDB client)
- Business dedup logic

---

### React Native App
**Owns:**
- All UI: trend feed, filters, detail view
- Local state management (filter selections, pagination cursor)
- Deep linking to native platform apps (YouTube, Spotify, Steam)
- Image caching for thumbnails

**Does NOT own:**
- Any data storage (stateless consumer of FastAPI)
- Polling logic
- Any direct NocoDB communication (see §3 for rationale)

---

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  External Platform APIs                                       │
│  YouTube Data API v3 │ Spotify Web API │ Steam Store / HTML  │
│  TikTok (RapidAPI)                                           │
└───────────────┬─────────────────────────────────────────────┘
                │  HTTP (async httpx)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Platform Clients  (tools/trend_clients/)                    │
│  youtube_client │ spotify_client │ steam_client │ tiktok_client│
│  • Auth / token refresh                                      │
│  • Raw API response → TrendItem list                        │
│  • Per-client cache (TTL)                                    │
└───────────────┬─────────────────────────────────────────────┘
                │  List[TrendItem]
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Trends Workflow  (workflows/trends_workflow.py)             │
│  • generate content_hash per item                           │
│  • batch dedup check → NocoDB client                        │
│  • store new items → NocoDB client                          │
│  • update source last_fetched_at + status                   │
└───────────────┬─────────────────────────────────────────────┘
                │  NocoDB REST (httpx)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  NocoDB  (self-hosted Docker, port 8080)                     │
│  tables: trends, trend_sources                              │
└───────────────┬─────────────────────────────────────────────┘
                │  NocoDB REST (httpx)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Server  (app.py, port 8080)                         │
│  GET /api/trends  (filters: platform, category, region, date)│
│  GET /api/trends/{id}                                        │
│  POST /api/trends/refresh                                    │
│  GET /api/trends/stats                                       │
└───────────────┬─────────────────────────────────────────────┘
                │  HTTPS/JSON
                ▼
┌─────────────────────────────────────────────────────────────┐
│  React Native App  (Expo)                                    │
│  Trend feed → filter → detail → deep link to platform       │
└─────────────────────────────────────────────────────────────┘

Scheduler (in-process asyncio, within FastAPI process):
  Every 60s → checks due sources → fires scan_source() tasks
```

---

## 3. React Native ↔ Backend Communication

### Recommendation: RN app hits FastAPI only. Never hit NocoDB directly.

**Rationale:**

| Concern | NocoDB Direct | FastAPI |
|---|---|---|
| API token exposure | NocoDB token would be in the mobile bundle — readable by anyone who decompiles the APK/IPA | Token stays server-side |
| Response shape control | NocoDB returns raw row format with internal fields (`nc_*`, `CreatedAt`, etc.) | FastAPI returns clean, versioned JSON |
| Pagination | NocoDB's `limit`/`offset` is exposed as-is; no cursor-based pagination | FastAPI can implement cursor pagination suited to infinite scroll |
| Filtering | NocoDB filter syntax (`(field,eq,value)`) is an implementation detail | FastAPI validates and translates query params |
| CORS | NocoDB CORS config is global; tightening it breaks internal tooling | FastAPI CORS is a single middleware setting |
| Rate limiting | No rate limiting on NocoDB REST | FastAPI can throttle `/refresh` and other heavy endpoints |
| Future flexibility | Swapping NocoDB for Postgres would require updating the mobile app | App never knows or cares what the data store is |

**The one-liner rule:** FastAPI is the only client of NocoDB. The mobile app is the only client of FastAPI.

---

## 4. Build Order (Dependency Graph)

```
Phase 1 — Foundation (no external calls)
  [1] pyproject.toml, requirements.txt, .env.example
  [2] trend_agents/shared/models.py          (already done)
  [3] config/trend_sources.json              (already done)
  [4] trend_agents/shared/source_registry.py
  [5] tools/nocodb_trends_client.py          (already done)

Phase 2 — First working data pipeline (YouTube only)
  [6] tools/trend_clients/base.py            (abstract base + cache mixin)
  [7] tools/trend_clients/youtube_client.py  (reference impl)
  [8] workflows/trends_workflow.py           (depends on [5][6][7])
      ↳ end-to-end smoke test possible here

Phase 3 — API server (enables mobile app development)
  [9] app.py (FastAPI)                       (depends on [5])
      ↳ mobile dev can start against this with YouTube data

Phase 4 — Scheduler (automated polling)
  [10] workflows/trends_scheduler.py         (depends on [8][9])
       ↳ polling is now fully autonomous

Phase 5 — Remaining platform clients
  [11] tools/trend_clients/spotify_client.py (depends on [6])
  [12] tools/trend_clients/steam_client.py   (depends on [6])
  [13] tools/trend_clients/tiktok_client.py  (depends on [6], highest risk)
  [14] tools/trend_clients/__init__.py        (client factory, depends on [11][12][13])

Phase 6 — Cleanup + hardening
  [15] Remove all SehaRadar code
  [16] main.py (CLI entry point)
  [17] Dockerfile + docker-compose.yml
  [18] .env validation at startup (pydantic-settings)
  [19] Structured logging (replace print() with logging module)

Phase 7 — Tests
  [20] test_youtube_client.py
  [21] test_spotify_client.py
  [22] test_steam_client.py
  [23] test_trends_workflow.py

Phase 8 — React Native app
  [24] Expo project init + navigation setup   (depends on [9])
  [25] API client layer (typed, axios/fetch)
  [26] Trend feed screen + filter bar
  [27] Trend detail screen + deep link
  [28] Image caching + FlashList optimization
```

**Critical path:** [2] → [5] → [7] → [8] → [9] → mobile development can begin in parallel with [11][12][13].

---

## 5. Codebase Structure

### Python Backend

```
trenfy/
├── app.py                        # FastAPI application, lifespan startup
├── main.py                       # CLI: run server or one-shot scan
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── requirements.txt
├── .env.example
│
├── trend_agents/
│   └── shared/
│       ├── __init__.py
│       ├── models.py             # TrendItem, SourceType, *Metadata models
│       └── source_registry.py   # Loads + filters TrendSource from JSON
│
├── tools/
│   ├── nocodb_trends_client.py   # NocoDB CRUD: trends + trend_sources tables
│   └── trend_clients/
│       ├── __init__.py           # get_client(platform) factory
│       ├── base.py               # BaseTrendClient + CacheMixin
│       ├── youtube_client.py
│       ├── spotify_client.py
│       ├── steam_client.py
│       └── tiktok_client.py
│
├── workflows/
│   ├── trends_workflow.py        # fetch → normalize → hash → dedup → store
│   └── trends_scheduler.py      # asyncio loop, per-source interval dispatch
│
├── config/
│   └── trend_sources.json        # Source definitions with intervals
│
└── tests/
    ├── conftest.py               # pytest fixtures (mock NocoDB, mock clients)
    ├── test_youtube_client.py
    ├── test_spotify_client.py
    ├── test_steam_client.py
    ├── test_tiktok_client.py
    └── test_trends_workflow.py
```

**Notes:**
- No `parsers/`, `health_agents/`, `server.py` — those are SehaRadar, removed
- `tools/` is flat; only trend-related tooling survives
- `openai_client.py` and `html_extraction.py` stay only if referenced by Trenfy code; delete otherwise
- One `app.py` at root (not `server.py`); it owns both the REST routes and the scheduler lifespan

### React Native App (Expo, recommended)

```
trenfy-app/
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
├── .env                          # EXPO_PUBLIC_API_URL=...
│
├── src/
│   ├── api/
│   │   ├── client.ts             # Base axios/fetch instance (baseURL from env)
│   │   ├── trends.ts             # getTrends(filters), getTrend(id), getStats()
│   │   └── types.ts              # Trend, TrendFilters, PaginatedResponse
│   │
│   ├── components/
│   │   ├── TrendCard.tsx         # Single trend item (thumbnail, title, metric)
│   │   ├── TrendList.tsx         # FlashList wrapper with pagination
│   │   ├── FilterBar.tsx         # Platform + category filter chips
│   │   └── PlatformBadge.tsx     # Colored badge: YouTube / Spotify / Steam
│   │
│   ├── screens/
│   │   ├── FeedScreen.tsx        # Main trend feed, filter state
│   │   ├── DetailScreen.tsx      # Single trend + deep link button
│   │   └── StatsScreen.tsx       # Optional: platform aggregate stats
│   │
│   ├── navigation/
│   │   └── RootNavigator.tsx     # React Navigation stack/tab setup
│   │
│   ├── hooks/
│   │   ├── useTrends.ts          # Data fetching + pagination hook
│   │   └── useFilters.ts         # Filter state management
│   │
│   └── utils/
│       ├── deepLinks.ts          # Platform URL → native app deep link
│       └── formatters.ts         # Format metric values (1.2M views, etc.)
│
└── assets/
    └── platform-icons/           # YouTube, Spotify, Steam, TikTok icons
```

**Expo vs bare RN:** Use Expo (managed workflow). Rationale: no native modules required (no camera, no BLE, etc.), `expo-image` handles thumbnail caching, EAS Build handles iOS/Android distribution. Ejecting to bare is always possible later if needed.

**Navigation:** React Navigation v7 (stack navigator with a bottom tab for Feed / Stats).
