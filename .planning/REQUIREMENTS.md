# Requirements: Trenfy

**Defined:** 2026-03-19
**Core Value:** Users can open the app and immediately see what's trending right now across gaming, music, and entertainment — filtered to what they care about, tappable to the source.

---

## v1 Requirements

### Cleanup

- [x] **CLEN-01**: All SehaRadar files are removed — health_agents/, workflows/unified_scan_workflow.py, workflows/syncdetection_worker.py, workflows/email_digest_workflow.py, server.py, bridge-service.js, main.py (old), promed.js, promednew.js, parsers/, config/sources.json, emptySDKagnet.py, test-*.js root files
- [x] **CLEN-02**: Retained reusable tools moved to Trenfy structure — tools/nocodb_trends_client.py, trend_agents/shared/models.py
- [x] **CLEN-03**: pyproject.toml updated — name = "trenfy", all SehaRadar dependencies removed, Trenfy dependencies added
- [x] **CLEN-04**: docker-compose.yml replaced — Trenfy-only services (no RSSHub, no Caddy config)
- [x] **CLEN-05**: .env.example updated — only Trenfy environment variables

### Backend Core

- [x] **CORE-01**: FastAPI app (app.py) starts successfully with a working /health endpoint
- [ ] **CORE-02**: Source registry loads enabled trend sources from config/trend_sources.json
- [ ] **CORE-03**: TrendItem and TrendSource pydantic models validate correctly (existing models.py)
- [x] **CORE-04**: NocoDB trends client creates, reads, and deduplicates trend records (existing nocodb_trends_client.py)
- [x] **CORE-05**: Per-source async scheduler runs each source on its configured interval (YouTube 15m, X 15m)
- [x] **CORE-06**: Failed source does not block other sources — each source runs in an isolated asyncio task with error handling

### Platform Clients

- [x] **PLAT-01**: YouTube client fetches trending videos for configured regions (US, SA, JP) using YouTube Data API v3 with API key auth
- [x] **PLAT-02**: YouTube client stays within 10,000 daily quota units — conservative scheduling (≤600 units/day for 3 regions at 15-minute intervals)
- [ ] **PLAT-03**: X client fetches trending posts/topics for configured regions via official X API endpoints
- [ ] **PLAT-04**: X API auth token/credentials handling is centralized and refreshed safely to avoid concurrent refresh race conditions
- [ ] **PLAT-05**: X client applies rate-limit-aware fetching (backoff/retry with caps) and stays within configured request budgets
- [ ] **PLAT-06**: X client uses a circuit-breaker — after 3 consecutive failures the source auto-disables and logs clearly
- [x] **PLAT-07**: All platform clients implement the abstract base interface (BaseTrendClient) with a fetch() method returning List[TrendItem]
- [x] **PLAT-08**: content_hash generated per item: SHA-256 of "platform|title.lower()|published_date|region_code" truncated to 32 chars

### Trends API

- [ ] **API-01**: GET /api/trends returns paginated list of trends (default limit=50, max=200), filterable by platform, category, region_code, start_date, end_date
- [ ] **API-02**: GET /api/trends/{id} returns single trend detail by NocoDB row ID
- [ ] **API-03**: POST /api/trends/refresh accepts {"source_id": "..."} or {"platform": "..."} and triggers an immediate fetch for that source/platform
- [ ] **API-04**: GET /api/trends/stats returns aggregate counts by platform (total trends, newest fetched_at per platform)
- [ ] **API-05**: GET /api/sources returns all configured sources with id, name, platform, last_fetched_at, last_fetch_status, enabled
- [ ] **API-06**: GET /health returns {"status": "ok", "scheduler_running": true/false}
- [ ] **API-07**: All responses include CORS headers permitting requests from the React Native app

### React Native App

- [ ] **APP-01**: Expo (managed workflow) project scaffolded with React Navigation (stack + tab), NativeWind v4, FlashList, Zustand
- [ ] **APP-02**: Main feed screen shows a scrollable FlashList of trend cards sorted by fetched_at descending, with infinite scroll (load more on scroll end)
- [ ] **APP-03**: Trend card displays: thumbnail image (expo-image), title, platform icon, contextual metric label ("4.2M views" / "89 popularity" / "12.4K players"), time since fetched_at ("4 min ago")
- [ ] **APP-04**: Platform filter tabs (YouTube / X / All) at the top of the feed — tapping filters the list without re-fetching
- [ ] **APP-05**: Category filter (Gaming / Music / Entertainment / All) — secondary filter below platform tabs
- [ ] **APP-06**: Region selector (US / SA) — accessible from feed screen, persisted in AsyncStorage across app restarts
- [ ] **APP-07**: Tapping a trend card opens the source URL in the device's default browser or native app (Linking.openURL)
- [ ] **APP-08**: Pull-to-refresh on the feed triggers POST /api/trends/refresh for the active platform filter (or all if "All" selected)
- [ ] **APP-09**: Feed shows skeleton loaders while fetching, error state with retry button when API is unreachable, and empty state when no trends match filters
- [ ] **APP-10**: All selected filters persist across app restarts using AsyncStorage
- [ ] **APP-11**: RTL text rendering correct for Arabic content (Trenfy.md calls out SA-specific content; apply RTL text direction per item when locale is Arabic)
- [ ] **APP-12**: App communicates only with FastAPI backend — NocoDB API token never included in the mobile bundle

### Infrastructure

- [ ] **INFRA-01**: docker-compose.yml defines a single trenfy-backend service (Python FastAPI) with NocoDB URL and YouTube + X API credentials as environment variables
- [ ] **INFRA-02**: Dockerfile builds the Python backend — Python 3.11-slim, installs requirements, starts uvicorn on port 8080
- [ ] **INFRA-03**: NocoDB trends and trend_sources tables exist with schema matching Trenfy.md (columns: platform, category, title, description, url, thumbnail_url, published_date, fetched_at, metric_type, metric_value, metadata, region_code, content_hash, notification_sent)
- [ ] **INFRA-04**: .env.example documents all required environment variables (NocoDB, YouTube, X, server settings)

---

## v2 Requirements

### Notifications

- **NOTF-01**: Push notification when a trend exceeds a configurable metric threshold
- **NOTF-02**: Daily digest push notification with top 5 trends per platform
- **NOTF-03**: User can configure which platforms to receive notifications for

### Trend Intelligence

- **INTEL-01**: Trend velocity tracking — store metric_value snapshots over time to detect acceleration
- **INTEL-02**: Cross-platform detection — identify same content appearing on multiple platforms simultaneously
- **INTEL-03**: LLM-powered trend categorization for content that spans multiple categories

### App Enhancements

- **ENH-01**: Offline mode — cache last-fetched trends in AsyncStorage, show stale data with banner
- **ENH-02**: Bookmarks / favorites — save trends locally (no backend, AsyncStorage only)
- **ENH-03**: Share trend — native share sheet to share a trend card
- **ENH-04**: Dark mode — NativeWind color scheme toggle
- **ENH-05**: Additional regions — GB, DE, BR, IN for YouTube and X

### Additional Sources

- **SRC-01**: Twitch — trending streams via Helix API (public, no user auth)
- **SRC-02**: Reddit — hot posts from gaming/music subreddits via public JSON API

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication | Public app; adds weeks of work for zero user-facing value in v1 |
| Caddy reverse proxy | Docker only for v1; add reverse proxy when deploying to production domain |
| Admin UI | NocoDB serves as admin UI already |
| In-app media playback | Discovery app only; deep-link to native platforms |
| LLM trend classification | Platform APIs return structured metadata; classification adds latency/cost |
| Webhook receivers | Trenfy is a poller; no platform sends trending webhooks |
| /api/trends/delete | Immutable append-only trend history; no deletion in v1 |
| Search | Not a search engine; filtering trending content is sufficient |
| Algorithmic personalization | No user data in v1; can't personalize without data |
| Rate limit bypass | No retry hammering; schedule conservatively within free-tier quotas |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEN-01 | Phase 1 | ✓ Complete |
| CLEN-02 | Phase 1 | ✓ Complete |
| CLEN-03 | Phase 1 | ✓ Complete |
| CLEN-04 | Phase 1 | ✓ Complete |
| CLEN-05 | Phase 1 | ✓ Complete |
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 2 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 2 | Complete |
| CORE-05 | Phase 2 | Complete |
| CORE-06 | Phase 2 | Complete |
| PLAT-01 | Phase 3 | Complete |
| PLAT-02 | Phase 3 | Complete |
| PLAT-03 | Phase 3 | Pending |
| PLAT-04 | Phase 3 | Pending |
| PLAT-05 | Phase 3 | Pending |
| PLAT-06 | Phase 3 | Pending |
| PLAT-07 | Phase 3 | Complete |
| PLAT-08 | Phase 3 | Complete |
| API-01 | Phase 4 | Pending |
| API-02 | Phase 4 | Pending |
| API-03 | Phase 4 | Pending |
| API-04 | Phase 4 | Pending |
| API-05 | Phase 4 | Pending |
| API-06 | Phase 4 | Pending |
| API-07 | Phase 4 | Pending |
| APP-01 | Phase 5 | Pending |
| APP-02 | Phase 5 | Pending |
| APP-03 | Phase 5 | Pending |
| APP-04 | Phase 5 | Pending |
| APP-05 | Phase 5 | Pending |
| APP-06 | Phase 5 | Pending |
| APP-07 | Phase 5 | Pending |
| APP-08 | Phase 5 | Pending |
| APP-09 | Phase 5 | Pending |
| APP-10 | Phase 5 | Pending |
| APP-11 | Phase 5 | Pending |
| APP-12 | Phase 5 | Pending |
| INFRA-01 | Phase 4 | Pending |
| INFRA-02 | Phase 4 | Pending |
| INFRA-03 | Phase 2 | Pending |
| INFRA-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
