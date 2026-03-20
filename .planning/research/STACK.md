# Trenfy Tech Stack Research — 2025

## Python Backend

### FastAPI + Core Libraries

| Library | Recommended Version | Rationale | Confidence |
|---|---|---|---|
| `fastapi` | `>=0.115` | Stable; 0.115 adds native `lifespan` context managers (needed for scheduler startup) | High |
| `uvicorn[standard]` | `>=0.32` | Standard extras pulls in `uvloop` (async perf) + `httptools` (HTTP parsing speed) | High |
| `pydantic` | `>=2.7` | V2 is the default now; significantly faster validation than V1. `pydantic-settings` for env loading | High |
| `pydantic-settings` | `>=2.3` | Native `.env` loading, type coercion, no separate `python-dotenv` needed at runtime | High |
| `httpx` | `>=0.27` | Already in use (`nocodb_trends_client.py`). Async-first, clean API, supports `follow_redirects`. Better than `aiohttp` for this use case | High |
| `beautifulsoup4` | `>=4.12` | Already spec'd for X HTML scraping. Pair with `lxml` parser (faster than `html.parser`) | High |
| `lxml` | `>=5.2` | Already in requirements. BS4 parser backend for X scraping | High |

### Scheduler: `asyncio` loop vs APScheduler

**Recommendation: Custom `asyncio` loop (already spec'd in `trends_scheduler.py`)**

The existing spec uses a simple `while True` + `asyncio.sleep(60)` pattern with per-source interval checking. This is sufficient and avoids an extra dependency.

APScheduler v4 (async-native) is viable but adds complexity with minimal benefit at this scale — 7 sources, no cron expressions needed, no persistence of job state.

**Verdict**: Keep the existing asyncio loop design. Add APScheduler only if scheduler complexity grows (e.g., cron-style windows, retry backoff). **Confidence: High**

### X Data Sourcing

This is the highest-risk dependency in the stack.

#### Option A: RapidAPI X Scrapers (2025 status)

Several scrapers exist on RapidAPI marketplace:

| Scraper | Notes | Reliability | Cost |
|---|---|---|---|
| **X Data** (by `tikapi`) | Most actively maintained as of early 2025. Returns trending feed, user videos, hashtag videos. JSON responses. | Medium — X periodically breaks unofficial access | Free tier: 100 req/month. Paid: ~$10-30/month for reasonable limits |
| **Scraptik** | Trending + hashtag endpoints. Less maintained | Low-Medium | ~$5-20/month |
| **X Scraper API** (various) | Generic category, inconsistent maintenance | Low | Varies |

**Reality check**: Every RapidAPI X scraper is an unofficial web scraper proxied through RapidAPI. They break when X changes its internal API. Expect 1-3 outages per quarter. None return a clean "global trending" endpoint — most return "for you page" proxies or hashtag-based queries.

#### Option B: `pyktok` / `XApi` Python libraries

- **`XApi`** (davidteather): Most starred Python library (~4k stars). Uses Playwright to drive a browser to bypass X's anti-bot. Requires a real browser context (adds ~300MB to Docker image). Fragile — requires updating `ms_token` cookies periodically.
- **`pyktok`**: Simpler, uses requests. Returns video metadata but requires valid session tokens. Less reliable for "trending" specifically.

#### Option C: Defer X to v2

The spec already acknowledges X as a caveat. YouTube + X are fully functional via official APIs. X via any unofficial path introduces operational overhead disproportionate to v1 scope.

**Recommendation for v1**: Use **RapidAPI X Data (tikapi)** with a circuit-breaker pattern — if the scraper fails, log the error, mark the source as `last_fetch_status: error`, and continue. Do NOT let X failures block other sources. Budget ~$10-15/month. **Confidence: Medium** (medium because X scraper reliability is inherently uncertain)

**For the `trend_sources.json`**: Set X `check_interval_minutes: 60` (not 15) to conserve API credits and reduce breakage exposure.

---

## React Native App

### Expo vs Bare React Native

**Recommendation: Expo (managed workflow → eject only if needed)**

| Factor | Expo | Bare RN |
|---|---|---|
| Setup time | ~30 min to running app | 1-2 days (Xcode + Android Studio config) |
| OTA updates | Built-in via EAS Update | Requires CodePush or manual |
| Native modules needed? | No — no Bluetooth, camera, biometrics in Trenfy v1 | N/A |
| Build infrastructure | EAS Build (cloud) | Local Xcode/Gradle required |
| SDK version lock | Minor con: tied to Expo SDK release cycle | More control |
| Deep linking (open platform URLs) | `expo-linking` handles this cleanly | `react-native-linking` |

Trenfy v1 needs: HTTP calls, list rendering, deep links to external apps, platform filtering UI. No native modules. Expo handles all of this. The escape hatch (eject to bare) exists if needed.

**Confidence: High**

### Navigation

**Recommendation: React Navigation v7**

- `@react-navigation/native` + `@react-navigation/native-stack` (uses native stack, better perf than JS stack)
- v7 released 2024, Expo SDK 52+ compatible, well-maintained
- Trenfy needs: Tab navigator (platform tabs) + Stack navigator (trend detail screen). Simple hierarchy, React Navigation handles it cleanly.
- Alternative: Expo Router (file-based routing, built on React Navigation). Good choice if you want URL-based deep linking and more Next.js-like structure. Slight learning curve for team unfamiliar with it.

**Verdict**: React Navigation v7 with native stack for explicit control. Consider Expo Router if the team is comfortable with it. **Confidence: High**

### HTTP Client

**Recommendation: `fetch` API (built-in) or `axios`**

| | fetch (native) | axios |
|---|---|---|
| Bundle size | 0kb added | ~14kb |
| Interceptors | Manual | Built-in (good for auth headers, error handling) |
| Automatic JSON parse | No (`response.json()`) | Yes |
| Cancellation | `AbortController` | `CancelToken` (deprecated) / `AbortController` |
| TypeScript | Fine | Excellent |

Since Trenfy has no auth headers and simple GET requests to FastAPI, `fetch` is sufficient. However, `axios` makes it easier to set a base URL once and handle errors consistently across all calls.

**Verdict**: `axios` with a single configured instance pointing at the FastAPI base URL. Minimal overhead, cleaner error handling. **Confidence: High**

### UI Component Library

**Recommendation: `react-native-paper` or `NativeWind` (Tailwind for RN)**

| Library | Approach | Fit for Trenfy |
|---|---|---|
| **NativeWind v4** | Tailwind CSS utility classes compiled for RN | Fast to build, easy to customize, Expo SDK 50+ compatible. Good for a feed-style app |
| **react-native-paper** | Material Design components | Full component set, accessible, well-maintained. Slightly heavier |
| **Tamagui** | Universal (RN + web) | Powerful but complex setup, overkill for v1 |
| **Gluestack UI v2** | Accessible, composable | Good but less community adoption than Paper |

**Verdict**: **NativeWind v4** for Trenfy. A trend feed is primarily a list + cards + filter chips — NativeWind makes these trivial to style without fighting a component library's defaults. Expo compatible. **Confidence: Medium** (NativeWind v4 still has occasional edge cases with Expo SDK updates)

### State Management

**Recommendation: Zustand**

| Option | Bundle | Boilerplate | Fit |
|---|---|---|---|
| **Zustand** | ~3kb | Minimal | Simple store for filters (platform, category, region), cached trends, loading state |
| Redux Toolkit | ~20kb+ | Significant | Overkill for Trenfy's state surface area |
| React Context | 0kb | Low-medium | Fine for simple state but causes full-tree re-renders; problematic with large trend lists |
| Jotai | ~3kb | Minimal | Atomic model, good alternative to Zustand |

Trenfy's client state: selected filters, fetched trends array, loading/error states, maybe cached responses. Zustand handles this in ~50 lines of store code.

**Verdict**: Zustand. **Confidence: High**

### List Performance

**Recommendation: FlashList**

| | FlatList | FlashList |
|---|---|---|
| Recycling | No | Yes (RecyclerListView-based) |
| Performance on 100+ items | Degrades | Consistent |
| Setup | Built-in | `npm install @shopify/flash-list` |
| Expo support | Yes | Yes (SDK 47+) |

Trend feeds will render 50-200 items per request. FlatList re-mounts cells; FlashList recycles them. The perf difference is visible above ~50 items on mid-range Android.

**Verdict**: FlashList. Negligible setup cost, meaningful perf improvement. **Confidence: High**

---

## NocoDB: Direct REST vs FastAPI BFF

**Recommendation: All RN app requests go through FastAPI (BFF pattern)**

| Approach | Pros | Cons |
|---|---|---|
| **RN → FastAPI → NocoDB** | Single network hop from app perspective; API token never on device; can add pagination, transformation, caching in FastAPI; NocoDB internal URL never exposed | Extra FastAPI endpoint work |
| **RN → NocoDB REST directly** | Fewer hops; NocoDB has a REST API with filter/sort | Exposes NocoDB API token in app bundle (security issue); couples app to NocoDB's query syntax; no caching layer; breaks if NocoDB URL changes |

The NocoDB API token (`xc-token`) must never be in a mobile app bundle — it grants full database access. The FastAPI layer already exists and already talks to NocoDB. The endpoints are already spec'd in `app.py`.

**Verdict**: FastAPI BFF is mandatory, not optional. **Confidence: High**

---

## Docker Compose

**Recommendation: Two services — `backend` + `nocodb`**

```yaml
services:
  nocodb:          # already running self-hosted
  backend:         # FastAPI app
    depends_on: [nocodb]
    ports: ["8080:8080"]
    env_file: .env
```

**Single service (backend only)**: Would work if NocoDB runs on a separate server/VM. Per the spec, NocoDB is "already running self-hosted Docker" — it may already be in a separate compose stack. In that case, the backend connects via the NocoDB URL in `.env` and no `nocodb` service is needed in this compose file.

**Multi-service with nginx**: Out of scope for v1 (spec explicitly excludes Caddy/reverse proxy).

**Verdict**: Define both services in `docker-compose.yml` for local dev. For production, whether NocoDB is in the same compose stack depends on the server setup. Keep the connection configurable via `NOCODB_API_URL` in `.env`. **Confidence: High**

---

## Summary Table

| Decision | Recommendation | Confidence |
|---|---|---|
| FastAPI version | `>=0.115` with lifespan | High |
| Pydantic | V2 (`>=2.7`) | High |
| HTTP client (backend) | `httpx>=0.27` | High |
| Scheduler | Custom asyncio loop (existing design) | High |
| X scraping | `beautifulsoup4` + `lxml` | High |
| X (v1) | RapidAPI tikapi + circuit-breaker | Medium |
| X (v2) | Evaluate `XApi` (Playwright) | Low |
| Expo vs bare RN | Expo managed workflow | High |
| Navigation | React Navigation v7 native stack | High |
| HTTP client (RN) | `axios` with configured instance | High |
| UI components | NativeWind v4 | Medium |
| State management | Zustand | High |
| List rendering | FlashList | High |
| NocoDB access from RN | Via FastAPI BFF only | High |
| Docker Compose | Two services (backend + nocodb) | High |
