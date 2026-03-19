# TESTING.md — Test Structure & Practices

## Test Framework

**No pytest** — all tests are standalone Python scripts run directly:

```bash
python tests/test_scan_dryrun.py
python tests/test_syncdetection_payload.py
```

No `pytest.ini`, `setup.cfg`, or `conftest.py`. No test discovery configuration.

---

## Test Locations

| Location | Contents |
|---|---|
| `tests/` | Main SehaRadar test suite (13 files) |
| `test_api_phase1.py` (root) | Phase 1 API tests |
| `test_phase1.py` (root) | Phase 1 integration tests |
| `test_phase2.py` (root) | Phase 2 integration tests |
| `test-*.js` (root, 7 files) | Node.js Playwright/auth tests |

---

## Test Files

### `tests/` Directory

| File | Type | What it tests |
|---|---|---|
| `test_scan_dryrun.py` | Integration (mock) | Full pipeline: normalize→dedup→classify |
| `test_syncdetection_payload.py` | Unit | Webhook payload parsing + auth |
| `test_syncdetection_store.py` | Unit | aiosqlite queue operations |
| `test_syncdetection_worker.py` | Integration | Worker processing webhooks |
| `test_syncdetection_api.py` | Integration | ChangeDetection.io API client |
| `test_nocodb_shared_callers.py` | Integration | NocoDB shared caller pattern |
| `test_quality_gate.py` | Unit | Quality gate validation |
| `test_parser_url_fetch.py` | Integration | Parser fetching from URLs |
| `test_promed_parser_url_fetch.py` | Integration | ProMED parser URL tests |
| `test_who_parser.py` | Unit | WHO parser |
| `test_who_afro_document_parser.py` | Unit | WHO AFRO document parser |
| `test_ecdc_cdtr_pdf_parser.py` | Unit | ECDC CDTR PDF parser |
| `test_mhlw_covid_pdf_parser.py` | Unit | Japan MHLW COVID PDF parser |

---

## Test Pattern: Standalone Scripts

Tests run as `__main__`:
```python
def main():
    all_passed = True
    for test_fn in [test_fn_1, test_fn_2]:
        try:
            test_fn()
        except AssertionError as e:
            all_passed = False
    asyncio.run(test_async_fn())
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
```

Test functions use `assert` for validation; failures collected and reported at end.

---

## Mocking Patterns

### unittest.mock for External Services

```python
from unittest.mock import AsyncMock, MagicMock, patch

with patch("tools.openai_client.get_openai_client") as mock_client:
    mock_client.return_value = AsyncMock(...)
```

### Stub Module Registration (Circular Import Fix)

`test_scan_dryrun.py` manually registers stub modules before imports:
```python
if "tools" not in sys.modules:
    _stub = types.ModuleType("tools")
    _stub.__path__ = [os.path.join(_project_root, "tools")]
    sys.modules["tools"] = _stub
```

This works around circular import chains in `tools/__init__.py` and `health_agents/__init__.py`.

### Mock LLM Responses

`test_scan_dryrun.py` uses a `_LLM_RESPONSES` dict to simulate LLM classification:
```python
_LLM_RESPONSES = {
    "Mpox - Democratic Republic of the Congo": {
        "disease_name": "Mpox",
        ...
    },
    ...
}
def _mock_llm_classify(headline: str) -> Dict: ...
```

---

## Async Test Pattern

Async tests wrapped with `asyncio.run()`:
```python
async def test_end_to_end_mock_pipeline() -> None:
    ...

asyncio.run(test_end_to_end_mock_pipeline())
```

---

## What `test_scan_dryrun.py` Tests (919 lines)

The most comprehensive test — covers the full SehaRadar pipeline without network calls:

1. **TEST 1**: Disease name normalization (`monkeypox` → `Mpox`, `bird flu` → `H5N1`, etc.)
2. **TEST 2**: Deduplication hashing — determinism, cross-source dedup, country aliases
3. **TEST 3**: Disease catalog — builtin diseases, icon assignment, new disease detection
4. **TEST 4**: End-to-end mock pipeline — 3 watchers (WHO/CDC/ProMED) → 10 assertions
5. **TEST 5**: Cross-source deduplication (same disease+country → same hash across WHO/CDC/ECDC)
6. **TEST 6**: Double normalization idempotency

**Mocked**: OpenAI API, NocoDB, ChangeDetection.io API  
**Real**: Parsers, normalization, dedup hashing, disease catalog lookups

---

## Coverage

**No coverage tooling configured.** No `pytest-cov`, no `.coveragerc`.

Coverage is implicit — manual review of what test_scan_dryrun covers vs what's missing.

---

## Trenfy Tests

Per `Trenfy.md`, planned test files:
```
tests/
├── test_youtube_client.py      (not yet created)
├── test_spotify_client.py      (not yet created)
├── test_steam_client.py        (not yet created)
└── test_trends_workflow.py     (not yet created)
```

None of these exist yet. The `tools/trend_clients/` directory doesn't exist either.

---

## Node.js Tests

7 `test-*.js` files in root — Playwright-based tests for Auth0/session inspection:
- `test-action-field.js`
- `test-full-response.js`
- `test-keyboard-only.js`
- `test-session-check.js`
- `test-submit-spy.js`
- `test-ulp-deep.js`
- `test-ulp-inspect.js`

These appear to be one-off auth investigation scripts, not a maintained test suite.

---

## Running Tests

```bash
# Primary dry-run test (no network required)
python tests/test_scan_dryrun.py

# Individual test files
python tests/test_syncdetection_payload.py
python tests/test_who_parser.py

# Node.js tests (require browser)
node test-action-field.js
```

Package.json script: `"test": "./run-tests.sh"` (script not present in codebase).
