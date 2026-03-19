# Trenfy — Trend-Catching Platform

## Overview

Trenfy is a platform for tracking trends across YouTube and X. It polls platform APIs, normalizes the data, deduplicates entries, and stores them in NocoDB for querying and analysis.

This is a fresh build. The original repo (SehaRadar) is a health surveillance system running on a separate server.

---

## Architecture

```
Platform APIs (YouTube / X)
         ↓
  Trend Clients (tools/trend_clients/)
         ↓
  Trends Workflow (workflows/trends_workflow.py)
         ↓
  NocoDB Trends Client (tools/nocodb_trends_client.py)
         ↓
  NocoDB (trends + trend_sources tables)
         ↓
  FastAPI Server (app.py) → REST API
         ↓
  Trends Scheduler (workflows/trends_scheduler.py)
```

### Key Design Decisions

- **Dedicated `trends` table** — separate from any other data. Clean separation.
- **Dedicated `trend_sources` table** — tracks source health and last-fetch times.
- **No LLM analysis** — trend APIs return structured metadata (views, streams, player counts). No headline classification needed.
- **Per-platform only** — no cross-platform trend scoring.
- **Coexistence** — health surveillance runs on another server. This repo is Trenfy-only.

---

## NocoDB Schema

### Table: `trends`

| Column | Type | Notes |
|---|---|---|
| `platform` | SingleLineText | youtube / x |
| `category` | SingleLineText | gaming / music / video / etc. |
| `title` | SingleLineText | Item title |
| `description` | LongText | Item description/summary |
| `url` | URL | Link to item on platform |
| `thumbnail_url` | URL | Preview image |
| `published_date` | Date | When item was published/popularized |
| `fetched_at` | DateTime | Auto-set on insert |
| `metric_type` | SingleLineText | views / streams / players |
| `metric_value` | Number (int) | Numeric metric value |
| `metadata` | JSON | Platform-specific extras |
| `region_code` | SingleLineText | ISO region code, e.g. US |
| `content_hash` | SingleLineText | Dedup key |
| `notification_sent` | Checkbox | For future digest feature |

### Table: `trend_sources`

| Column | Type | Notes |
|---|---|---|
| `id` | SingleLineText | YOUTUBE_TRENDING_US, etc. |
| `name` | SingleLineText | Display name |
| `platform` | SingleSelect | youtube / x |
| `endpoint` | SingleLineText | API endpoint path |
| `params` | JSON | Request parameters |
| `check_interval_minutes` | Number | |
| `enabled` | Checkbox | |
| `last_fetched_at` | DateTime | |
| `last_fetch_status` | SingleLineText | success / error |

---

## Project Structure

```
trenfy/
├── app.py                      # FastAPI application
├── main.py                     # CLI entry point
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── requirements.txt
├── .env.example
│
├── trend_agents/
│   └── shared/
│       ├── __init__.py
│       ├── models.py            # TrendItem, SourceType, metadata models
│       └── source_registry.py  # Load trend sources from config
│
├── tools/
│   ├── nocodb_trends_client.py # NocoDB CRUD for trends table
│   ├── openai_client.py        # Future LLM trend analysis
│   ├── html_extraction.py      # For Steam scraping
│   └── trend_clients/
│       ├── __init__.py         # Client factory
│       ├── base.py             # Abstract base + cache mixin
│       ├── youtube_client.py
│       ├── spotify_client.py
│       └── steam_client.py
│
├── workflows/
│   ├── trends_workflow.py      # Fetch → normalize → dedup → store
│   └── trends_scheduler.py     # Per-source interval scheduling
│
├── config/
│   └── trend_sources.json      # Source configuration
│
└── tests/
    ├── test_youtube_client.py
    ├── test_spotify_client.py
    ├── test_steam_client.py
    └── test_trends_workflow.py
```

---

## Data Models

### `trend_agents/shared/models.py`

```python
class SourceType(str, Enum):
    YOUTUBE = "youtube"
    SPOTIFY = "spotify"
    STEAM = "steam"


class TrendItem(BaseModel):
    platform: str
    category: str
    title: str
    description: str
    url: str
    thumbnail_url: Optional[str]
    published_date: str
    metric_type: str   # views | streams | players
    metric_value: int
    region_code: str
    metadata: dict     # platform-specific
    content_hash: str  # dedup key


class YouTubeVideoMetadata(BaseModel):
    video_id: str
    channel_title: str
    channel_id: str
    duration: str
    view_count: int
    like_count: int
    comment_count: int
    category_id: str


class SpotifyTrackMetadata(BaseModel):
    track_id: str
    artist_name: str
    album_name: str
    album_type: str    # album | single | compilation
    popularity: int    # 0-100
    duration_ms: int
    danceability: float
    energy: float
    tempo: float


class SteamGameMetadata(BaseModel):
    app_id: str
    developer: str
    publisher: str
    genres: List[str]
    price: str
    release_date: str
    current_players: Optional[int]
    peak_players: Optional[int]
```

### Dedup Hash

```python
def generate_trend_hash(item: TrendItem) -> str:
    content = f"{item.platform}|{item.title.lower()}|{item.published_date}|{item.region_code}"
    return hashlib.sha256(content.encode()).hexdigest()[:32]
```

---

## Platform Clients

### YouTube (`tools/trend_clients/youtube_client.py`)

**Auth**: API key only. No OAuth needed for public data.

| Method | Endpoint | Quota Cost | Cache TTL |
|---|---|---|---|
| `fetch_trending(region)` | `videos.list?chart=mostPopular` | ~2 units | 5 min |
| `fetch_rising(hours, region)` | `search.list?order=viewCount&publishedAfter` | 100 units/call | 5 min |
| `fetch_video_stats(ids)` | `videos.list?part=statistics` (batch 50) | 1 unit/call | 1 min |

**Quota**: 10,000 units/day. ~100 trending calls/day or ~10K video stat calls/day.

### Spotify (`tools/trend_clients/spotify_client.py`)

**Auth**: OAuth2 Client Credentials Flow. No user login needed.

| Method | Endpoint |
|---|---|
| `fetch_new_releases()` | `GET /browse/new-releases` |
| `fetch_featured_playlists()` | `GET /browse/featured-playlists` |
| `fetch_category_playlists(category)` | `GET /browse/categories/{id}/playlists` |
| `fetch_audio_features(ids)` | `GET /audio-features` (batch 100) |

**Token**: Auto-refresh when < 5 min remaining. Rate limit: rolling 30s window.

### Steam (`tools/trend_clients/steam_client.py`)

**Auth**: Public key (steamcommunity.com/dev/apikey) for basic. Publisher key for player counts.

| Method | Source | Auth |
|---|---|---|
| `fetch_top_sellers()` | Scrape `store.steampowered.com/search/?sort_by=TRENDING_DESC` | None |
| `fetch_new_releases()` | Scrape `store.steampowered.com/search/?sort_by=Release_Desc&filter=4` | None |
| `fetch_app_details(ids)` | `GET /api/appdetails?appids=...` | None |
| `fetch_player_count(app_id)` | `ISteamUserStats/GetNumberOfCurrentPlayers` | Publisher key |

**Note**: No official top-sellers or player-counts API without a Steamworks partner account. Scraping + Store API is the practical approach.

---

## Trend Sources Config (`config/trend_sources.json`)

```json
{
  "sources": [
    {
      "id": "YOUTUBE_TRENDING_US",
      "name": "YouTube Trending - United States",
      "platform": "youtube",
      "endpoint": "videos.list",
      "params": {"chart": "mostPopular", "regionCode": "US", "part": "snippet,contentDetails,statistics"},
      "check_interval_minutes": 15,
      "enabled": true
    },
    {
      "id": "YOUTUBE_TRENDING_JP",
      "name": "YouTube Trending - Japan",
      "platform": "youtube",
      "endpoint": "videos.list",
      "params": {"chart": "mostPopular", "regionCode": "JP", "part": "snippet,contentDetails,statistics"},
      "check_interval_minutes": 15,
      "enabled": true
    },
    {
      "id": "YOUTUBE_TRENDING_SA",
      "name": "YouTube Trending - Saudi Arabia",
      "platform": "youtube",
      "endpoint": "videos.list",
      "params": {"chart": "mostPopular", "regionCode": "SA", "part": "snippet,contentDetails,statistics"},
      "check_interval_minutes": 15,
      "enabled": true
    },
    {
      "id": "X_RECENT_GLOBAL_EN",
      "name": "X Recent Search - Global English",
      "platform": "x",
      "endpoint": "tweets.search.recent",
      "params": {"query": "(breaking OR viral OR \"just announced\") lang:en -is:retweet", "region_code": "GLOBAL", "category": "news", "sort_order": "recency", "max_results": 20},
      "check_interval_minutes": 10,
      "enabled": true
    },
    {
      "id": "X_RECENT_SA_AR",
      "name": "X Recent Search - Saudi Arabia Arabic",
      "platform": "x",
      "endpoint": "tweets.search.recent",
      "params": {"query": "(saudi OR riyadh OR ksa) lang:ar -is:retweet", "region_code": "SA", "category": "news", "sort_order": "recency", "max_results": 20},
      "check_interval_minutes": 10,
      "enabled": true
    }
  ]
}
```

---

## Workflow (`workflows/trends_workflow.py`)

```python
class TrendsWorkflow:
    def __init__(self, trends_client: NocoDBTrendsClient)

    async def scan_source(self, source: TrendSource) -> Dict:
        # 1. Get client for platform
        # 2. Call platform-specific fetch method
        # 3. Generate content_hash per item
        # 4. Batch dedup check
        # 5. Store new items
        # 6. Update source last_fetched_at + status
        return {fetched: N, stored: M, duplicates: D}

    async def scan_all(self) -> Dict:
        # Iterate all enabled sources from source_registry
        # Run scan_source() for each
        # Return aggregate stats
```

No LLM analysis. No translation. Pipeline: **fetch → normalize → hash → dedup → store**.

---

## API Endpoints (`app.py`)

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/health/integrations` | GET | Credential/config status (no secret values) |
| `/api/trends` | GET | Query trends with filters |
| `/api/trends/{id}` | GET | Single trend detail |
| `/api/trends/refresh` | POST | Trigger source/platform refresh |
| `/api/trends/stats` | GET | Aggregate stats by platform |
| `/api/sources` | GET | List trend sources |
| `/api/sources/{id}/enable` | POST | Enable a source |
| `/api/sources/{id}/disable` | POST | Disable a source |

### Query Filters (`GET /api/trends`)

| Param | Type | Notes |
|---|---|---|
| `platform` | string | youtube / x |
| `category` | string | e.g. gaming, music, video |
| `start_date` | string | YYYY-MM-DD |
| `end_date` | string | YYYY-MM-DD |
| `region_code` | string | ISO code, e.g. US |
| `limit` | int | 1-200, default 50 |

### Refresh (`POST /api/trends/refresh`)

```json
{"source_id": "YOUTUBE_TRENDING_US"}
# OR
{"platform": "youtube"}
```

---

## Scheduler (`workflows/trends_scheduler.py`)

```python
class TrendsScheduler:
    async def run(self):
        while True:
            for source in source_registry.list_enabled():
                if self._is_due(source):
                    asyncio.create_task(workflow.scan_source(source))
            await asyncio.sleep(60)  # check every minute
```

Enabled via `TRENDS_ENABLED=true` in `.env`.

---

## Environment Variables (`.env.example`)

```bash
# Trenfy - Trend-Catching Platform

# NocoDB
NOCODB_BASE_ID=
NOCODB_API_TOKEN=
NOCODB_TRENDS_TABLE_ID=
NOCODB_SOURCES_TABLE_ID=
NOCODB_API_URL=https://nocodb.fayaa92.sa

# YouTube Data API v3
YOUTUBE_API_KEY=

# Spotify Web API
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Steam Web API
STEAM_API_KEY=
STEAM_PUBLISHER_KEY=

# Trenfy Settings
TRENDS_ENABLED=true
SERVER_PORT=8080
LOG_LEVEL=info

# OpenRouter (future LLM trend analysis)
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

---

## Dependencies (`requirements.txt`)

```
fastapi
uvicorn[standard]
pydantic
pydantic-settings
httpx
python-dotenv
aiosqlite
openai
beautifulsoup4
lxml
```

---

## Implementation Order

```
Step 1.  pyproject.toml, requirements.txt, .env.example
Step 2.  trend_agents/shared/models.py
Step 3.  config/trend_sources.json
Step 4.  trend_agents/shared/source_registry.py
Step 5.  tools/trend_clients/base.py + youtube_client.py      ← reference impl
Step 6.  tools/nocodb_trends_client.py
Step 7.  workflows/trends_workflow.py
Step 8.  app.py (FastAPI endpoints)
Step 9.  workflows/trends_scheduler.py
Step 10. tools/trend_clients/spotify_client.py
Step 11. tools/trend_clients/steam_client.py
Step 12. tools/trend_clients/__init__.py (factory)
Step 13. main.py (CLI)
Step 14. docker-compose.yml, Dockerfile
Step 15. Tests
```

Working YouTube client by step 5. Full end-to-end by step 9. YouTube + X support by step 11.

---

## Future Roadmap

- **TikTok** — No public API. Consider RapidAPI or web scraping.
- **LLM trend analysis** — Use OpenRouter to classify trend category, detect sentiment, summarize.
- **Trend velocity** — Track metric_value changes over time within the trends table (store snapshots).
- **Digest emails** — Reuse the `email_digest.py` pattern for trend digests.
- **Additional regions** — Extend YouTube sources to GB, DE, BR, IN, etc.
- **Spotify categories** — Track specific genres (hip-hop, K-pop, Latin) via `browse/categories`.
