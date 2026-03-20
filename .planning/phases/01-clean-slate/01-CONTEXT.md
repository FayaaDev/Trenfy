# Phase 1: Clean Slate - Context

**Gathered:** 2026-03-19 (retroactive — phase completed before context was captured)
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all SehaRadar code and establish the Trenfy project skeleton. This phase delivers a clean Python repo with: zero SehaRadar files, a minimal FastAPI app (`app.py`) with a working `/health` endpoint, a `pyproject.toml` identifying the project as `trenfy`, and a `docker-compose.yml` with only Trenfy services (trenfy-backend + nocodb). Creating/implementing actual platform clients or the scheduler is out of scope — those are Phase 2 and 3.

</domain>

<decisions>
## Implementation Decisions

### File retention strategy
- SehaRadar files were never tracked in git — the repo was initialized as a clean Trenfy project, so no `git rm` was needed
- `tools/` retains exactly 3 Trenfy-relevant files: `nocodb_trends_client.py`, `html_extraction.py`, `openai_client.py`
- `trend_agents/shared/models.py` is the canonical data model — kept untouched
- `config/trend_sources.json` is the source registry — kept with 8 sources (YouTube US/JP/SA, X ×2, X ×2, X)

### FastAPI skeleton decisions
- `scheduler_running: False` hardcoded in Phase 1 skeleton — Phase 2 wires in real scheduler state
- CORS: `allow_credentials=False`, `allow_origins=["*"]` — appropriate for a public trending API with no auth
- FastAPI app defined as module-level singleton (`app = FastAPI(...)`) so `import app; app.app` works
- Only `/health` route in Phase 1 — all `/api/*` endpoints are Phase 4

### Infrastructure decisions
- NocoDB exposed on port `8081:8080` to avoid collision with trenfy-backend on `8080`
- Dockerfile: `FROM python:3.11-slim` — no Node.js/Playwright layer
- `pip install -e .` is the install strategy (editable install via hatchling)
- Only `curl` installed as a system dependency in Dockerfile (needed for NocoDB healthcheck)
- docker-compose healthcheck on NocoDB: `curl -sf http://localhost:8080/api/v1/health`

### Python project config
- Removed SehaRadar dependencies: `openai-agents`, `aiosqlite`, `pdfplumber`
- Trenfy dependencies: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `httpx`, `python-dotenv`, `beautifulsoup4`, `lxml`
- Dev dependencies: `pytest` + `pytest-asyncio` only
- Build backend: `hatchling`; packages: `trend_agents` + `tools`

### Claude's Discretion
- Exact CORS header configuration details
- Docker healthcheck timing values (interval, timeout, retries)
- `__init__.py` content for packages

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary specification
- `Trenfy.md` — Full Trenfy architecture spec: NocoDB schema, platform client designs, API endpoint specs, implementation order, source registry format, TrendItem model fields, content_hash algorithm. This is the single source of truth for all subsequent phases.

### Source registry
- `config/trend_sources.json` — 8 configured sources: YouTube (US, JP, SA), X (new-releases, featured-playlists), X (top-sellers, new-releases), X. Defines `id`, `platform`, `endpoint`, `check_interval_minutes`, `enabled` per source.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/nocodb_trends_client.py`: `NocoDBTrendsClient` — full NocoDB CRUD: create trend, read trends, deduplicate by `content_hash`. Phase 2+ uses this directly.
- `tools/html_extraction.py`: HTML scraping utilities — needed by the X platform client in Phase 3.
- `tools/openai_client.py`: OpenRouter lazy singleton — available for future LLM use (v2 scope).
- `trend_agents/shared/models.py`: `TrendItem` (full trend data model) and `SourceType` enum (`youtube`, `X`, `X`). Canonical data shape for all platform clients.

### Established Patterns
- `app.py`: FastAPI singleton at module level — extend by importing and registering routers in Phase 4
- `docker-compose.yml`: `depends_on` with `condition: service_healthy` pattern — NocoDB must be healthy before backend starts
- `pyproject.toml`: editable install via hatchling — add new packages to `packages = ["trend_agents", "tools"]`

### Integration Points
- Phase 2 extends `app.py`: add scheduler startup/shutdown lifecycle hooks (`@app.on_event("startup")`)
- Phase 2 updates `health()`: replace `scheduler_running: False` with real scheduler status
- Phase 4 adds API routers: mount under `/api/` prefix on the existing `app` instance
- All platform clients in Phase 3 must import `TrendItem` from `trend_agents/shared/models.py`
- All persistence calls in Phase 3 go through `NocoDBTrendsClient` from `tools/nocodb_trends_client.py`

</code_context>

<specifics>
## Specific Ideas

- Phase 1 established `docker-compose.mac.yml` (separate file) — there is a Mac-specific variant alongside `docker-compose.yml`
- The `docs/` directory exists with unspecified content — downstream agents should check before overwriting

</specifics>

<deferred>
## Deferred Ideas

None — Phase 1 stayed strictly within its clean-slate scope. All platform client work, scheduler implementation, and API endpoints are correctly deferred to Phases 2-4.

</deferred>

---

*Phase: 01-clean-slate*
*Context gathered: 2026-03-19 (retroactive)*
