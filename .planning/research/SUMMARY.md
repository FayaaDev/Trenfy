# Research Summary: Trenfy

## Recommended Stack

**Backend**
- **FastAPI `>=0.115`** — native `lifespan` context manager needed for scheduler startup
- **Pydantic v2 (`>=2.7`) + pydantic-settings** — faster validation, env loading without python-dotenv
- **httpx `>=0.27`** — async-first HTTP; already in use for NocoDB client
- **beautifulsoup4 + lxml** — BS4 for X HTML scraping; lxml is faster than html.parser
- **Custom asyncio scheduler loop** — `while True` + `asyncio.sleep(60)`; APScheduler adds complexity for zero benefit at 7 sources
- **uvicorn[standard]** — pulls in uvloop + httptools for async/HTTP performance
- **RapidAPI X (tikapi) + circuit-breaker** — only viable v1 option; treat as degradable, budget ~$10-15/month

**React Native App**
- **Expo managed workflow** — no native modules needed; EAS Build for iOS/Android; eject path available if needed
- **React Navigation v7 (native stack)** — tab + stack hierarchy; better perf than JS stack
- **axios (configured instance)** — base URL + consistent error handling over raw fetch
- **NativeWind v4** — Tailwind utility classes for RN; ideal for feed + card + filter-chip UI
- **Zustand** — ~3kb, minimal boilerplate; sufficient for filter state + trend cache + loading state
- **FlashList (`@shopify/flash-list`)** — cell recycling; measurably faster than FlatList above 50 items
- **expo-image** — memory-capped disk caching for thumbnails; use instead of `<Image>`

**Infrastructure**
- **Docker Compose: `backend` + `nocodb` services** — NocoDB internal URL (`http://nocodb:8080`) for backend-to-DB calls; `NOCODB_API_URL` in `.env` keeps it configurable
- **FastAPI BFF (mandatory)** — NocoDB `xc-token` never in mobile bundle; FastAPI is the sole NocoDB client

---

## Table Stakes Features (v1 must-haves)

**Backend**
- `GET /api/trends` with filters: `platform`, `category`, `region_code`, date range + pagination
- `GET /api/trends/{id}` — single trend detail for deep-link routing
- `POST /api/trends/refresh` — manual refresh trigger with rate limiting
- `GET /api/sources` — expose `last_fetched_at` + `last_fetch_status` per source
- `GET /api/trends/stats` — aggregate counts by platform
- `/health` endpoint — Docker health checks
- Per-source scheduler: YouTube 15m, X 60m, X 30m, X 60m
- `content_hash` deduplication — prevents duplicate rows on scheduler re-runs
- Error isolation per source — X failure must not block YouTube/X
- `fetched_at` timestamp on every trend record

**React Native App**
- Scrollable trend feed — FlashList, sorted by `fetched_at` desc, infinite scroll
- Platform filter tabs — YouTube / X
- Trend card — title, platform icon, contextual metric label, time-ago, thumbnail
- Tap to open source — deep link to native platform app (YouTube and X)
- Pull-to-refresh — triggers new fetch from FastAPI
- Category filter — Gaming / Music / Video / Entertainment
- Region selector — US / SA
- Loading, error, and empty states — skeleton loaders + retry on error
- "Updated N min ago" freshness indicator per platform
- SA locale default — detect `ar-SA` device locale and set region to SA on first run
- Filter persistence — AsyncStorage across app restarts

---

## Architecture Overview

```
External APIs (YouTube / X RapidAPI)
    │ httpx async
    ▼
Platform Clients  [tools/trend_clients/]
    │ List[TrendItem]
    ▼
Trends Workflow  [workflows/trends_workflow.py]
    │ content_hash → dedup → store
    ▼
NocoDB  (self-hosted Docker, internal URL)
    │ NocoDB REST
    ▼
FastAPI Server  [app.py]  ←── Scheduler (in-process asyncio loop)
    │ HTTPS/JSON
    ▼
React Native App  (Expo)
    trend feed → filter → detail → deep link to platform
```

The scheduler runs inside the FastAPI process as an asyncio background task, firing `scan_source()` tasks per-source on independent intervals. FastAPI is the only process that reads from NocoDB; the mobile app never touches NocoDB directly. Platform clients own auth and parsing; the workflow owns dedup and persistence; FastAPI owns the API contract.

---

## Build Order

1. **`pyproject.toml`, `requirements.txt`, `.env.example`** — project scaffolding
2. **`trend_agents/shared/models.py`** — already done; verify TrendItem shape
3. **`config/trend_sources.json`** — already done; add SA X sources
4. **`trend_agents/shared/source_registry.py`** — loads + filters TrendSource from JSON
5. **`tools/nocodb_trends_client.py`** — already done; keep as-is
6. **`tools/trend_clients/base.py`** — abstract base class + CacheMixin
7. **`tools/trend_clients/youtube_client.py`** — reference implementation; add quota-exceeded handling from day one
8. **`workflows/trends_workflow.py`** — fetch → normalize → hash → dedup → store; end-to-end smoke test possible here
9. **`app.py` (FastAPI)**  — REST API with pagination + response cache; mobile dev can start against YouTube data
10. **`workflows/trends_scheduler.py`** — asyncio loop with per-source backoff + disable logic
11. **`tools/trend_clients/X_client.py`** — asyncio.Lock on token refresh from first implementation
12. **`tools/trend_clients/X_client.py`** — scrape robustness, SCRAPE_DEGRADED logging, graceful degradation
13. **`tools/trend_clients/X_client.py`** — build last; treat as optional; circuit-breaker required
14. **`tools/trend_clients/__init__.py`** — `get_client(platform)` factory
15. **Codebase cleanup** — remove all SehaRadar code in a single auditable commit; verify with `python -c "import app"`
16. **`main.py`** — CLI entry point (run server or one-shot scan)
17. **`Dockerfile` + `docker-compose.yml`** — two services; internal NocoDB URL
18. **`.env` validation at startup** — pydantic-settings; fail fast on missing keys
19. **Structured logging** — replace `print()` with `logging` module throughout
20. **Tests** — `test_youtube_client`, `test_X_client`, `test_X_client`, `test_trends_workflow`
21. **Expo project init** — navigation setup, NativeWind config, depends on step 9
22. **`src/api/` layer** — typed axios instance, `getTrends()`, `getTrend()`, `getStats()`
23. **`FeedScreen` + `FilterBar` + `TrendCard`** — FlashList + expo-image from the start
24. **`DetailScreen` + deep links** — `deepLinks.ts` for platform URL → native app routing
25. **Polish** — filter persistence, SA locale default, share sheet, metric label formatting

---

## Top 5 Risks

1. **YouTube quota exhaustion (10,000 units/day)** — Never schedule `fetch_rising` (100 units/call); handle `quotaExceeded 403` with same-day backoff and `last_fetch_status = quota_exceeded`; request quota increase before launch.

2. **X scraper breakage** — Treat X as a degradable source with a circuit-breaker (disable after 3 consecutive failures); validate response schema on every call; set 60-min polling interval; app must function fully without X.

3. **X token refresh race condition** — Use `asyncio.Lock` in `X_client.py` for all token refresh operations; refresh proactively at `expires_at - 5min`, not reactively on 401; retry once after refresh before marking source errored.

4. **X HTML scraping fragility** — Assert scrape result count (< 5 items = `SCRAPE_DEGRADED` warning); pin CSS selectors as named constants; add browser-like `User-Agent` + random delay; accept periodic breakage and degrade gracefully.

5. **Silent scheduler failures** — Wrap every `scan_source` task in try/except; always write `last_fetch_status` on failure; implement exponential backoff + auto-disable after N consecutive failures; never allow one source to affect others.

---

## Decisions Made by Research

These are settled. The roadmapper should treat them as fixed constraints, not open questions.

| Decision | Verdict |
|---|---|
| Mobile app → NocoDB | **Forbidden.** FastAPI BFF is mandatory; NocoDB token must never leave the server |
| Expo vs bare React Native | **Expo managed workflow.** No native modules needed in v1 |
| Scheduler design | **Custom asyncio loop (existing spec).** APScheduler adds complexity with no benefit |
| List rendering | **FlashList.** FlatList degrades above 50 items; FlashList is non-negotiable for a trend feed |
| State management | **Zustand.** Redux is overkill; Context causes full-tree re-renders on trend list updates |
| HTTP client (backend) | **httpx.** Already in codebase; async-first; consistent with NocoDB client |
| HTTP client (RN app) | **axios with configured instance.** Base URL set once; cleaner error handling than raw fetch |
| UI library | **NativeWind v4.** Feed + cards + filter chips = utility-class territory; avoids fighting component library defaults |
| X strategy (v1) | **RapidAPI tikapi + circuit-breaker, 60-min interval.** Unofficial path with controlled failure mode |
| X strategy (v2) | **Re-evaluate** `XApi` (Playwright) after v1 validation |
| Dedup hash inputs | **`platform + title.strip().lower() + published_date (YYYY-MM-DD normalized) + region_code`** — normalize before hashing, not inside clients |
| `fetch_rising` scheduling | **Never scheduled.** 100 units/call exhausts quota. Manual/on-demand only |
| `DELETE /api/trends` | **Not built.** Immutable append-only history; no deletion endpoint |
| Auth in v1 | **Not built.** Spec-excluded; app is fully public |
| Push notifications in v1 | **Deferred to v2.** APNs/FCM setup is disproportionate to v1 scope |
| SehaRadar cleanup timing | **Phase 6, after core pipeline works.** Single auditable commit; keep `models.py`, `nocodb_trends_client.py`, `trend_sources.json` |
| RTL text rendering | **Use `rtler` skill** when implementing text components — Arabic content will appear in trend titles (SA region) |
