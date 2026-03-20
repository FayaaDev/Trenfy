# 07-03 Execution Summary: Trend Mutation Endpoints

**Phase:** 07-backend-readiness  
**Plan:** 03  
**Wave:** 3  
**Status:** Complete  
**Commits:** `fa2d0af`, `a88b902`

---

## NocoDB Delete Contract (Task 1 Resolution)

Resolved via API research and pattern matching with the existing PATCH code:

**Confirmed contract:**
```
DELETE /api/v2/tables/{table_id}/records
Body: [{"Id": "<row_id>"}]
```

This mirrors the existing PATCH bulk pattern used for sources:
```python
json_body=[{"Id": nocodb_row_id, "last_fetched_at": ..., "last_fetch_status": ...}]
```

No code was needed for Task 1 — the contract was confirmed and recorded here.

---

## Changes Made

### `api/contracts.py`
- Added `from pydantic import BaseModel, field_validator` import
- Added `PatchTrendRequest(BaseModel)` with all 11 editable trend fields as `Optional`
- `status` field: normalized to lowercase, validated against `VALID_STATUSES`, raises `ValidationError` for invalid values
- `title` field: rejects blank/whitespace-only strings when provided
- `updates()` method: returns `self.model_dump(exclude_unset=True)` — preserves explicit empty strings, drops unset fields

### `tools/nocodb_trends_client.py`
- Added `_record_id(row)` helper: extracts `Id` or `id` from a row dict
- Added `update_trend(record_id, updates)`:
  - Fetches current row via `get_trend_by_id`
  - Returns `None` if missing
  - PATCHes `/api/v2/tables/{trends_table_id}/records` with `[{"Id": record_id, **updates}]`
  - Re-fetches and returns the updated row
- Added `delete_trend(record_id)`:
  - DELETEs `/api/v2/tables/{trends_table_id}/records` with `[{"Id": record_id}]`
  - Returns `True` on success, `False` on error

### `api/routes/trends.py`
- Added `PatchTrendRequest` to imports from `api.contracts`
- Added `@trends_router.patch("/{record_id}")`:
  - Accepts `payload: PatchTrendRequest` (Pydantic validates status/title automatically)
  - Returns 404 JSON when `update_trend` returns None
  - Returns updated row on success
- Added `@trends_router.delete("/{record_id}")`:
  - Pre-checks existence via `get_trend_by_id`
  - Returns 404 JSON when trend not found
  - Calls `delete_trend` and returns `{"id": record_id, "deleted": True}`

---

## Tests Added

### `tests/test_phase07_models.py` (+3 tests, now 16 total)
- `test_patch_trend_request_model_dump_excludes_unset` — only explicitly set fields included
- `test_patch_trend_request_preserves_empty_string_for_non_title` — empty description preserved
- `test_patch_trend_request_invalid_status_raises` — invalid status raises `ValidationError`

### `tests/test_nocodb_trends_client.py` (+5 tests, now 6 total)
- `test_update_trend_returns_none_when_not_found`
- `test_update_trend_returns_updated_row_when_found`
- `test_update_trend_sends_patch_with_correct_body`
- `test_delete_trend_returns_true_when_found`
- `test_delete_trend_sends_delete_with_correct_body`

### `tests/test_api_refresh_and_sources.py` (+5 tests, now 10 total)
- `test_patch_trend_updates_fields_and_returns_updated_trend`
- `test_patch_trend_returns_404_when_not_found`
- `test_patch_trend_rejects_invalid_status`
- `test_delete_trend_returns_deleted_ack_on_success`
- `test_delete_trend_returns_404_when_not_found`

---

## Verification

```
uv run pytest tests/test_api_refresh_and_sources.py tests/test_nocodb_trends_client.py tests/test_phase07_models.py -q
32 passed in 0.28s
```

---

## Must-Haves Status

| Truth | Status |
|-------|--------|
| `PATCH /api/trends/{id}` accepts partial multi-field updates and returns the updated trend object | ✓ |
| Trend PATCH rejects unsupported `status` values and blank `title` values | ✓ |
| `DELETE /api/trends/{id}` performs hard delete and returns `{id, deleted: true}` | ✓ |
| Missing trend targets return explicit JSON 404 payloads for PATCH and DELETE | ✓ |
| Trend mutation helpers use consistent NocoDB row-ID strategy | ✓ |

| Artifact | Status |
|----------|--------|
| `api/contracts.py` contains `class PatchTrendRequest` | ✓ |
| `api/routes/trends.py` contains `@trends_router.patch("/{record_id}")` | ✓ |
| `tools/nocodb_trends_client.py` contains `async def update_trend(` | ✓ |
| `tests/test_api_refresh_and_sources.py` contains `/api/trends/` and `trend_not_found` | ✓ |
| `tests/test_nocodb_trends_client.py` contains `update_trend` | ✓ |
