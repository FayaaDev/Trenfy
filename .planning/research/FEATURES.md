# Trenfy Feature Research — Content Discovery Platform

## Scope

Platform: YouTube + X (v1 X tentative)  
Regions: US (global baseline) + Saudi Arabia  
Users: No auth — fully public app  
Entry point: React Native mobile app

---

## Backend API Features

### Table Stakes (must have or users won't trust the data)

| Feature | Description | Complexity |
|---|---|---|
| `GET /api/trends` with filters | Filter by platform, category, region_code, date range. Without this the app can't display anything useful | Low |
| `GET /api/trends/{id}` | Single trend detail. Required for deep-link routing | Low |
| Deduplication | `content_hash` prevents the same trend appearing multiple times when scheduler re-runs. Without this, feed floods with duplicates | Low |
| Health endpoint (`/health`) | Required for Docker health checks and monitoring | Low |
| Per-source scheduler | Each source polls on its own interval (YouTube 15m, X 60m, X 30m). Stale data is the worst outcome | Medium |
| Error isolation per source | A failing X scraper must not block YouTube/X polling. Circuit-breaker on each source | Low |
| `fetched_at` timestamp on every record | Users need to know how fresh the data is. "Trending 6 hours ago" is meaningless | Low |
| Pagination on `/api/trends` | Large result sets without pagination crash mobile apps | Low |

### Differentiators

| Feature | Description | Complexity |
|---|---|---|
| Region-aware trends (SA focus) | US-only trending apps exist everywhere. Saudi Arabia + Japan coverage makes Trenfy immediately useful to underserved markets | Low (config-level for YouTube; X has region param; X is global) |
| `POST /api/trends/refresh` | Manual refresh trigger lets users force-pull fresh data from the app. Real-time feel without real-time infrastructure | Low |
| `GET /api/trends/stats` | Aggregate counts by platform — enables a dashboard view showing relative platform activity | Low |
| Source health visibility (`GET /api/sources`) | Expose `last_fetched_at` and `last_fetch_status` per source. Users (and you) can see if X scraper is broken | Low |
| Multi-platform single response | One API call returns trends across all platforms, ranked by `fetched_at`. No per-platform round trips needed | Low (query-level) |
| Trend velocity (v2) | Track `metric_value` over time by storing snapshots. "This song gained 2M streams in 3 hours" is high-signal | High |
| Cross-platform dedup (v2) | Detect when the same song/game appears on multiple platforms simultaneously — strong trend signal | High |

### Anti-Features (do not build in v1)

| Feature | Why not |
|---|---|
| User authentication | Spec explicitly excludes it. Adds weeks of work for zero user-facing value in a public app |
| Push notifications | Defer to v2. Requires APNs/FCM setup, device token management, a notifications table — disproportionate to v1 |
| LLM trend classification | Spec excludes it. Platform APIs return structured metadata (views, streams, players). Classification adds latency and cost with unclear benefit |
| Webhook receivers | Trenfy is a poller, not an event-driven system. No platform sends webhooks for trending data |
| Admin UI | NocoDB already serves as the admin UI. Don't build a second one |
| Rate limit bypass attempts | Don't build retry hammering for YouTube quota. Schedule conservatively (96 units/day for 3 regions at 15m intervals vs 10,000 daily quota) |
| `/api/trends/delete` | No reason to delete trends from a discovery app. Immutable append-only history is valuable |

---

## React Native App Features

### Table Stakes

| Feature | Description | Complexity |
|---|---|---|
| Scrollable trend feed | Main screen. Infinite-scroll list of trends sorted by `fetched_at` desc. Without this there is no app | Low |
| Platform filter tabs | YouTube / X tabs or chips at top. Core UX pattern for this type of app | Low |
| Trend card with thumbnail | Title, platform icon, metric (e.g. "4.2M views"), time ago, thumbnail image. Cards without thumbnails look broken | Low |
| Tap to open source | Deep link to YouTube video, X track, X store page on the native platform app. This is the core user action | Low |
| Pull-to-refresh | Users expect this on any feed. Triggers a new fetch from FastAPI | Low |
| Category filter | Gaming / Music / Video / Entertainment. Lets users narrow to their interest | Low |
| Loading + error states | Skeleton loaders while fetching. Error message with retry when FastAPI is unreachable | Low |
| Empty state | Clear message when no trends match the current filter | Low |
| Region selector | US / SA (the two supported regions). Allows the Saudi Arabia user segment to see locally relevant content | Low |

### Differentiators

| Feature | Description | Complexity |
|---|---|---|
| "Right now" freshness indicator | Show time since last poll per platform ("Updated 4 min ago"). Builds trust that data is live | Low |
| Cross-platform "hot right now" section | A curated top section showing the single hottest trend per platform. Quick scan without scrolling | Low |
| Metric display that makes sense per platform | "4.2M views" (YouTube), "89 popularity" (X), "124K players" (X). Not a generic number — contextual label | Low |
| Platform source health indicator | Small dot (green/red) next to platform tab showing if last fetch succeeded. Users know immediately if X is broken | Low |
| Share trend | Native share sheet to share a trend card. Cheap feature, high virality potential | Low |
| Offline graceful degradation | Cache last-fetched trends in async storage. Show stale data with "last updated X hours ago" rather than blank screen | Medium |
| Saudi Arabia as default region for SA users | Detect device locale (`ar-SA`) and default region to SA. First-run experience for target market | Low |
| Filter persistence | Remember the user's last filter selection across app restarts (AsyncStorage). Users shouldn't re-filter every launch | Low |

### Anti-Features

| Feature | Why not |
|---|---|
| User accounts / favorites / bookmarks | Spec explicitly out of scope for v1. Adds auth complexity, backend user table, sync logic |
| In-app video/audio playback | Trenfy is a discovery app, not a media player. Deep link to native apps is the right pattern |
| Comments / social features | Not a social network. Adding comments requires moderation, auth, and a separate backend surface |
| Algorithmic personalization | No user data = no personalization. Don't fake it with "you might like" patterns |
| Notifications (trending alerts) | Spec deferred to v2. APNs/FCM setup is significant work |
| Search | Not a search engine. Trenfy shows what's trending now, not what a user is looking for. Search would return cold/stale results anyway |
| Dark mode (v1) | Nice to have but not table stakes for a v1 launch. NativeWind makes it easy to add later |
| App store ratings prompt | Don't beg for ratings on a v1 app that hasn't proven value yet |

---

## Feature Priority Order for v1

```
P0 (launch blockers):
  Backend: trends endpoint + filters + pagination + dedup + scheduler
  App: feed + platform tabs + trend card + tap to source + pull-to-refresh

P1 (launch with if cheap):
  Backend: source health endpoints + manual refresh endpoint + stats endpoint
  App: category filter + region selector + loading/error/empty states + freshness indicator

P2 (post-launch, low effort):
  App: filter persistence + share trend + SA locale default + metric labels per platform

V2 (after validation):
  Backend: trend velocity + cross-platform dedup
  App: offline cache + push notifications + favorites
```

---

## Saudi Arabia Considerations

The SA market focus has specific implications:

| Platform | SA Coverage | Notes |
|---|---|---|
| YouTube | Yes — `YOUTUBE_TRENDING_SA` source already in `trend_sources.json` | No extra work |
| X | Partial — `featured-playlists` accepts `country=SA` param; `new-releases` supports `country` param | Add SA sources to `trend_sources.json` |
| X | Global only — no regional trending | X top sellers is global; no SA-specific data |
| X | Unknown — scraper coverage of SA trending unclear | Test before committing |

Arabic content will appear in trend `title` and `description` fields. The RN app must handle RTL text rendering correctly — use the `rtler` skill when implementing text components.
