---
phase: 07
slug: backend-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest-style Python contract tests |
| **Config file** | none |
| **Quick run command** | `python3 tests/test_api_trends_read.py` |
| **Full suite command** | `python3 tests/test_api_trends_read.py && python3 tests/test_api_refresh_and_sources.py && python3 tests/test_infra_config.py` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python3 tests/test_api_trends_read.py` or the smallest relevant file for the touched API surface
- **After every plan wave:** Run `python3 tests/test_api_trends_read.py && python3 tests/test_api_refresh_and_sources.py && python3 tests/test_infra_config.py`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-02-01 | 02 | 1 | BAPI-01 | unit/contract | `python3 tests/test_api_trends_read.py` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 1 | BAPI-02 | route contract | `python3 tests/test_api_trends_read.py` | ✅ | ⬜ pending |
| 07-03-01 | 03 | 2 | BAPI-03 | route contract | `python3 tests/test_api_refresh_and_sources.py` | ✅ | ⬜ pending |
| 07-03-02 | 03 | 2 | BAPI-04 | route contract | `python3 tests/test_api_refresh_and_sources.py` | ✅ | ⬜ pending |
| 07-03-03 | 03 | 2 | BAPI-05 | route contract | `python3 tests/test_api_refresh_and_sources.py` | ✅ | ⬜ pending |
| 07-04-01 | 04 | 2 | BAPI-06 | route contract | `python3 tests/test_api_refresh_and_sources.py` | ✅ | ⬜ pending |
| 07-04-02 | 04 | 2 | BAPI-07 | config/contract | `python3 tests/test_infra_config.py` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all automated verification needs for this phase.
- [ ] Add new assertions to `tests/test_api_trends_read.py` before or alongside read-path code changes.
- [ ] Add new assertions to `tests/test_api_refresh_and_sources.py` before or alongside mutation route changes.
- [ ] Add new assertions to `tests/test_infra_config.py` when `.env.example` and CORS parsing are updated.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NocoDB `trends` table has a lowercase `status` SingleSelect with `pending`/`approved`/`rejected` and default `pending` | DB-01, DB-02 | External schema state is outside static repo verification | Open NocoDB admin for the configured base and confirm the field name, allowed values, and default value; spot-check a legacy record and a newly created record |
| Browser preflight from `http://localhost:5173` succeeds for trend mutation routes | BAPI-07 | Static tests cannot prove browser CORS behavior | Start FastAPI and a Vite app or curl an `OPTIONS` request with `Origin: http://localhost:5173`; confirm `Access-Control-Allow-Origin` and `PATCH, DELETE` availability |
| `CORS_ORIGINS` allowlist works for deployed origins without removing localhost dev access | BAPI-07 | Requires runtime env switching and live response headers | Launch app with `CORS_ORIGINS=https://example.com`, send requests from both origins, and confirm both succeed while unrelated origins fail |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or documented manual dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing assertions for new endpoints and filters
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
