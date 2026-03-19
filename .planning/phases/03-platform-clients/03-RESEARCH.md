# Phase 03: Platform Clients - Research

**Completed:** 2026-03-19
**Mode:** Standard research (Level 2)

## Goal

Plan Phase 03 so implementation delivers real platform trend ingestion with normalized `TrendItem` output, dedup-safe persistence, and source-level failure isolation.

## Inputs Reviewed

- `.planning/phases/03-platform-clients/03-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `Trenfy.md`
- `config/trend_sources.json`
- `trend_agents/shared/models.py`
- `tools/nocodb_trends_client.py`
- `workflows/trends_workflow.py`
- `workflows/trends_scheduler.py`

## Locked Decisions to Honor

- Keep four-platform phase boundary: YouTube, Spotify, Steam, TikTok.
- Keep source-region behavior from `config/trend_sources.json`.
- Persist up to 20 items per source per fetch.
- Normalize categories to `gaming`, `music`, `entertainment` only.
- Category fallback is `entertainment` when mapping fails.
- Skip invalid items (missing required title/url); persist valid items from mixed batches.
- On source failure, mark error status and continue other sources.
- TikTok circuit-breaker recovery is manual re-enable after auto-disable.

## Technical Approach

### 1) Shared Client Contract

Define `BaseTrendClient` in `tools/trend_clients/base.py`:

- `platform: str`
- `async fetch(source: TrendSource, max_items: int = 20) -> list[TrendItem]`

This contract satisfies PLAT-07 and lets workflow dispatch by `source.platform`.

### 2) YouTube Client

Use YouTube Data API v3 `videos.list` with API key auth:

- Endpoint: `https://www.googleapis.com/youtube/v3/videos`
- Params: `chart=mostPopular`, `regionCode`, `part=snippet,contentDetails,statistics`, `maxResults<=20`
- Quota strategy: do not use `search.list`; use only `videos.list` for regular scheduler polling.

Category mapping policy:

- Map known music/game ids to `music`/`gaming`
- Fallback to `entertainment`
- Optional hint in metadata (`secondary_category_hint`)

### 3) Spotify Client

Use Client Credentials OAuth flow and source-driven endpoints:

- Token endpoint: `https://accounts.spotify.com/api/token`
- Protected APIs: `https://api.spotify.com/v1/...`
- Lock refresh with `asyncio.Lock` to avoid concurrent refresh races.
- Refresh token when absent or expiring within 60 seconds.

### 4) Steam Client

Use publicly available Steam endpoints for real trend candidates:

- Featured categories endpoint for top sellers/new releases signal
- App details endpoint for metadata enrichment
- Optional player count endpoint when API key is configured

Normalize output with `metric_type=current_players` and integer metrics.

### 5) TikTok Client

Implement with a provider-backed API adapter and explicit circuit breaker:

- Provider token env var required (`TIKTOK_PROVIDER_API_KEY`)
- Backoff/retry with capped attempts
- Circuit breaker trips after 3 consecutive failures per source id
- On open breaker, client returns empty list and workflow writes `disabled_circuit_breaker`

This preserves locked phase scope even though public direct API access is constrained.

### 6) Workflow Integration

Replace current Phase 2 stub in `TrendsWorkflow.scan_source()`:

1. Resolve client by `source.platform`
2. Fetch max 20 raw normalized `TrendItem`s
3. Drop invalid rows (missing required title/url)
4. Recompute `content_hash` with canonical algorithm
5. Batch duplicate check via `batch_check_duplicates`
6. Persist only new rows via `batch_create_trends`
7. Update source status (`success`, `partial_success`, `error`, `disabled_circuit_breaker`)

## Risks and Mitigations

- **Conflict between roadmap wording and phase context:** follow locked context decisions; keep requirement IDs mapped in plan frontmatter.
- **TikTok API availability variance:** isolate provider adapter and gate with explicit env var + circuit breaker behavior.
- **Quota/rate limits:** use conservative polling, capped retries, and avoid high-cost endpoints.
- **Bad upstream payloads:** strict normalization, invalid item skipping, partial-success status.

## Validation Architecture

### Fast Feedback Commands (< 60s each)

- `python tests/test_trend_client_contracts.py`
- `python tests/test_youtube_client.py`
- `python tests/test_spotify_client.py`
- `python tests/test_steam_client.py`
- `python tests/test_tiktok_client.py`
- `python tests/test_trends_workflow.py`

### Coverage Focus

- Contract compliance (`BaseTrendClient.fetch()` returns `list[TrendItem]`)
- Hash determinism (`platform|title.lower()|published_date|region_code` -> sha256[:32])
- Category normalization and fallback
- Duplicate filtering and persistence counts
- Failure isolation and status updates
- Circuit breaker open/close behavior

### Suggested Wave 0 Test Scaffolds

- `tests/test_trend_client_contracts.py`
- `tests/test_youtube_client.py`
- `tests/test_spotify_client.py`
- `tests/test_steam_client.py`
- `tests/test_tiktok_client.py`
- `tests/test_trends_workflow.py`

## Research Outcome

Proceed to planning with 4 plans:

1. shared contracts + base abstractions + test scaffolds
2. YouTube + Spotify implementation slice
3. Steam + TikTok implementation slice
4. workflow wiring + end-to-end ingest verification
