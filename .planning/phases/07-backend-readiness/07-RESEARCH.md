# Phase 07: Backend Readiness - Research

**Researched:** 2026-03-20
**Domain:** FastAPI + NocoDB backend preparation for web admin and public demo feed
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
| DB-01 | Add `status` SingleSelect field (`pending`/`approved`/`rejected`) to NocoDB `trends` table | Use a real NocoDB Single Select field with default `pending`; avoid app-only pseudo-schema |
| DB-02 | Default value for `status` is `pending` on all new and existing records | Plan both: NocoDB field default for new rows and one-time backfill or API null-as-pending fallback for existing rows |
| BAPI-01 | Add `status` field to `TrendItem` Pydantic model with `Optional[str]` type | Pydantic v2 requires an explicit `= None` default for optional patch/read semantics |
| BAPI-02 | Update `GET /api/trends` to accept `status` query param filter | Use route-level validation plus NocoDB `where` filtering; reject unsupported values with `400` |
| BAPI-03 | Add `PATCH /api/trends/{id}` endpoint accepting partial field updates (status, title, category, etc.) | Use a dedicated partial request model and `model_dump(exclude_unset=True)` merge pattern |
| BAPI-04 | `PATCH /api/trends/{id}` validates that `status` value is one of `pending`/`approved`/`rejected` | Centralize allowed-status validation in request model or helper and return explicit JSON `400` |
| BAPI-05 | Add `DELETE /api/trends/{id}` endpoint — hard delete from NocoDB | Add dedicated client helper; confirm exact NocoDB delete call shape in local Swagger/API snippets before implementation |
| BAPI-06 | Add `PATCH /api/sources/{id}` endpoint — updates `enabled` field on `trend_sources` table | Reuse existing string-id lookup pattern, resolve NocoDB row `Id`, then PATCH the row |
| BAPI-07 | Update FastAPI CORS middleware to allow `http://localhost:5173` (Vite dev) and `CORS_ORIGINS` env var for production | Replace wildcard origins with explicit allowlist helper; allow PATCH/DELETE methods and keep `allow_credentials=False` |
</phase_requirements>

## Summary

Phase 07 should be planned as a focused backend contract phase, not a dependency-upgrade phase. The current code already has the right seams: FastAPI route logic lives in `api/routes/trends.py`, all NocoDB access is centralized in `tools/nocodb_trends_client.py`, and existing tests already enforce explicit JSON error payloads and query forwarding behavior. The missing work is narrowly scoped: add `status` to the trend model and read path, add three mutation endpoints, and replace the current wildcard CORS setup with an explicit allowlist that supports browser preflight for PATCH and DELETE.

The most important planning nuance is the mismatch between the requirement that all existing records default to `pending` and the context decision that existing blank/null values are treated as `pending`. The safest plan is to include both a one-time NocoDB backfill and defensive API normalization. That avoids forcing the UI or demo feed to reason about legacy nulls, and it keeps `GET /api/trends?status=pending` behavior correct even before or during migration.

NocoDB is the main uncertainty surface. The current client already proves the project’s table IDs, auth header, query parameters, and batch PATCH shape. But the public NocoDB docs are overview-level and do not fully document the exact delete/update payload shape this specific hosted instance expects. The planner should explicitly include a short Wave 0 contract check against the local NocoDB Swagger/API snippets before implementation of hard delete.

**Primary recommendation:** Plan Phase 07 around four concrete work items: NocoDB `status` field + backfill, `TrendItem`/query filter updates, trend/source mutation endpoints via dedicated request models and client helpers, and explicit CORS allowlist parsing for Vite plus deploy origins.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.118.3 in current runtime; latest PyPI 0.135.1 (2026-03-01) | HTTP API framework | Existing app already uses FastAPI lifespan, APIRouter, TestClient, and CORSMiddleware patterns |
| Pydantic | 2.12.3 in current runtime; latest PyPI 2.12.5 (2025-11-26) | Request and response models | Project is already on Pydantic v2 semantics (`model_dump`, `model_copy` family), which fit partial PATCH models cleanly |
| httpx | 0.28.1 in current runtime and latest PyPI 0.28.1 (2024-12-06) | Async NocoDB HTTP client | Existing NocoDB client already uses `httpx.AsyncClient` and error handling around it |
| NocoDB REST API | Current hosted instance via `/api/v2/tables/{table_id}/records` | Persistence layer | Existing backend already persists and queries trends/sources through NocoDB table APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Uvicorn | 0.38.0 in current runtime; latest PyPI 0.42.0 (2026-03-16) | ASGI server | Needed for local/manual smoke testing of CORS and browser preflight |
| pytest | Declared in `pyproject.toml`; not installed in current shell; latest PyPI 9.0.2 (2025-12-06) | Test runner | Use for route, client, and config contract tests |
| pytest-asyncio | Declared in `pyproject.toml`; not installed in current shell; latest PyPI 1.3.0 (2025-11-10) | Async test support | Use for direct `NocoDBTrendsClient` async tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Partial PATCH request models | Raw `dict` payloads in routes | Faster to type, but easier to accept typos, miss blank-title validation, and drift from Pydantic v2 behavior |
| CORSMiddleware allowlist | Manual `OPTIONS` handlers | More brittle and duplicates framework behavior FastAPI/Starlette already provide |
| NocoDB-side filtering | Fetch-all then Python filter | Simpler initially, but breaks pagination semantics and needlessly expands data transfer |

**Installation:**
```bash
python3 -m pip install fastapi uvicorn[standard] pydantic httpx pytest pytest-asyncio
```

**Version verification:** Verified against PyPI pages on 2026-03-20.
- `fastapi` latest: `0.135.1` published 2026-03-01
- `pydantic` latest: `2.12.5` published 2025-11-26
- `httpx` latest: `0.28.1` published 2024-12-06
- `uvicorn` latest: `0.42.0` published 2026-03-16
- `pytest` latest: `9.0.2` published 2025-12-06
- `pytest-asyncio` latest: `1.3.0` published 2025-11-10

## Architecture Patterns

### Recommended Project Structure
```text
app.py                         # CORS middleware config
api/
├── contracts.py               # shared validation helpers / constants
└── routes/
    └── trends.py              # list, get, refresh, trend mutations, source mutation
tools/
└── nocodb_trends_client.py    # NocoDB query/update/delete helpers
trend_agents/shared/
└── models.py                  # TrendItem and request/response model touchpoints
tests/
├── test_api_trends_read.py
├── test_api_refresh_and_sources.py
├── test_infra_config.py
└── test_phase07_*.py          # new Phase 07 route/client tests
```

### Pattern 1: Status Normalization at the Backend Boundary
**What:** Treat legacy `null` or blank `status` as `pending` whenever the backend reads or filters data.
**When to use:** Immediately in Phase 07, even if a backfill is also planned.
**Example:**
```typescript
// Source: project-specific recommendation based on locked context + NocoDB null legacy state
const normalizedStatus = rawStatus && rawStatus.trim() ? rawStatus : "pending"
```

### Pattern 2: Partial PATCH via Pydantic v2
**What:** Define a dedicated patch model where every field is optional with an explicit `= None`, then apply `model_dump(exclude_unset=True)` and merge.
**When to use:** `PATCH /api/trends/{id}` and `PATCH /api/sources/{id}`.
**Example:**
```python
# Source: https://fastapi.tiangolo.com/tutorial/body-updates/
update_data = patch_model.model_dump(exclude_unset=True)
updated_item = stored_item_model.model_copy(update=update_data)
```

### Pattern 3: Route-Level Validation, Client-Level Persistence
**What:** Keep HTTP semantics in FastAPI routes and NocoDB table operations in `NocoDBTrendsClient`.
**When to use:** All new status/source mutation code.
**Example:**
```python
# Source: project code pattern in api/routes/trends.py + tools/nocodb_trends_client.py
if patch.status not in VALID_STATUSES:
    return JSONResponse(status_code=400, content={"error": "invalid_status"})

updated = await nocodb_trends.update_trend(record_id, patch)
if updated is None:
    return JSONResponse(status_code=404, content={"error": "trend_not_found", "id": record_id})
return updated
```

### Pattern 4: Explicit CORS Origin Helper
**What:** Parse `CORS_ORIGINS` once, always include `http://localhost:5173`, and pass a concrete list to CORSMiddleware.
**When to use:** `app.py` only.
**Example:**
```python
# Source: https://fastapi.tiangolo.com/tutorial/cors/
origins = ["http://localhost:5173", *configured_origins]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)
```

### Anti-Patterns to Avoid
- **Wildcard CORS in production:** Current code uses `allow_origins=["*"]` and only `GET`/`POST` methods; that is wrong for the web admin contract and too open for deployed origins.
- **Raw passthrough PATCH bodies:** Accepting arbitrary `dict` payloads makes blank-title rules and invalid status handling inconsistent.
- **Python-side post-filtering by status:** It would break cursor paging and make demo-feed filtering unreliable.
- **Using source string `id` directly as NocoDB row `Id`:** `trend_sources` updates already require resolving the real NocoDB row first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser preflight handling | Custom `OPTIONS` routes and header juggling | FastAPI/Starlette `CORSMiddleware` | Official middleware already handles preflight and simple requests correctly |
| Partial update merging | Manual per-field `if value is not None` chains everywhere | Pydantic v2 patch model + `model_dump(exclude_unset=True)` | Cleaner, safer, and matches official FastAPI update guidance |
| Status filtering | Fetch-all and filter in Python | NocoDB `where` query with `eq`/`is` operators | Keeps pagination and DB-side filtering intact |
| Source row resolution | Separate mapping store for source IDs | Existing NocoDB lookup-by-string-id pattern | Already proven in `update_source_status` |
| Schema migration system | New ORM or migration framework for one field | NocoDB UI/API field creation + explicit backfill task | Phase 07 is additive and does not justify infrastructure churn |

**Key insight:** This phase is mostly contract work. Every temptation to introduce a new settings layer, ORM, or custom middleware increases risk without solving the real acceptance criteria.

## Common Pitfalls

### Pitfall 1: `Optional[str]` Without `= None` in Pydantic v2
**What goes wrong:** A patch model field annotated as `Optional[str]` but missing a default becomes required in Pydantic v2.
**Why it happens:** Pydantic v2 no longer gives `Optional` fields an implicit `None` default.
**How to avoid:** For every patchable field use `field: str | None = None`.
**Warning signs:** FastAPI returns `422` for missing patch fields that should have been optional.

### Pitfall 2: Legacy Null Status Rows Leak Past `status=pending`
**What goes wrong:** Existing rows with blank or null `status` disappear from admin moderation when filtering for `pending`.
**Why it happens:** A plain `(status,eq,pending)` filter ignores legacy null/blank rows.
**How to avoid:** Plan a one-time backfill and keep defensive normalization until data is clean.
**Warning signs:** Admin sees fewer pending items after the migration than before.

### Pitfall 3: CORS Is “Configured” but PATCH/DELETE Still Fail
**What goes wrong:** Browser GET works, but PATCH or DELETE fails due to preflight rejection.
**Why it happens:** Current middleware only allows `GET` and `POST`, and browsers use `OPTIONS` preflight for non-simple methods.
**How to avoid:** Expand `allow_methods` to include mutation methods and keep explicit origins.
**Warning signs:** Browser console shows CORS preflight errors on edit/delete actions.

### Pitfall 4: Trend and Source IDs Are Not the Same Kind of ID
**What goes wrong:** `PATCH /api/sources/{id}` tries to PATCH the stable source string directly as if it were NocoDB row `Id`.
**Why it happens:** Source API returns a business ID in `id`, but NocoDB writes need the system row identifier.
**How to avoid:** Reuse the existing resolve-then-patch flow already present in `update_source_status`.
**Warning signs:** Source lookup succeeds, but update calls 404 or silently fail at NocoDB.

### Pitfall 5: DELETE Contract Is Assumed, Not Verified
**What goes wrong:** Planner assumes the NocoDB hard-delete path shape, but implementation discovers the hosted instance expects a different delete endpoint or payload.
**Why it happens:** Public NocoDB docs are overview-heavy; the exact table-specific operation is easier to confirm from local Swagger/API snippets.
**How to avoid:** Put a short contract-verification task before coding the delete helper.
**Warning signs:** First implementation only fails at runtime against real NocoDB despite passing mocked tests.

## Code Examples

Verified patterns from official sources:

### Partial PATCH Merge
```python
# Source: https://fastapi.tiangolo.com/tutorial/body-updates/
stored_item_model = Item(**stored_item_data)
update_data = item.model_dump(exclude_unset=True)
updated_item = stored_item_model.model_copy(update=update_data)
items[item_id] = jsonable_encoder(updated_item)
return updated_item
```

### Explicit CORS Allowlist
```python
# Source: https://fastapi.tiangolo.com/tutorial/cors/
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### NocoDB Filter Operators Relevant to Phase 07
```text
# Source: https://nocodb.com/docs/product-docs/developer-resources/rest-apis
(status,eq,pending)
(status,is,null)
(platform,anyof,youtube,x)
(title,like,%foo%)
```

### Pydantic v2 Model Defaults for Optional Fields
```python
# Source: https://docs.pydantic.dev/latest/concepts/models/
class PatchTrendRequest(BaseModel):
    status: str | None = None
    title: str | None = None
    category: str | None = None
    description: str | None = None
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pydantic v1 `.dict()` / `.copy()` partial updates | Pydantic v2 `.model_dump()` / `.model_copy()` | Pydantic v2 era; repo is already on v2 | Phase 07 patch models should use v2 APIs, not legacy examples |
| Wildcard CORS plus narrow methods | Explicit origin allowlist plus declared mutation methods | Current FastAPI CORS guidance | Required for browser-based admin PATCH/DELETE support |
| Relying on implicit optional defaults | Explicit `= None` defaults for optional fields | Pydantic v2 | Prevents accidental required fields in patch models |

**Deprecated/outdated:**
- `allow_origins=["*"]` as the deployment answer for admin APIs: outdated for this phase because deployed web origins must be explicit.
- Pydantic v1 patch snippets using `.dict(exclude_unset=True)`: outdated in this repo because the installed runtime is already on v2.

## Open Questions

1. **Does DB-02 require an actual backfill of existing trend rows, or is runtime null-as-pending behavior sufficient?**
   - What we know: Requirements say existing records default to `pending`; context allows legacy blank/null values but requires they behave as `pending`.
   - What's unclear: Whether human verification will accept null legacy storage if runtime behavior is correct.
   - Recommendation: Plan a one-time backfill and keep runtime normalization anyway.

2. **What exact NocoDB delete/update call shape does the hosted instance expect for hard delete?**
   - What we know: Current client already uses `/api/v2/tables/{table_id}/records`, query params, and batch PATCH for sources.
   - What's unclear: The exact hard-delete path/body this instance exposes for trend rows.
   - Recommendation: Add a Wave 0 contract-check task against local Swagger/API snippets before implementing delete.

3. **Should unknown fields on `PATCH /api/trends/{id}` be ignored or rejected?**
   - What we know: Broad editable payload is required, but only across known editable fields.
   - What's unclear: Whether callers should get typo protection.
   - Recommendation: Use a broad typed patch model with `extra="forbid"` if the team wants typo safety; otherwise document ignored extras explicitly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `pytest` + `pytest-asyncio` (declared in `pyproject.toml`, not installed in current shell) |
| Config file | `pyproject.toml` |
| Quick run command | `pytest -q tests/test_phase07_api_backend_readiness.py tests/test_phase07_nocodb_backend_readiness.py tests/test_infra_config.py -x` |
| Full suite command | `pytest -q` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | `status` field exists in NocoDB with Single Select options | manual-only | `manual: verify in NocoDB UI or API snippets` | ❌ Wave 0 |
| DB-02 | New rows default to `pending`; legacy rows behave as `pending` | integration/manual | `pytest -q tests/test_phase07_api_backend_readiness.py -k status_default -x` | ❌ Wave 0 |
| BAPI-01 | `TrendItem` exposes `status: Optional[str] = None` | unit | `pytest -q tests/test_phase07_api_backend_readiness.py -k trend_item_status -x` | ❌ Wave 0 |
| BAPI-02 | `GET /api/trends?status=` filters valid values and rejects invalid ones with `400` | route contract | `pytest -q tests/test_phase07_api_backend_readiness.py -k status_filter -x` | ❌ Wave 0 |
| BAPI-03 | `PATCH /api/trends/{id}` accepts partial updates and returns updated trend | route contract | `pytest -q tests/test_phase07_api_backend_readiness.py -k patch_trend -x` | ❌ Wave 0 |
| BAPI-04 | Invalid `status` in trend PATCH returns explicit `400` | route contract | `pytest -q tests/test_phase07_api_backend_readiness.py -k invalid_status -x` | ❌ Wave 0 |
| BAPI-05 | `DELETE /api/trends/{id}` hard deletes and returns `{id, deleted: true}` | route/client contract | `pytest -q tests/test_phase07_api_backend_readiness.py -k delete_trend -x` | ❌ Wave 0 |
| BAPI-06 | `PATCH /api/sources/{id}` resolves source string ID and updates `enabled` | route/client contract | `pytest -q tests/test_phase07_api_backend_readiness.py -k patch_source -x` | ❌ Wave 0 |
| BAPI-07 | CORS allowlist includes Vite dev origin and mutation methods | config/route contract | `pytest -q tests/test_phase07_api_backend_readiness.py -k cors -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest -q tests/test_phase07_api_backend_readiness.py tests/test_phase07_nocodb_backend_readiness.py tests/test_infra_config.py -x`
- **Per wave merge:** `pytest -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_phase07_api_backend_readiness.py` — route coverage for status filter, patch/delete trend, patch source, explicit JSON errors, and CORS config
- [ ] `tests/test_phase07_nocodb_backend_readiness.py` — NocoDB query/update/delete helper contracts, especially legacy null status and source row lookup
- [ ] Manual NocoDB verification step — confirm `status` field type/options/default and hosted delete/update API snippets
- [ ] Framework install in current shell — `pytest` command is missing, so automated validation was not runnable during research

## Sources

### Primary (HIGH confidence)
- FastAPI CORS docs: https://fastapi.tiangolo.com/tutorial/cors/ - allowed origins, methods, preflight behavior, wildcard caveats
- FastAPI body updates docs: https://fastapi.tiangolo.com/tutorial/body-updates/ - partial update pattern using `model_dump(exclude_unset=True)` and `model_copy(update=...)`
- Pydantic models docs: https://docs.pydantic.dev/latest/concepts/models/ - v2 model behavior and serialization methods
- NocoDB REST API overview: https://nocodb.com/docs/product-docs/developer-resources/rest-apis - v2/v3 endpoint structure, `where` operators, rate limits
- NocoDB API access docs: https://nocodb.com/docs/product-docs/developer-resources/rest-apis/accessing-apis - API token auth guidance
- PyPI FastAPI page: https://pypi.org/project/fastapi/ - latest version `0.135.1`, published 2026-03-01
- PyPI Pydantic page: https://pypi.org/project/pydantic/ - latest version `2.12.5`, published 2025-11-26
- PyPI httpx page: https://pypi.org/project/httpx/ - latest version `0.28.1`, published 2024-12-06
- PyPI pytest page: https://pypi.org/project/pytest/ - latest version `9.0.2`, published 2025-12-06
- PyPI pytest-asyncio page: https://pypi.org/project/pytest-asyncio/ - latest version `1.3.0`, published 2025-11-10
- PyPI uvicorn page: https://pypi.org/project/uvicorn/ - latest version `0.42.0`, published 2026-03-16

### Secondary (MEDIUM confidence)
- Repository code inspection: `app.py`, `api/routes/trends.py`, `tools/nocodb_trends_client.py`, `trend_agents/shared/models.py`, and existing test files - used to ground recommendations in the actual codebase and existing conventions

### Tertiary (LOW confidence)
- NocoDB hard-delete endpoint specifics for this hosted instance - public docs were not detailed enough; local Swagger/API snippets should be treated as the source of truth before implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against current repo code and official PyPI / framework docs
- Architecture: HIGH - directly supported by current code seams and official FastAPI/Pydantic patterns
- Pitfalls: MEDIUM - mostly grounded in code plus docs, but delete-contract details remain instance-specific

**Research date:** 2026-03-20
**Valid until:** 2026-04-19
