# INTEGRATIONS.md — External Services & APIs

## NocoDB (Primary Database)

- **Role**: BaaS / REST database layer. All data stored here.
- **Client**: `tools/nocodb_client.py` (SehaRadar), `tools/nocodb_trends_client.py` (Trenfy)
- **API version**: NocoDB v2 (`/api/v2/tables/{tableId}/records`)
- **Auth**: `xc-token` header with `NOCODB_API_TOKEN`
- **URL resolution**: Tries `NOCODB_API_URL` → `NC_PUBLIC_URL` → `http://nocodb:8080`
- **Resilience**: Falls back across multiple configured base URLs on 502/503/504

**SehaRadar tables** (env vars):
| Env var | Default table ID | Purpose |
|---|---|---|
| `NOCODB_TABLE_ID` | `m0s3bmpa8qzp4eh` | Main findings table |
| `NOCODB_QUARANTINE_TABLE_ID` | `mn6vcva5rqv1272` | Quarantined findings |
| `NOCODB_BASE_ID` | — | Base identifier |

**Trenfy tables** (env vars):
| Env var | Default table ID | Purpose |
|---|---|---|
| `NOCODB_TRENDS_TABLE_ID` | `md3c6cy09fvz2jg` | Trends storage |
| `NOCODB_SOURCES_TABLE_ID` | — | Trend sources tracking |

---

## OpenRouter / OpenAI (LLM)

- **Role**: Disease classification, description generation, Arabic translation
- **Client**: `tools/openai_client.py` — lazy singleton `AsyncOpenAI`
- **Configured via**: `configure_agents_sdk_for_openrouter()` sets global Agents SDK defaults
- **Default model**: `openai/gpt-4o-mini` (env `OPENROUTER_MODEL`)
- **API**: OpenAI-compatible (`https://openrouter.ai/api/v1`)

**Env vars**:
```
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_HTTP_REFERER=  (optional)
```

---

## ChangeDetection.io (Change Monitoring)

- **Role**: Monitors health agency websites for content changes, triggers webhooks
- **Integration**: Webhooks POST to SehaRadar → parsed by `tools/syncdetection_payload.py`
- **Auth**: Webhook authentication via `is_webhook_authenticated()`
- **Client**: `tools/changedetection_client.py` — querying ChangeDetection.io API
- **Queue**: `tools/syncdetection_store.py` — aiosqlite queue for async processing
- **Worker**: `workflows/syncdetection_worker.py` — processes queued webhooks
- **Sync**: `tools/syncdetection_watch_sync.py` — syncs sources to CD.io watches

**Env vars**: `CHANGEDETECTION_API_KEY`, `CHANGEDETECTION_URL`

---

## RSSHub (RSS Aggregation)

- **Role**: Provides RSS feeds from sites that don't natively support RSS
- **Deployment**: Docker container `seha-rsshub` in same Compose stack
- **Client**: `tools/rsshub_client.py`
- **Auth**: Optional `RSSHUB_ACCESS_KEY`
- **Access**: Internal Docker network (`http://seha-rsshub:1200`)

---

## YouTube Data API v3

- **Role**: Fetch trending videos for Trenfy platform
- **Auth**: API key only (no OAuth needed for public data)
- **Client**: `tools/trend_clients/youtube_client.py` (**not yet implemented**)
- **Quota**: 10,000 units/day

**Methods planned**:
- `fetch_trending(region)` — `videos.list?chart=mostPopular` (~2 units)
- `fetch_rising(hours, region)` — `search.list?order=viewCount` (100 units/call)
- `fetch_video_stats(ids)` — batch up to 50 IDs (1 unit/call)

**Env vars**: `YOUTUBE_API_KEY`

---

## X Web API

- **Role**: Fetch new releases, featured playlists for Trenfy
- **Auth**: OAuth2 Client Credentials Flow (auto-refresh when <5 min remaining)
- **Client**: `tools/trend_clients/X_client.py` (**not yet implemented**)

**Methods planned**:
- `fetch_new_releases()` — `GET /browse/new-releases`
- `fetch_featured_playlists()` — `GET /browse/featured-playlists`
- `fetch_audio_features(ids)` — batch up to 100 IDs

**Env vars**: `X_CLIENT_ID`, `X_CLIENT_SECRET`

---

## X Web API + Store Scraping

- **Role**: Fetch top sellers, new releases for Trenfy
- **Auth**: Public key + optional Publisher key for player counts
- **Client**: `tools/trend_clients/X_client.py` (**not yet implemented**)
- **Note**: Top sellers require scraping (`store.Xpowered.com`) — no official API

**Methods planned**:
- `fetch_top_sellers()` — scrape store with TRENDING_DESC sort
- `fetch_new_releases()` — scrape store with Release_Desc sort
- `fetch_app_details(ids)` — `GET /api/appdetails?appids=...`
- `fetch_player_count(app_id)` — `IXUserStats/GetNumberOfCurrentPlayers`

**Env vars**: `X_API_KEY`, `X_PUBLISHER_KEY`

---

## Playwright / Puppeteer (Browser Automation)

- **Role**: Scraping sites with JavaScript rendering (ProMED, X)
- **Setup**: Chromium installed in Docker via `npx playwright install --with-deps chromium`
- **Stealth**: `puppeteer-extra-plugin-stealth` to avoid bot detection
- **Used in**: `bridge-service.js`, `promed.js`

---

## Email (SMTP)

- **Role**: Send health digest emails
- **Workflow**: `workflows/email_digest_workflow.py`
- **Tool**: `tools/email_digest.py`
- **Env vars**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_RECIPIENTS`

---

## Health Agencies (Data Sources)

SehaRadar monitors these agencies via ChangeDetection.io + parsers:

| Source | Parser |
|---|---|
| WHO Disease Outbreak News | `who_parser.py`, `who_afro_document_parser.py`, `who_mpox_parser.py` |
| CDC Outbreaks | `cdc_parser.py` |
| ProMED-mail | `promed_parser.py` |
| ECDC CDTR PDF | `ecdc_cdtr_pdf_parser.py` |
| MHLW COVID PDF | `mhlw_covid_pdf_parser.py` |
| GTFCC Cholera | `gtfcc_cholera_parser.py` |
| Generic RSS | `rsshub_parser.py`, `generic_parser.py` |
| AI fallback | `ai_parser.py` |

Configuration: `config/sources.json`
