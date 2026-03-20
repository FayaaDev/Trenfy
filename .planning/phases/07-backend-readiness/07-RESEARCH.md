# Phase 07: Backend Readiness - Research

**Researched:** 2026-03-20
**Domain:** FastAPI + NocoDB backend readiness for web admin and demo feed
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | Add `status` SingleSelect field (`pending`/`approved`/`rejected`) to NocoDB `trends` table | Requires an out-of-band NocoDB schema step plus live verification; no repo code currently manages table schema. |
| DB-02 | Default value for `status` is `pending` on all new and existing records | Needs NocoDB default configuration plus explicit handling for legacy blank/null rows in backend reads and mutations. |
| BAPI-01 | Add `status` field to `TrendItem` Pydantic model with `Optional[str]` type | Modify `trend_agents/shared/models.py`; add unit coverage for serialization/default semantics. |
| BAPI-02 | Update `GET /api/trends` to accept `status` query param filter | Extend `api/routes/trends.py` and `tools/nocodb_trends_client.py`; add 200/400 route tests and pending-legacy behavior tests. |
| BAPI-03 | Add `PATCH /api/trends/{id}` endpoint accepting partial field updates (status, title, category, etc.) | Add request model/constants, client update helper, and route handler; preserve explicit JSON error style. |
| BAPI-04 | `PATCH /api/trends/{id}` validates that `status` value is one of `pending`/`approved`/`rejected` | Centralize allowed-status validation in request model/helper to avoid route-specific drift. |
| BAPI-05 | Add `DELETE /api/trends/{id}` endpoint — hard delete from NocoDB | Add client delete helper plus 404/ack response tests. |
| BAPI-06 | Add `PATCH /api/sources/{id}` endpoint — updates `enabled` field on `trend_sources` table | Reuse current source lookup-by-string-id pattern in the NocoDB client; must return updated source object, not just boolean success. |
| BAPI-07 | Update FastAPI CORS middleware to allow `http://localhost:5173` (Vite dev) and `CORS_ORIGINS` env var for production | Limit CORS changes to `app.py` and `.env.example`; add preflight/config tests. |
</phase_requirements>

## Summary

Phase 07 is mostly a contract-and-client phase, not an `app.py` phase. The current app already mounts all API work through [`api/routes/trends.py`](../../../../api/routes/trends.py), while [`app.py`](../../../../app.py) only wires lifespan and CORS. The roadmap wording that says “add endpoints in `app.py`” should be treated as outdated implementation guidance; the actual route work belongs in the router module, with NocoDB access remaining in [`tools/nocodb_trends_client.py`](../../../../tools/nocodb_trends_client.py).

The highest-risk work is not the FastAPI handler boilerplate. It is the data contract boundary around `status`, partial-update semantics, and ID handling. Trends currently pass through as raw NocoDB rows, while sources already prefer stable string IDs (`id`) over numeric row IDs. Phase 07 adds two mutation surfaces on top of that asymmetry, so the planner should explicitly budget helper methods and tests for row lookup, partial payload extraction, 404 handling, and legacy blank/null `status` behavior.

The current baseline is stable. `uv run pytest tests/test_api_trends_read.py tests/test_api_refresh_and_sources.py tests/test_infra_config.py tests/test_nocodb_trends_client.py` passed locally on 2026-03-20 with 18 tests green. That gives Phase 07 a clean base to extend rather than rework.

**Primary recommendation:** Keep the roadmap’s four-plan shape, but implement in this dependency order: NocoDB schema verification first, then shared contracts/model/client changes, then trend mutations, then source mutation plus CORS.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.135.1 | HTTP routing and app wiring | Already owns the backend surface and tests use `fastapi.testclient`. |
| Pydantic | 2.12.5 | Shared data models and new PATCH request validation | Required for partial-update correctness without manual dict parsing. |
| httpx | 0.28.1 | NocoDB REST client transport | Existing NocoDB client is already built on it. |
| NocoDB REST API | repo-external | Trend/source persistence | Existing backend architecture is NocoDB-backed; Phase 07 extends that contract rather than replacing it. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uvicorn | 0.42.0 | Local server runtime | Runtime only; no Phase 07 behavior change expected. |
| pytest | 9.0.2 | Route/config/client contract tests | Use for all API and config verification. |
| pytest-asyncio | 1.3.0 | Async client helper tests | Needed for NocoDB client coroutine coverage. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Adding new Phase 07 routes in `app.py` | Keep them in `api/routes/trends.py` | This matches the live router architecture and avoids splitting endpoint logic across files. |
| Inline NocoDB PATCH/DELETE calls in route handlers | New client helpers in `tools/nocodb_trends_client.py` | Slightly more client code, but preserves thin handlers and keeps ID lookup logic reusable. |
| Manual `dict` parsing for PATCH bodies | Pydantic request models with `exclude_unset=True` | Required to distinguish “field omitted” from `False` or empty-string updates. |

**Installation:**
```bash
uv sync --dev
```

**Version verification:** Versions above were verified from `uv.lock` on 2026-03-20. Runtime dependencies are declared in `pyproject.toml`; exact locked versions come from the lockfile.

## Architecture Patterns

### Recommended Project Structure
```text
app.py                         # app wiring, lifespan, CORS only
api/
├── contracts.py              # API constants, request models, shared validators
└── routes/
    └── trends.py             # list/filter/read/mutate trend and source endpoints
tools/
└── nocodb_trends_client.py   # all NocoDB query/update/delete logic
trend_agents/shared/
└── models.py                 # TrendItem / TrendSource shared backend models
tests/
├── test_api_trends_read.py
├── test_api_refresh_and_sources.py
├── test_infra_config.py
└── test_app_cors.py          # new for Phase 07
```

### Pattern 1: Thin Router, Stateful Client
**What:** Route handlers validate input, map HTTP status codes, and delegate all NocoDB access to `NocoDBTrendsClient`.
**When to use:** All new `GET/PATCH/DELETE` work in Phase 07.
**Example:**
```python
# Source: api/routes/trends.py + tools/nocodb_trends_client.py
row = await nocodb_trends.get_trend_by_id(record_id)
if row is None:
    return JSONResponse(
        status_code=404,
        content={"error": "trend_not_found", "id": record_id},
    )
return row
```

### Pattern 2: Centralized Contract Constants and Request Models
**What:** Put `VALID_STATUSES`, `PatchTrendRequest`, `PatchSourceRequest`, and lightweight validators in `api/contracts.py`.
**When to use:** Any Phase 07 endpoint that accepts or validates body/query input.
**Example:**
```python
# Source target: api/contracts.py
class PatchTrendRequest(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

    def updates(self) -> dict[str, object]:
        return self.model_dump(exclude_unset=True)
```

### Pattern 3: Reuse Lookup-by-Stable-ID for Sources
**What:** Follow the existing `update_source_status()` pattern for source mutations: resolve string source ID to NocoDB row first, then patch by row ID.
**When to use:** `PATCH /api/sources/{id}` and any future source mutation work.
**Example:**
```python
# Source: tools/nocodb_trends_client.py
lookup = await self._request(
    "GET",
    f"/api/v2/tables/{self.sources_table_id}/records",
    params={"where": f"(id,eq,{source_id})", "limit": 1},
)
rows = lookup.json().get("list", [])
nocodb_row_id = rows[0].get("Id") or rows[0].get("id")
```

### Anti-Patterns to Avoid
- **Routing in `app.py`:** Current app structure keeps endpoint logic out of the root module; mixing them will create duplicate ownership.
- **Truthiness-based PATCH filtering:** `if value:` will silently drop valid updates like `enabled=False` or `description=""`.
- **Per-route status strings:** Repeating `"pending"`, `"approved"`, and `"rejected"` inline across files will drift and weaken tests.
- **Direct wildcard CORS for web admin:** Phase 07 needs an allowlist, not `"*"`.

## Concrete Files To Modify

| File | Why it changes | Notes |
|------|----------------|-------|
| `trend_agents/shared/models.py` | Add `TrendItem.status: Optional[str]` | Shared model only; no source model change required. |
| `api/contracts.py` | Add status constants, query validation helper, and PATCH request models | Best place to centralize `400` validation behavior and partial-body extraction. |
| `tools/nocodb_trends_client.py` | Add status-aware trend query support and new trend/source mutation helpers | This is the main Phase 07 logic file. |
| `api/routes/trends.py` | Add `status` filter, `PATCH /api/trends/{id}`, `DELETE /api/trends/{id}`, `PATCH /api/sources/{id}` | Keep handlers thin and JSON error behavior explicit. |
| `app.py` | Replace wildcard CORS with explicit localhost + env allowlist; add PATCH/DELETE/OPTIONS methods | No route definitions should move here. |
| `.env.example` | Add `CORS_ORIGINS=` | Required for BAPI-07 and infra contract coverage. |
| `tests/test_api_trends_read.py` | Extend GET/filter/read tests for `status` support and invalid status `400` | Existing coverage already owns list/read behavior. |
| `tests/test_api_refresh_and_sources.py` | Add route tests for trend PATCH/DELETE and source PATCH | Existing file already owns refresh/source route contracts. |
| `tests/test_nocodb_trends_client.py` | Add helper tests for update/delete/lookup behavior | Needed because most new risk sits in the client layer. |
| `tests/test_infra_config.py` | Assert `.env.example` contains `CORS_ORIGINS=` | Existing infra file already checks env contract keys. |
| `tests/test_app_cors.py` | New file for preflight and origin allowlist behavior | Current suite has no app-level CORS assertions. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Partial update semantics | Manual body dict cleanup in each route | Pydantic request models + `model_dump(exclude_unset=True)` | Avoids dropping `False` and empty-string values. |
| Source row resolution | Ad-hoc source ID lookups per endpoint | Shared NocoDB client helper | Source business IDs and NocoDB row IDs are different. |
| Status validation | Inline string checks scattered across routes/tests | Shared `VALID_STATUSES` constant and validator | Keeps query/body validation and tests aligned. |
| CORS origin parsing | Repeated `split(",")` logic at import sites | One helper in `app.py` | Avoids whitespace/empty-origin bugs and preserves localhost default. |

**Key insight:** The deceptively hard part of this phase is not CRUD itself; it is preserving consistent API behavior while the backend mixes raw NocoDB rows, stable source IDs, and legacy blank/null status values.

## Common Pitfalls

### Pitfall 1: Treating the roadmap’s `app.py` wording literally
**What goes wrong:** Endpoint code gets split between `app.py` and the router module.
**Why it happens:** The roadmap task text says “add endpoint in `app.py`,” but the live app already delegates all API routes to `api/routes/trends.py`.
**How to avoid:** Restrict `app.py` changes to CORS and app wiring only.
**Warning signs:** New route decorators appear in both files or tests patch the wrong module.

### Pitfall 2: Losing valid PATCH updates because of falsy values
**What goes wrong:** `enabled=False`, `description=""`, or reversible `status="pending"` do not persist.
**Why it happens:** Naive code filters updates with truthiness checks instead of presence checks.
**How to avoid:** Use request models and `exclude_unset=True`; separately validate blank `title`.
**Warning signs:** Tests pass for `enabled=True` but fail for `enabled=False` or clearing a text field.

### Pitfall 3: Mis-handling legacy blank/null `status`
**What goes wrong:** Old records disappear from `status=pending` moderation views or cannot be moved cleanly through moderation.
**Why it happens:** Backend treats only literal `"pending"` as pending instead of applying the locked legacy fallback semantics.
**How to avoid:** Encapsulate pending-filter behavior in the NocoDB client and verify it against live data.
**Warning signs:** Existing rows without `status` vanish once the filter is introduced.

### Pitfall 4: Confusing trend IDs with source IDs
**What goes wrong:** One mutation endpoint expects a NocoDB row ID while another expects a stable business ID, and frontend calls the wrong one.
**Why it happens:** Trends currently pass through as raw rows, while sources are normalized to stable string IDs.
**How to avoid:** Document the path-ID contract in tests and reuse helper methods for lookup.
**Warning signs:** Source PATCH works only with numeric IDs, or trend PATCH receives string IDs that list responses never expose.

### Pitfall 5: CORS configuration that works for GET but blocks admin mutations
**What goes wrong:** Browser reads succeed while PATCH/DELETE fail preflight from Vite.
**Why it happens:** Current middleware only allows `GET` and `POST`, with wildcard origins.
**How to avoid:** Allow `OPTIONS`, `PATCH`, and `DELETE`, keep `allow_credentials=False`, and test localhost plus configured origins explicitly.
**Warning signs:** `curl` works but the browser console shows failed preflight checks.

## Code Examples

Verified patterns from repository sources:

### Explicit JSON 404 contract
```python
# Source: api/routes/trends.py
if row is None:
    return JSONResponse(
        status_code=404,
        content={"error": "trend_not_found", "id": record_id},
    )
```

### Query forwarding from route to client
```python
# Source: api/routes/trends.py
items = await nocodb_trends.query_trends(
    platform=platform,
    category=category,
    region_code=region_code,
    start_date=start_date,
    end_date=end_date,
    limit=effective_limit,
    offset=offset,
    sort=sort,
    q=q,
    min_metric_value=min_metric_int,
)
```

### Existing source lookup pattern to extend
```python
# Source: tools/nocodb_trends_client.py
lookup = await self._request(
    "GET",
    f"/api/v2/tables/{self.sources_table_id}/records",
    params={"where": f"(id,eq,{source_id})", "limit": 1},
)
rows = lookup.json().get("list", [])
nocodb_row_id = rows[0].get("Id") or rows[0].get("id")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wildcard CORS with `GET`/`POST` only | Explicit allowlist with Vite localhost default and mutation methods | Phase 07 | Enables browser admin writes without opening all origins. |
| Read-only trend API plus refresh/source listing | CRUD-ready admin endpoints for trends and sources | Phase 07 | Backend becomes usable by Phase 08 web client. |
| Trend model without moderation state | `TrendItem.status: Optional[str]` plus pending fallback | Phase 07 | Required for admin moderation and demo feed filtering. |
| Separate roadmap wording pointing to `app.py` | Router-centric implementation in `api/routes/trends.py` | Existing codebase reality | Planner should target the live structure, not the stale wording. |

**Deprecated/outdated:**
- Adding Phase 07 endpoint handlers in `app.py`: outdated relative to the current router architecture.

## Plan Split Recommendation

Keep the roadmap’s four plans, but tighten the internal boundaries:

1. **07-01: NocoDB Status Field**
   Manual/live step only. Create the SingleSelect field, set the default, and verify existing data shape in NocoDB before any code relies on it.
2. **07-02: Shared Contracts + Status Read Path**
   Add `TrendItem.status`, status constants/request models in `api/contracts.py`, extend client query support, and ship `GET /api/trends?status=...` with tests.
3. **07-03: Trend Mutations**
   Add trend update/delete helpers in the client, then add `PATCH /api/trends/{id}` and `DELETE /api/trends/{id}` route handlers and tests.
4. **07-04: Source Mutation + CORS**
   Add `PATCH /api/sources/{id}`, finish `.env.example`/CORS helper work, and add preflight/config tests.

This split matters because source/trend mutation handlers should not be written until the request-model and client-helper patterns are in place; otherwise the same validation and lookup logic gets duplicated.

## Open Questions

1. **How should the NocoDB client express “pending includes blank/null status” in the live `where` filter?**
   - What we know: locked behavior requires legacy blank/null rows to behave as pending.
   - What's unclear: the exact NocoDB `where` syntax for blank/null matching is not exercised anywhere in the repo.
   - Recommendation: validate against the live NocoDB table during 07-01 or early 07-02 and then encode the rule in a single helper.

2. **What identifier do trend list rows reliably expose for frontend mutation calls?**
   - What we know: `GET /api/trends/{record_id}` currently treats the path param as a direct NocoDB record identifier.
   - What's unclear: whether list responses always expose `id`, `Id`, or both in live data.
   - Recommendation: inspect a live trend row during planning/early implementation and lock the path-ID contract in tests.

3. **Will the status field be created manually or through an external script/API?**
   - What we know: the current repo contains no schema migration layer for NocoDB.
   - What's unclear: whether the phase owner wants a one-time manual UI change or a repeatable automation step.
   - Recommendation: plan 07-01 as a manual verification task unless an automation path already exists outside this repo.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 + pytest-asyncio 1.3.0 |
| Config file | `pyproject.toml` |
| Quick run command | `uv run pytest tests/test_api_trends_read.py tests/test_api_refresh_and_sources.py tests/test_infra_config.py tests/test_nocodb_trends_client.py -q` |
| Full suite command | `uv run pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | `status` field exists in live NocoDB `trends` table | manual-only | `none — verify in NocoDB UI/API` | ❌ Wave 0 |
| DB-02 | New and legacy rows behave as `pending` by default | manual + api | `uv run pytest tests/test_api_trends_read.py -q` | ⚠️ extend existing |
| BAPI-01 | `TrendItem` accepts optional `status` | unit | `uv run pytest tests/test_phase07_models.py -q` | ❌ Wave 0 |
| BAPI-02 | `GET /api/trends` validates and forwards `status` filter | api | `uv run pytest tests/test_api_trends_read.py -q` | ⚠️ extend existing |
| BAPI-03 | `PATCH /api/trends/{id}` supports partial multi-field updates | api + client | `uv run pytest tests/test_api_refresh_and_sources.py tests/test_nocodb_trends_client.py -q` | ⚠️ extend existing |
| BAPI-04 | Trend PATCH rejects invalid `status` | api + unit | `uv run pytest tests/test_api_refresh_and_sources.py tests/test_phase07_models.py -q` | ❌ Wave 0 |
| BAPI-05 | `DELETE /api/trends/{id}` hard deletes and returns ack | api + client | `uv run pytest tests/test_api_refresh_and_sources.py tests/test_nocodb_trends_client.py -q` | ⚠️ extend existing |
| BAPI-06 | `PATCH /api/sources/{id}` toggles `enabled` and returns updated source | api + client | `uv run pytest tests/test_api_refresh_and_sources.py tests/test_nocodb_trends_client.py -q` | ⚠️ extend existing |
| BAPI-07 | CORS allows localhost dev plus configured origins for browser mutations | api/config | `uv run pytest tests/test_app_cors.py tests/test_infra_config.py -q` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/test_api_trends_read.py tests/test_api_refresh_and_sources.py tests/test_nocodb_trends_client.py -q`
- **Per wave merge:** `uv run pytest tests/test_api_trends_read.py tests/test_api_refresh_and_sources.py tests/test_infra_config.py tests/test_nocodb_trends_client.py tests/test_app_cors.py -q`
- **Phase gate:** `uv run pytest`

### Wave 0 Gaps
- [ ] `tests/test_phase07_models.py` — covers `TrendItem.status`, request-model partial update extraction, and invalid status rejection.
- [ ] `tests/test_app_cors.py` — covers localhost default allowlist, `CORS_ORIGINS` merging, and PATCH/DELETE/OPTIONS preflight.
- [ ] Extend `tests/test_api_trends_read.py` — status forwarding, invalid status `400`, pending legacy fallback behavior.
- [ ] Extend `tests/test_api_refresh_and_sources.py` — trend PATCH/DELETE happy-path + 404 cases, source PATCH happy-path + 404 case.
- [ ] Extend `tests/test_nocodb_trends_client.py` — NocoDB lookup/update/delete helper coverage for trend/source mutations.

## Sources

### Primary (HIGH confidence)
- Repository file `app.py` - current app wiring, lifespan, and CORS middleware.
- Repository file `api/routes/trends.py` - live route structure, error style, and current source/trend handlers.
- Repository file `tools/nocodb_trends_client.py` - NocoDB access patterns and source lookup behavior.
- Repository file `trend_agents/shared/models.py` - canonical shared backend models.
- Repository file `tests/test_api_trends_read.py` - current list/read contract coverage.
- Repository file `tests/test_api_refresh_and_sources.py` - current refresh/source route coverage.
- Repository file `tests/test_infra_config.py` - `.env.example` and infra contract coverage.
- Repository file `tests/test_nocodb_trends_client.py` - existing NocoDB client test surface.
- Repository file `pyproject.toml` - declared runtime/dev test framework.
- Repository file `uv.lock` - locked package versions.
- Repository file `.planning/phases/07-backend-readiness/07-CONTEXT.md` - locked Phase 07 decisions and discretion.
- Repository files `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` - phase scope, requirements, and state.

### Secondary (MEDIUM confidence)
- Live NocoDB schema behavior for blank/null `status` fallback is inferred from phase decisions but not yet verified in this repo.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - backed by `pyproject.toml`, `uv.lock`, and current test execution.
- Architecture: HIGH - backed by current route/client/app structure in the repository.
- Pitfalls: MEDIUM - strongest risks are clear from code, but some NocoDB schema/filter behavior still needs live verification.

**Research date:** 2026-03-20
**Valid until:** 2026-04-03
