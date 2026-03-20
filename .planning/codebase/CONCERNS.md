# CONCERNS.md — Technical Debt & Issues

## Critical Concerns

### 1. Two Systems Coexisting in One Repo

**Issue**: SehaRadar (health surveillance) and Trenfy (trend tracking) share the same repository and directory.

- `server.py` is SehaRadar, but `Dockerfile` is labeled SehaRadar and deploys SehaRadar
- `Trenfy.md` describes the new system, but most top-level code is SehaRadar
- `pyproject.toml` project name is `seha-radar`, packages list `health_agents`, `workflows`, `tools`, `parsers` — no Trenfy packages
- Directory is named `Trenfy` but runs SehaRadar in production

**Risk**: Confusion about which system is active. Deployment includes wrong codebase. New developers lost.

**Impact**: High — architectural clarity, deployment safety

---

### 2. Trenfy Platform Clients Not Implemented

**Issue**: `Trenfy.md` describes `tools/trend_clients/` with `youtube_client.py`, `X_client.py`, `X_client.py`. **None of these files or the directory exist.**

Also missing:
- `trend_agents/shared/source_registry.py`
- `workflows/trends_workflow.py`
- `workflows/trends_scheduler.py`
- `app.py` (FastAPI for Trenfy)

**Impact**: Trenfy is **not functional** — only the data model and NocoDB client exist.

---

### 3. `main.py` Broken Import

**Issue**: `main.py:13` imports `process_webhook` from `workflows` — this symbol **does not exist** in `workflows/__init__.py`. LSP confirms this error.

```python
from workflows import process_webhook, generate_daily_report  # process_webhook missing
```

**Impact**: `main.py` will crash on import. CLI testing broken.

---

### 4. `test_scan_dryrun.py` Import Errors

**Issue**: Imports from `tools.disease_catalog` that don't exist:
```python
from tools.disease_catalog import (
    BUILTIN_DISEASES,   # missing
    ICON_CATALOG,       # missing
    _deterministic_color,  # missing
    has_icon_metadata,
    is_known_disease,
    _load_catalog,      # missing
)
```

LSP confirms these symbols are missing from `tools/disease_catalog.py`.

**Impact**: Primary dry-run test suite will fail on import.

---

## Structural Debt

### 5. No Structured Logging

All logging via `print()` with `[ModuleName]` prefix. No log levels, no log aggregation, no structured output.

```python
print(f"[NocoDBTrends] Error creating trend: {e}")
```

**Impact**: Difficult to monitor in production, no log-level filtering, no JSON logs for log aggregation tools.

---

### 6. New `httpx.AsyncClient` Per Request

Both NocoDB clients create a new `AsyncClient` per request:
```python
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.request(...)
```

**Impact**: No connection pooling. Under load, overhead of new TCP connections per request. Should use a shared persistent client or `lifespan` context.

---

### 7. Hardcoded NocoDB Table IDs as Defaults

Table IDs hardcoded as fallback defaults:
```python
self.table_id = os.getenv("NOCODB_TABLE_ID", "m0s3bmpa8qzp4eh")
self.trends_table_id = _env("NOCODB_TRENDS_TABLE_ID", "md3c6cy09fvz2jg")
```

**Impact**: Silent misconfiguration — if env vars not set, connects to a hardcoded table that may or may not be correct. Fails silently.

---

### 8. No `.env` Validation at Startup

Application starts without checking if required env vars are present. Missing API keys cause runtime errors deep in the call stack.

**Impact**: Cryptic errors at runtime instead of fast-fail at startup.

---

### 9. Circular Import Dependency

`tools/__init__.py` and `health_agents/__init__.py` have a circular import dependency. The test `test_scan_dryrun.py` works around it by manually registering stub modules:
```python
if "tools" not in sys.modules:
    _stub = types.ModuleType("tools")
    sys.modules["tools"] = _stub
```

**Impact**: Fragile test infrastructure; risk of production import errors in edge cases.

---

### 10. No Test Framework (No pytest)

All tests are standalone scripts — no pytest, no test discovery, no fixtures, no coverage tooling.

**Impact**: 
- Cannot run `pytest tests/` to run all tests
- No CI-friendly test output
- No coverage metrics
- Difficult to add parametrized tests

---

### 11. Root-Level Clutter

Many files in the project root that belong to experiments, legacy work, or other systems:
- `emptySDKagnet.py` (29KB) — empty template
- `extract-auth0-config.js` — Auth0 investigation
- 7 `test-*.js` files — one-off Playwright auth tests
- `EMAIL_NOTIFICATION_ARCHITECTURE.txt` (23KB), `QUICK_REF_WEBHOOK.txt` (8KB)
- `seharadar-icons-test.png` (200KB)
- `promed.js`, `promednew.js` — duplicate ProMED scrapers

**Impact**: Navigation difficulty, unclear what's production vs. experiments.

---

## Security Concerns

### 12. API Keys in Default Fallbacks

While env vars are used for secrets, some clients have fallback behavior that could fail open:
```python
self.api_token = _env("NOCODB_API_TOKEN", "")  # empty string default
```

An empty token might still make some NocoDB requests succeed if NocoDB isn't configured with auth.

---

### 13. No Rate Limiting on FastAPI Endpoints

`server.py` exposes endpoints including `/api/trends/refresh` (POST) with no rate limiting. Could be abused to trigger excessive API calls to YouTube / X.

---

### 14. Docker Socket Mounted in Container

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This gives the container full Docker daemon access — effectively root on the host. Required for log streaming feature but is a significant security risk.

---

## Performance Concerns

### 15. X Token Expiry Check

X OAuth token auto-refresh planned "when < 5 min remaining" — not implemented yet. When implemented, needs thread-safe token refresh to avoid race conditions under concurrent requests.

---

## Missing Features (Trenfy Roadmap)

Per `Trenfy.md`, the following are explicitly listed as not yet built:
- X integration (no public API)
- LLM trend analysis via OpenRouter
- Trend velocity tracking (metric snapshots over time)
- Digest emails for trends
- Additional YouTube regions (GB, DE, BR, IN)
- X category-specific tracking (K-pop, Latin, etc.)
