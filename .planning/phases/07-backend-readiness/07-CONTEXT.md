# Phase 7: Backend Readiness - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Prepare the existing FastAPI + NocoDB backend for the web admin and public demo feed. This phase adds the `status` field to trend data, extends the API with trend/source mutation endpoints, and tightens CORS so the Vite frontend can call the backend safely. It does not add backend auth, new moderation features beyond the roadmap, or frontend UI work.

</domain>

<decisions>
## Implementation Decisions

### Status semantics
- Existing trends with blank or null `status` are treated as `pending` for read and moderation behavior.
- `GET /api/trends` keeps returning all statuses by default when no `status` filter is provided.
- `GET /api/trends?status=...` rejects unsupported values with `400`, rather than ignoring the filter or returning an empty list.
- Moderation is reversible: trends can move back to `pending` after being approved or rejected.

### Trend edit contract
- `PATCH /api/trends/{id}` should support a broad editable payload rather than a narrow moderation-only field set.
- The backend accepts any category string during edits; category enforcement is not introduced in this phase.
- Blank `title` values are rejected when provided, but other editable text fields may be cleared.
- A single PATCH request may update multiple trend fields at once.

### Mutation responses
- Successful `PATCH /api/trends/{id}` returns the updated trend object.
- Successful `DELETE /api/trends/{id}` returns a lightweight JSON acknowledgement such as `{id, deleted: true}`.
- Successful `PATCH /api/sources/{id}` returns the updated source object.
- PATCH and DELETE operations return explicit `404` JSON responses when the target trend or source does not exist.

### CORS policy
- If `CORS_ORIGINS` is unset, the backend allows only `http://localhost:5173` by default.
- When `CORS_ORIGINS` is configured, it is treated as an explicit allowlist for deployed origins rather than a wildcard escape hatch.
- The Vite dev origin `http://localhost:5173` remains allowed even when `CORS_ORIGINS` is provided.
- `allow_credentials` stays off for this phase; browser access is allowed, but cookie/session credentials are not part of the contract.

### Claude's Discretion
- Exact JSON field shape for mutation success bodies beyond the locked high-level contract above.
- Exact error key names for invalid status and source-not-found responses, as long as they are explicit JSON `400`/`404` errors.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 7 goal plus plans `07-01` through `07-04`, which define the required status field, new endpoints, and CORS changes.
- `.planning/REQUIREMENTS.md` — DB-01, DB-02, and BAPI-01 through BAPI-07 are the acceptance criteria for this phase.
- `.planning/PROJECT.md` — v1.2 milestone goals and project constraints, including the public/no-backend-auth posture and NocoDB-backed backend assumptions.

### Prior phase decisions that still apply
- `.planning/phases/01-clean-slate/01-CONTEXT.md` — original FastAPI skeleton and public CORS baseline (`allow_credentials=False`, public API posture).
- `.planning/phases/02-data-foundation/02-CONTEXT.md` — source sync rules, stable source IDs, and NocoDB env/table conventions.
- `.planning/phases/04-api-infrastructure/04-CONTEXT.md` — locked `GET /api/trends` response envelope, cursor pagination contract, and existing source/trend API expectations.
- `.planning/phases/05-data-filtering/05-CONTEXT.md` — existing filter-extension pattern and current API validation style for new query params.

### Architecture and risk notes
- `Trenfy.md` — baseline Trenfy schema and API spec; note that Phase 7 intentionally updates the older source enable/disable contract from separate POSTs to PATCH behavior.
- `.planning/research/ARCHITECTURE.md` — Phase 7 integration points for `status`, trend/source mutations, and CORS behavior.
- `.planning/research/PITFALLS.md` — CORS wildcard warning, exact `status` field naming caution, and the Phase 7 verification checklist.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/routes/trends.py` — Existing `GET /api/trends`, `GET /api/trends/{id}`, `POST /api/trends/refresh`, and source listing routes establish the current API style and are the natural place to add new mutation handlers.
- `api/contracts.py` — Existing cursor helpers and request-validation helpers show the current lightweight contract/validation style.
- `tools/nocodb_trends_client.py` — Already handles trend reads, source reads, source sync, and source status updates; it also contains the lookup-by-string-id pattern needed for source mutation helpers.
- `trend_agents/shared/models.py` — `TrendItem` and `TrendSource` remain the canonical data models for backend/frontend alignment.
- `tests/test_api_trends_read.py`, `tests/test_api_refresh_and_sources.py`, and `tests/test_infra_config.py` — Existing contract tests show the expected JSON error style, route behavior, and env-file assertions.

### Established Patterns
- Existing API routes return explicit JSON error payloads for invalid or missing resources instead of silent fallbacks.
- Route handlers pass filtering and data access into `NocoDBTrendsClient` rather than building data access inline.
- Source writes already rely on stable source string IDs and resolve the underlying NocoDB row before PATCHing.
- Environment configuration is handled through small `os.getenv()` helpers and module-level singletons, not a separate settings layer.

### Integration Points
- `app.py` — Update CORS middleware to allow PATCH/DELETE requests, parse `CORS_ORIGINS`, and keep the no-credentials posture.
- `api/routes/trends.py` — Add `status` query param handling plus new `PATCH /api/trends/{id}`, `DELETE /api/trends/{id}`, and `PATCH /api/sources/{id}` routes.
- `tools/nocodb_trends_client.py` — Extend trend query/update/delete helpers and add source-enabled update behavior using the existing NocoDB access patterns.
- `trend_agents/shared/models.py` — Add `status` to `TrendItem`; request-body models for PATCH do not exist yet and will need to be introduced or placed deliberately during planning.

</code_context>

<specifics>
## Specific Ideas

- Keep the admin and demo concerns separate: unfiltered trend reads stay broad, while public/demo callers explicitly request `status=approved`.
- Moderation should remain reversible rather than locking approved/rejected items forever.
- The edit endpoint should be flexible enough for broad admin corrections, not just approve/reject toggles.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-backend-readiness*
*Context gathered: 2026-03-20*
