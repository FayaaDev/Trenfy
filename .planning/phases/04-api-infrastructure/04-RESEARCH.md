# Phase 04: API & Infrastructure - Research

**Completed:** 2026-03-19
**Mode:** Standard research (Level 0 with targeted contract verification)

## Goal

Plan Phase 04 so FastAPI exposes the full public trends API contract and local Docker deployment works end-to-end with backend-to-NocoDB internal networking.

## Inputs Reviewed

- `.planning/phases/04-api-infrastructure/04-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/PROJECT.md`
- `app.py`
- `tools/nocodb_trends_client.py`
- `workflows/trends_workflow.py`
- `workflows/trends_scheduler.py`
- `trend_agents/shared/source_registry.py`
- `docker-compose.yml`
- `Dockerfile`
- `.env.example`

## Locked Decisions to Honor

- `GET /api/trends` uses cursor-based pagination and default sort newest `fetched_at` first.
- `start_date` and `end_date` filters apply to `published_date`.
- Trends response is an envelope: `items` + pagination metadata.
- `POST /api/trends/refresh` accepts exactly one selector (`source_id` or `platform`), or refreshes all enabled sources.
- Refresh is in-request and returns aggregate + per-source outcomes.
- No deferred scope added; Phase 4 remains API + infra only.

## Technical Findings

### Existing Assets Already Cover Most Core Logic

- `NocoDBTrendsClient` already supports trend queries, single-item fetch, source queries, and source status updates.
- `TrendsWorkflow.scan_source()` and `scan_all()` already return deterministic counters useful for refresh response summaries.
- `source_registry` already supports source lookup and enabled-source expansion for `platform` and all-source refresh semantics.
- `app.py` already has public CORS middleware and `/health` contract shape.

### Gaps to Close in Phase 4

- No `/api/*` routers are currently implemented.
- Existing query method is offset-based; phase contract requires cursor-based API envelope (can be layered without changing persistence schema).
- `NocoDBTrendsClient.get_statistics()` only reports counts and only for 3 platforms; requirement needs per-platform totals plus newest `fetched_at` and inclusion of current platforms.
- Docker image currently does not copy `workflows/` even though `app.py` imports scheduler/workflow modules.

### Recommended Cursor Strategy

- Keep storage/query internals offset-capable in `NocoDBTrendsClient`.
- Implement API-level cursor token as base64 JSON `{offset:int, sort:str}`.
- API translates incoming cursor -> offset and computes `next_cursor` if response has full page size.
- Enforce `limit` policy at API edge: default 50, max 200.

### Recommended API Contract Shapes

- `GET /api/trends`:
  - Request query: `platform`, `category`, `region_code`, `start_date`, `end_date`, `limit`, `cursor`
  - Response: `{items: [...], paging: {limit, next_cursor, has_more}}`
- `GET /api/trends/{id}`:
  - 200 with trend record when found
  - 404 with `{error: "trend_not_found", id: "..."}` when missing
- `GET /api/trends/stats`:
  - `{total_trends, by_platform: [{platform, total_trends, newest_fetched_at}]}`
- `POST /api/trends/refresh`:
  - Accept one of `source_id` or `platform`; reject both with 422
  - `platform=all` or missing selector triggers all enabled sources
  - Response includes aggregate totals and `results` array for per-source statuses
- `GET /api/sources`:
  - Returns `id`, `name`, `platform`, `last_fetched_at`, `last_fetch_status`, `enabled`

### Infrastructure Contract for Phase 4

- Compose must run backend + nocodb with backend using internal `http://nocodb:8080` URL.
- Dockerfile must copy all runtime modules imported by `app.py` (`trend_agents`, `tools`, `workflows`, `config`, `app.py`).
- `.env.example` must document required runtime vars for API + clients + Docker deployment.

## Risks and Mitigations

- **Risk:** Offset pagination internals differ from cursor API requirement.
  - **Mitigation:** Cursor token wraps offset deterministically; API contract remains cursor-based.
- **Risk:** Refresh endpoint can block if multiple slow sources run.
  - **Mitigation:** Keep immediate execution but return aggregate results from existing workflow methods; cap operations to enabled configured sources only.
- **Risk:** Docker runtime import failures from missing modules.
  - **Mitigation:** Explicit `COPY workflows/ workflows/` and include a container-level healthcheck path.

## Validation Architecture

### Fast Feedback Commands (< 60s each)

- `python3 tests/test_api_trends_read.py`
- `python3 tests/test_api_refresh_and_sources.py`
- `python3 tests/test_infra_config.py`

### Coverage Focus

- Query endpoint limit guards, filters, cursor envelope, and default ordering behavior.
- Detail endpoint 200/404 behavior.
- Refresh request validation (selector rules) and all-source/platform/source execution paths.
- Source listing shape and refresh status propagation.
- Compose/Docker/env wiring for internal networking and required runtime files.

### Suggested Wave 0 Test Scaffolds

- `tests/test_api_trends_read.py`
- `tests/test_api_refresh_and_sources.py`
- `tests/test_infra_config.py`

## Research Outcome

Proceed to planning with 3 execute plans:

1. Read-oriented API contracts (`GET /api/trends`, `GET /api/trends/{id}`, `GET /api/trends/stats`) and router wiring.
2. Action/status API contracts (`POST /api/trends/refresh`, `GET /api/sources`) with strict selector rules.
3. Infrastructure hardening (`Dockerfile`, `docker-compose.yml`, `.env.example`) to guarantee one-command local deployment.
