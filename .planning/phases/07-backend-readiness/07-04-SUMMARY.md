# 07-04 Execution Summary: Source Toggling + CORS

**Phase:** 07-backend-readiness  
**Plan:** 04  
**Wave:** 4  
**Status:** Complete  
**Commits:** `75db7b8`, `fd6180c`

---

## Changes Made

### Task 1: Source PATCH contract, client helper, and route

#### `api/contracts.py`
- Added `class PatchSourceRequest(BaseModel)` with `enabled: bool` field

#### `tools/nocodb_trends_client.py`
- Added `async def update_source(self, source_id: str, enabled: bool)`:
  - GETs sources table with `where=(id,eq,{source_id})` filter to resolve stable → row ID
  - Returns `None` when source not found
  - PATCHes `/api/v2/tables/{sources_table_id}/records` with `[{"Id": nocodb_row_id, "enabled": enabled}]`
  - Returns `_normalize_source_row(...)` of the updated row

#### `api/routes/trends.py`
- Added `@sources_router.patch("/sources/{source_id}")` and mirrored `@trends_router.patch("/sources/{source_id}")`
- Accepts `payload: PatchSourceRequest`
- Returns `JSONResponse(status_code=404, content={"error": "source_not_found", "id": source_id})` when missing
- Returns updated source object on success

---

### Task 2: Explicit CORS allowlist

#### `app.py`
- Added `def _cors_origins() -> list:` helper:
  - Always includes `http://localhost:5173`
  - Reads `CORS_ORIGINS` env var, splits on commas, trims whitespace, drops blanks
  - Deduplicates while preserving insertion order
- Replaced `allow_origins=["*"]` with `allow_origins=_cors_origins()`
- Replaced `allow_methods=["GET", "POST"]` with `allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"]`
- Kept `allow_credentials=False`

#### `.env.example`
- Added `CORS_ORIGINS=` with comment explaining comma-separated deployed origins

---

## Tests Added

### `tests/test_api_refresh_and_sources.py` (+2 tests, wave 4 total 12)
- `test_patch_source_updates_enabled_flag_and_returns_source`
- `test_patch_source_returns_404_when_not_found`

### `tests/test_nocodb_trends_client.py` (+3 tests, wave 4 total 9)
- `test_update_source_returns_none_when_not_found`
- `test_update_source_returns_updated_row_when_found`
- `test_update_source_sends_patch_with_correct_body`

### `tests/test_app_cors.py` (new, 4 tests)
- `test_cors_origins_default_includes_localhost`
- `test_cors_origins_includes_extra_from_env`
- `test_cors_preflight_allows_localhost_origin`
- `test_cors_preflight_allows_patch_and_delete`

### `tests/test_infra_config.py` (+1 assertion)
- Added `CORS_ORIGINS=` to `test_env_contract_keys` required keys list

---

## Verification

```
uv run pytest tests/test_api_refresh_and_sources.py tests/test_nocodb_trends_client.py tests/test_app_cors.py tests/test_infra_config.py -q
21 passed in 0.38s
```

---

## Must-Haves Status

| Truth | Status |
|-------|--------|
| `PATCH /api/sources/{id}` updates `enabled` flag by stable source ID and returns updated source object | ✓ |
| Missing source targets return explicit JSON 404 payloads | ✓ |
| FastAPI CORS no longer uses wildcard origins and always allows `http://localhost:5173` | ✓ |
| `CORS_ORIGINS` is parsed as a comma-separated explicit allowlist while keeping localhost dev access | ✓ |
| CORS preflight covers `PATCH`, `DELETE`, and `OPTIONS` with `allow_credentials=False` | ✓ |

| Artifact | Status |
|----------|--------|
| `api/contracts.py` contains `class PatchSourceRequest` | ✓ |
| `api/routes/trends.py` contains `@sources_router.patch("/sources/{source_id}")` | ✓ |
| `app.py` contains `def _cors_origins()` and `http://localhost:5173` | ✓ |
| `.env.example` contains `CORS_ORIGINS=` | ✓ |
| `tests/test_app_cors.py` contains `Access-Control-Request-Method` | ✓ |
