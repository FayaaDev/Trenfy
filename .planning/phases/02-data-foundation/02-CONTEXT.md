# Phase 2: Data Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

FastAPI core, NocoDB schema, source registry, Pydantic models, and per-source async scheduler running end-to-end. This phase delivers: both NocoDB tables created and accessible, a `source_registry.py` that loads `trend_sources.json`, a `TrendsWorkflow` orchestrating the fetch pipeline, a `TrendsScheduler` looping per-source on configured intervals with task isolation, and a `/health` endpoint that reports real scheduler state.

**Out of scope:** Actual platform API calls (Phase 3). React Native app (Phase 5). REST endpoints beyond `/health` (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### NocoDB table setup
- Both `trends` and `trend_sources` tables are created via the **NocoDB MCP** during Phase 2 — before any code changes are made
- No automated verification test needed after creation — trust MCP output
- Table IDs are stored in env vars only (`NOCODB_TRENDS_TABLE_ID`, `NOCODB_SOURCES_TABLE_ID`) — no hardcoded fallbacks for the sources table; no dedicated config file
- **Known NocoDB connection:** Base ID `ps82pgir3bbih55`, existing `trends` table ID `md3c6cy09fvz2jg` (already hardcoded as default in `NocoDBTrendsClient` — keep it)

### trend_sources NocoDB sync
- On app startup, sync all 8 sources from `trend_sources.json` into the NocoDB `trend_sources` table
- **Upsert by source `id`** — insert if not present, skip/preserve `last_fetched_at` and `last_fetch_status` if the row already exists
- Sync failure is **non-fatal** — log a warning and continue starting the app and scheduler
- JSON is **additive source of truth** — sources in the JSON that are missing from the table get inserted; sources in the table but not in JSON are left untouched (never deleted or disabled)

### Claude's Discretion
- Workflow scope for Phase 2: how `TrendsWorkflow.scan_source()` behaves when no platform client exists yet (stub, no-op, or graceful skip) — Claude decides
- TikTok source handling in Phase 2 scheduler: whether `TIKTOK_TRENDING` runs with a placeholder or is temporarily disabled until Phase 3 — Claude decides
- Per-source error handling in scheduler: logging, `last_fetch_status` update behavior on exception — Claude decides
- Exact FastAPI lifecycle hook (`@app.on_event("startup")` vs lifespan context manager) — Claude decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary specification
- `Trenfy.md` — Full architecture spec: NocoDB schema (§NocoDB Schema), workflow design (§Workflow), scheduler pattern (§Scheduler), API endpoints (§API Endpoints), environment variables (§Environment Variables), implementation order (§Implementation Order). This is the primary design reference for Phase 2.

### Data models (already implemented — do NOT recreate)
- `trend_agents/shared/models.py` — `TrendItem`, `TrendSource`, `SourceType`, `YouTubeVideoMetadata`, `SpotifyTrackMetadata`, `SteamGameMetadata`, `generate_trend_hash`. Canonical data shape for all platform clients and workflow.

### NocoDB client (already implemented — do NOT recreate)
- `tools/nocodb_trends_client.py` — `NocoDBTrendsClient`: full CRUD for `trends` table, multi-URL fallback, dedup by `content_hash`. Phase 2 extends this to add source sync / `trend_sources` table operations.

### Source configuration
- `config/trend_sources.json` — 8 configured sources: YouTube (US, JP, SA), Spotify (new-releases, featured-playlists), Steam (top-sellers, new-releases), TikTok. Defines `id`, `platform`, `endpoint`, `check_interval_minutes`, `enabled` per source.

### Requirements
- `.planning/REQUIREMENTS.md` — CORE-01 through CORE-06 and INFRA-03 define exact acceptance criteria for this phase. Read before planning tasks.

### FastAPI skeleton (extend, do NOT replace)
- `app.py` — Existing FastAPI app with `/health` and CORS. Phase 2 adds startup lifecycle hook, scheduler start, source sync. `scheduler_running: False` must become real state.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/nocodb_trends_client.py`: `NocoDBTrendsClient` — write trend, read trends, dedup by hash. Phase 2 adds a `sync_sources(sources: List[TrendSource])` method (or similar) for the startup upsert.
- `trend_agents/shared/models.py`: All models fully implemented. `TrendItem`, `TrendSource`, `SourceType`, `generate_trend_hash` are ready to import.
- `config/trend_sources.json`: 8 sources already configured. `source_registry.py` just needs to parse this file and return `List[TrendSource]`.
- `app.py`: FastAPI singleton at module level. Extend with startup/shutdown lifecycle — add scheduler start and source sync to the startup hook.

### Established Patterns
- **Async throughout** — all I/O uses `async/await` with `httpx.AsyncClient`. Scheduler uses `asyncio.create_task()` per source. Match this pattern.
- **Module-level singletons** — `NocoDBTrendsClient()` is instantiated at module level in `tools/nocodb_trends_client.py`. Follow the same pattern for scheduler and workflow.
- **Multi-URL NocoDB fallback** — `NocoDBTrendsClient` tries `NOCODB_API_URL`, then `NC_PUBLIC_URL`, then `http://nocodb:8080`. Preserve this.
- **Env var loading** — use `python-dotenv` + `os.getenv()` pattern already established. No Pydantic Settings needed for this phase.

### Integration Points
- `app.py` startup hook → start `TrendsScheduler` + run `source_registry.sync_to_nocodb()` (or equivalent)
- `app.py` `/health` → replace `scheduler_running: False` with real `scheduler.is_running` boolean
- `TrendsScheduler` → imports `source_registry.list_enabled()` → returns `List[TrendSource]` from JSON
- `TrendsScheduler` → per-source: `asyncio.create_task(workflow.scan_source(source))`
- `TrendsWorkflow.scan_source()` → calls platform client (stub in Phase 2), generates hash, dedup, stores via `NocoDBTrendsClient`, updates `trend_sources` row
- `NocoDBTrendsClient` → new method needed: upsert source row in `trend_sources` table on startup + update `last_fetched_at`/`last_fetch_status` after each scan

### NocoDB Connection Details
- **Base ID:** `ps82pgir3bbih55`
- **Trends table ID:** `md3c6cy09fvz2jg` (already hardcoded as default in `NocoDBTrendsClient`)
- **Sources table ID:** Set via `NOCODB_SOURCES_TABLE_ID` env var (new table created in Phase 2 via MCP)
- **MCP available** for table creation and schema verification during Phase 2 execution

</code_context>

<specifics>
## Specific Ideas

- NocoDB MCP will be available to the executing agent — use it to create the `trend_sources` table and verify the `trends` table schema before touching any Python code
- `trends` table may already exist (table ID `md3c6cy09fvz2jg` is the hardcoded default) — verify via MCP before creating; create if missing
- The `trend_sources` table is new and needs to be created in Phase 2 with columns matching Trenfy.md §Table: trend_sources

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-data-foundation*
*Context gathered: 2026-03-19*
