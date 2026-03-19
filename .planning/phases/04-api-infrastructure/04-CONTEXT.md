# Phase 4: API & Infrastructure - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver all Phase 4 REST endpoints and deployment wiring: `GET /api/trends`, `GET /api/trends/{id}`, `POST /api/trends/refresh`, `GET /api/trends/stats`, `GET /api/sources`, and production-ready `docker compose up` for backend + NocoDB. This phase clarifies endpoint behavior and response contracts within that fixed scope; it does not add new capabilities.

</domain>

<decisions>
## Implementation Decisions

### Trends response shape
- `GET /api/trends` uses cursor-based pagination as the public API contract.
- Default ordering (when no explicit sort is passed) is newest `fetched_at` first.
- `start_date` and `end_date` filter by `published_date`.
- Response envelope includes `items` plus pagination metadata (cursor/paging info), not a raw list-only response.

### Refresh endpoint behavior
- `POST /api/trends/refresh` accepts either `source_id` or `platform` (not both in one request).
- Refresh is immediate and in-request: endpoint waits and returns outcome summary rather than async job acceptance.
- Requests targeting all sources are allowed (`platform=all` or omitted selector) and should refresh all enabled sources.
- Success response includes aggregate summary fields (for example `sources_run`, `fetched`, `stored`, `duplicates`) and per-source statuses when multiple sources are refreshed.

### Claude's Discretion
- Cursor token format/details and backward/forward cursor semantics.
- Exact error payload schema and status-code mapping for validation and upstream failures.
- Exact response contracts for `GET /api/trends/stats` and `GET /api/sources` (field-level shape), as long as Phase 4 requirements are satisfied.
- Infrastructure implementation specifics for Dockerfile/Compose internals and env documentation style.

</decisions>

<specifics>
## Specific Ideas

- Keep feed behavior aligned with "trending now": default sort by ingestion recency (`fetched_at`), even while date filters use source publish date.
- Refresh endpoint should support mobile pull-to-refresh behavior for the "All" platform view by allowing all-source refresh in one call.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 4 goal and success criteria for API reachability, refresh behavior, Compose deployability, and RN reachability/CORS.
- `.planning/REQUIREMENTS.md` — API-01 through API-07 and INFRA-01, INFRA-02, INFRA-04 acceptance requirements.

### Product constraints and architecture baseline
- `.planning/PROJECT.md` — v1 constraints (public/no auth, Docker-only posture, platform/domain scope) that constrain API behavior.
- `Trenfy.md` — canonical product/backend spec and schema references used across phases.

### Prior phase decisions that constrain Phase 4
- `.planning/phases/01-clean-slate/01-CONTEXT.md` — public API CORS baseline and app skeleton constraints.
- `.planning/phases/02-data-foundation/02-CONTEXT.md` — source sync, scheduler wiring, and health endpoint behavior carried into API operations.
- `.planning/phases/03-platform-clients/03-CONTEXT.md` — normalized category/metric behavior and source status semantics that API endpoints expose.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/nocodb_trends_client.py`: existing query/get/create, duplicate checks, source sync, source status update, and basic statistics helpers.
- `workflows/trends_workflow.py`: single-source and multi-source scan flows already return aggregate counters useful for refresh responses.
- `workflows/trends_scheduler.py`: module-level scheduler/workflow singletons already used by app lifecycle and health status.
- `trend_agents/shared/source_registry.py`: source lookup/list utilities for refresh targeting by `source_id` or platform/all-source expansion.

### Established Patterns
- FastAPI lifespan startup/shutdown in `app.py` with module-level singleton integration.
- Public API baseline via CORS middleware in `app.py` (`allow_origins=["*"]`, `allow_credentials=False`).
- Async I/O conventions throughout (`httpx.AsyncClient`, async workflow methods, best-effort error handling with status updates).

### Integration Points
- Add API routers to existing `app.py` instance under `/api/*`.
- Map `GET /api/trends` and `GET /api/trends/{id}` to `NocoDBTrendsClient` query/get methods with new cursor contract wrapper.
- Map `POST /api/trends/refresh` to `TrendsWorkflow.scan_source` / `scan_all` paths based on `source_id` or platform selector.
- Map `GET /api/sources` and `GET /api/trends/stats` to source/status and aggregate retrieval paths in `NocoDBTrendsClient`.
- Keep `/health` contract compatible with existing scheduler state in `app.py`.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 04-api-infrastructure*
*Context gathered: 2026-03-19*
