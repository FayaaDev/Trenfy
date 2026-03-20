# Trenfy — Build Pitfalls

## 1. YouTube API Quota (10,000 units/day)

**What goes wrong:**  
`videos.list` (trending) costs ~2 units per call. `search.list` (rising) costs 100 units per call. Running too many regions or calling `fetch_rising` on a schedule will burn the daily quota in hours, locking out all YouTube fetches until midnight Pacific.

**Warning signs:**
- `HttpError 403: quotaExceeded` from YouTube API
- Trend feed goes stale; YouTube rows stop updating
- Any use of `fetch_rising()` in the scheduler config

**Prevention strategy:**
- **Never schedule `fetch_rising`** — 100 units/call means you get ~100 calls/day total. Reserve it for manual on-demand use only.
- **Budget the baseline:** 3 regions × 96 calls/day (15-min interval) × 2 units = 576 units/day — safely under 10k.
- Add a `YOUTUBE_TREND_REGIONS` env var to control which regions are active. Disable JP or SA if quota gets tight.
- Log quota-exceeded errors distinctly and back off the source for the rest of the day (set `last_fetch_status = quota_exceeded`, skip until midnight).
- Request a quota increase via Google Cloud Console before launch — free tier increase is routinely approved.

**Build phase:** Phase 2 (when `youtube_client.py` is written). Add quota-exceeded handling and the region env var from day one.

---

## 2. X Token Refresh (OAuth2 Client Credentials)

**What goes wrong:**  
Client credentials tokens expire in 3,600 seconds (1 hour). If the refresh check is not thread-safe, two concurrent `scan_source` tasks can both detect expiry simultaneously, both request a new token, and the second response overwrites the first — causing a brief window where one task holds a now-invalidated token. Silent failures: X returns `401 Unauthorized` and the source silently stores nothing.

**Warning signs:**
- Intermittent `401` errors on X calls, not reproducible on retry
- `last_fetch_status = error` on X sources without a clear pattern
- Errors clustered around the 1-hour mark after startup

**Prevention strategy:**
- Store the token + `expires_at` timestamp on the client instance.
- Use an `asyncio.Lock` for the refresh operation — only one coroutine fetches a new token at a time; others wait and reuse it.
- Refresh proactively when `(expires_at - now) < 5 minutes`, not reactively on 401.
- On 401, do one token refresh and retry the request once before marking the source as errored.
- Log token refresh events with expiry timestamp for debugging.

**Build phase:** Phase 5 (`X_client.py`). The lock must be part of the initial implementation — retrofitting it after intermittent bugs appear is harder.

---

## 3. X Scraping Fragility

**What goes wrong:**  
X has no official top-sellers or trending API without a Xworks partner account. The approach is scraping `store.Xpowered.com/search/?sort_by=TRENDING_DESC`. X can and does:
- Change HTML structure without notice (CSS class renames, layout refactors)
- Rate-limit scrapers (429, CAPTCHA, IP block)
- Return different markup for bots vs. browsers (missing JS-rendered content)
- Redirect the URL to a different page structure for certain regions

**Warning signs:**
- `X_client` returns an empty list without errors
- BeautifulSoup selector returns `None` for elements that previously matched
- `aiohttp`/`httpx` gets 429 or redirects to `store.Xpowered.com/agegate/`
- Player count fetches succeed but top-sellers list is empty

**Prevention strategy:**
- Add a scrape-result count assertion: if fewer than 5 items are parsed from a page that should have 20+, log a `SCRAPE_DEGRADED` warning and alert — don't silently store an empty list.
- Use `IXApps/GetAppList` + `IXUserStats/GetNumberOfCurrentPlayers` (official JSON API) for what it covers; scraping is only for the top-sellers ranking, not app metadata.
- Add a `User-Agent` header mimicking a real browser; add a small random delay (0.5–2s) between requests.
- Pin the CSS selectors in a config constant (not buried in code) so they're easy to update when X changes markup.
- Accept that X scraping **will break** periodically. Build the workflow to degrade gracefully: mark source as `error`, continue with other sources, do not crash the scheduler.

**Build phase:** Phase 5 (`X_client.py`). Scrape robustness and degradation handling must be in the first implementation.

---

## 4. X Data Sourcing (RapidAPI)

**What goes wrong:**  
There is no official X public API. RapidAPI X scrapers are third-party services that:
- Change their response schema without versioning
- Hit X rate limits and return empty results or errors silently
- Go down or disappear entirely (RapidAPI providers are community-maintained)
- Charge per-call; unexpected polling frequency = unexpected billing

**Warning signs:**
- API returns `200 OK` but response body is `{"data": []}` or `{"status": "error"}`
- Response schema shifts: fields that previously existed are missing or renamed
- RapidAPI dashboard shows spike in error rate
- Monthly RapidAPI bill increases unexpectedly

**Prevention strategy:**
- Treat X as a **degradable source**, not a required one. If it fails, the app still works with YouTube / X.
- Validate the response schema explicitly on every call — don't just `response["data"][0]["title"]`; use a schema check and log `SCHEMA_MISMATCH` if it fails.
- Set a conservative polling interval (60+ minutes) to minimize RapidAPI call volume.
- Keep a fallback: if the primary RapidAPI endpoint fails 3 times in a row, disable the source and alert — don't hammer a broken API.
- Investigate `pyktok` (unofficial Python library using X's internal web API) as an alternative. Test both before committing to one.
- Budget: RapidAPI free tiers are typically 500–1,000 calls/month. At 60-min polling, that's ~720 calls/month — check the plan limit.

**Build phase:** Phase 5, last (`X_client.py`). Build it after YouTube / X are solid. Treat as optional for v1.

---

## 5. NocoDB as Mobile Backend (Latency, Pagination, CORS)

**What goes wrong:**  
If the React Native app hits NocoDB directly (the wrong design choice):
- The NocoDB API token is embedded in the mobile bundle and readable by anyone who decompiles the app
- NocoDB's default page size is 25 rows; requesting more requires manual `limit`/`offset` pagination that isn't designed for infinite scroll
- CORS on self-hosted NocoDB must be configured globally — changing it affects all NocoDB users and tools
- NocoDB REST response includes internal fields (`nc_*`, `CreatedAt`, `UpdatedAt`) that bloat payloads
- NocoDB adds ~50–200ms latency per query from the mobile app vs. a well-cached FastAPI endpoint

Even with FastAPI as the intermediary (the correct design):
- NocoDB is not optimized as a query engine. Complex filters on large tables (100k+ rows) will be slow without proper indexes.
- NocoDB's REST API does not support cursor-based pagination natively — it uses `offset`, which degrades at high offsets.

**Warning signs:**
- Trend feed takes >1s to load on first open
- Pagination gets slower as users scroll further
- Any NocoDB token appearing in the React Native bundle or network inspector

**Prevention strategy:**
- FastAPI is the only client of NocoDB. RN app only hits FastAPI. (See ARCHITECTURE.md §3.)
- In FastAPI, add a Redis or in-memory cache (e.g., `cachetools.TTLCache`) on `GET /api/trends` responses — results are valid for ~5 minutes.
- Use `limit + offset` pagination for now (v1), but cap at `limit=100` to prevent runaway queries.
- Ensure NocoDB `trends` table has indexes on `platform`, `category`, `region_code`, `fetched_at`. NocoDB's UI allows adding indexes; do this before load testing.
- Set `NOCODB_API_URL` to the Docker-internal URL (`http://nocodb:8080`) for FastAPI — never go through the public network for backend-to-NocoDB calls.

**Build phase:** Phase 3 (FastAPI). Add response caching and pagination from the start, not as an optimization later.

---

## 6. React Native List Performance (Trend Cards with Images)

**What goes wrong:**  
A `FlatList` rendering 100+ `TrendCard` components, each with a thumbnail image, will cause:
- Frame drops on scroll (JS thread blocked by image decode + layout)
- Memory pressure as off-screen images remain in memory
- Slow initial render as all items mount simultaneously

**Warning signs:**
- Scroll feels janky (< 60 fps) on mid-range Android devices
- Memory warnings in Xcode / Android Studio during scroll
- `VirtualizedList: You have a large number of items` warning in Metro

**Prevention strategy:**
- Use **FlashList** (`@shopify/flash-list`) instead of `FlatList`. It recycles cells like a RecyclerView and is measurably faster for large lists of uniform-height items.
- Use **`expo-image`** (or `react-native-fast-image`) for thumbnails — it handles memory-capped disk caching and progressive loading out of the box.
- Set `estimatedItemSize` on FlashList to avoid layout recalculation on every render.
- Keep `TrendCard` a pure component (`React.memo`) with stable prop references.
- Limit initial load to 20–30 items; paginate as user scrolls (infinite scroll with `onEndReached`).
- Avoid inline arrow functions in `renderItem` — define outside the component or use `useCallback`.

**Build phase:** Phase 8 (React Native, `TrendList.tsx`). Use FlashList and `expo-image` from the initial implementation; retrofitting them after perf issues appear requires refactoring all card components.

---

## 7. Deduplication False Positives / Negatives

**What goes wrong:**  
The current hash is:
```python
content = f"{item.platform}|{item.title.lower()}|{item.published_date}|{item.region_code}"
hash = hashlib.sha256(content).hexdigest()[:32]
```

**False negatives (missed duplicates — same content stored twice):**
- `published_date` format inconsistency: YouTube returns ISO 8601 (`2024-03-15T10:00:00Z`), X returns `2024-03-15`, X scraping may return `March 15, 2024`. If not normalized to `YYYY-MM-DD` before hashing, the same item on the same day gets two different hashes.
- Title normalization: `"Spider-Man 2"` vs `"Spider-Man 2 "` (trailing space) → different hash.

**False positives (valid new trends blocked):**
- A YouTube video re-appears in trending in a different region on a different day but has the same title and `published_date` as an older entry. Hash collision if `region_code` is not in the hash. (Current hash includes `region_code` — good. But `published_date` is the video's publish date, not today's date, so an old video trending again won't be re-stored. This is probably the desired behavior, but verify it explicitly.)
- A track re-enters the X charts after a long absence — same title + date → blocked. Whether this is correct or a bug depends on product intent.

**Warning signs:**
- NocoDB `trends` table has obvious duplicate rows (same title, platform, region)
- X items stop appearing entirely after the first poll
- `stored` count drops to 0 on subsequent runs for all sources

**Prevention strategy:**
- Normalize `published_date` to `YYYY-MM-DD` in the workflow *before* hashing, not inside the client.
- Strip and normalize title: `title.strip().lower()` before hashing.
- Add a test: generate hashes for a matrix of date format variants and assert they're equal.
- Log `{fetched: N, stored: M, duplicates: D}` on every run. If `stored` is always 0 for a source that should produce new data, alert.
- Document the intentional behavior: "A video that trends again in the same region is not re-stored." Make this explicit in code comments.

**Build phase:** Phase 2 (workflow implementation). Add normalization and the behavior documentation before writing the dedup check.

---

## 8. Scheduler Failure Handling

**What goes wrong:**  
`asyncio.create_task(workflow.scan_source(source))` is fire-and-forget. If `scan_source` raises an unhandled exception, the task fails silently — Python logs an `"Exception ignored in..."` warning to stderr, but the scheduler keeps running without knowing the source has been failing.

Cascading failure: if a platform API is down (e.g., YouTube returns 503), every 15-minute tick spawns a new failing task. Over hours, this produces hundreds of logged errors and obscures the actual problem.

**Warning signs:**
- `asyncio exception was never retrieved` in stderr/logs
- `last_fetch_status` in NocoDB stays `null` or stale for hours
- Scheduler appears to be running (no crash) but no new trends are being stored

**Prevention strategy:**
- Wrap `scan_source` in a try/except in the task wrapper. Always write `last_fetch_status = error` to NocoDB on exception — never let a source go silent without a status update.
- Track consecutive failure count per source in memory. After N consecutive failures (e.g., 5), set source `enabled = false` in NocoDB and log a `SOURCE_DISABLED_AFTER_FAILURES` event. This prevents endless retries of a permanently broken source.
- Use exponential backoff per-source: after 1 failure, wait 2× the normal interval before retrying. After 5 failures, disable.
- Add a `/api/sources/{id}/status` endpoint that shows failure count and last error message.
- Never let one source's failure affect others — each `create_task` is independent.

**Build phase:** Phase 4 (scheduler). The failure handling, backoff, and disable logic must be in the initial scheduler implementation — not added when things start breaking in production.

---

## 9. Codebase Cleanup (Removing SehaRadar)

**What goes wrong:**  
SehaRadar and Trenfy share the same repo. A hasty "delete everything that isn't Trenfy" pass risks:
- Deleting `tools/nocodb_trends_client.py` and `trend_agents/shared/models.py` — the two files that are already implemented and must be kept
- Keeping SehaRadar imports in `pyproject.toml` packages list (`health_agents`, `parsers`) that would cause import errors in the Trenfy build
- Leaving orphaned environment variables in `.env.example` (SehaRadar webhook, OpenAI keys) that confuse future developers
- Accidentally keeping `tools/openai_client.py` or `tools/html_extraction.py` if they are only referenced by SehaRadar code — dead code in the Trenfy codebase

**Warning signs:**
- `pyproject.toml` still lists `health_agents` or `parsers` as packages after cleanup
- `import` statements in remaining files reference `health_agents`, `parsers`, `tools.syncdetection_*`, or `tools.disease_catalog`
- `docker-compose.yml` still has `bridge-service` or SehaRadar-specific volumes
- `main.py` still imports `process_webhook` (already broken per CONCERNS.md item 3)

**Prevention strategy:**
- Before deleting anything, create an explicit **keep list**:
  - `trend_agents/shared/models.py` — keep
  - `tools/nocodb_trends_client.py` — keep
  - `config/trend_sources.json` — keep
  - Everything else is SehaRadar until proven otherwise
- Delete in a single committed pass so the diff is auditable.
- After deletion, run `python -c "import app"` (once `app.py` exists) to confirm no broken imports remain.
- Update `pyproject.toml` packages to only include `trend_agents`, `tools`, `workflows`.
- Check `tools/html_extraction.py`: it's listed in `Trenfy.md` (for X scraping) — keep it. `tools/openai_client.py`: only keep if Trenfy actively uses it; otherwise delete.
- Audit `.env.example` post-cleanup: only variables in `Trenfy.md` §Environment Variables should remain.

**Build phase:** Phase 6 (cleanup pass). Do this as a dedicated step after the core pipeline is working — not interleaved with feature development, and not as a first step before the new code is written.
