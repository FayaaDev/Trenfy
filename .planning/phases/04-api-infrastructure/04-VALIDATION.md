---
phase: 04
slug: api-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-19
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Python script-style tests (`python3 tests/*.py`) |
| **Config file** | none — direct script execution |
| **Quick run command** | `python3 tests/test_api_trends_read.py` |
| **Full suite command** | `python3 tests/test_api_trends_read.py && python3 tests/test_api_refresh_and_sources.py && python3 tests/test_infra_config.py` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python3 tests/test_api_trends_read.py` or `python3 tests/test_api_refresh_and_sources.py` for the touched contract.
- **After every plan wave:** Run `python3 tests/test_api_trends_read.py && python3 tests/test_api_refresh_and_sources.py && python3 tests/test_infra_config.py`.
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | API-01, API-02 | contract | `python3 tests/test_api_trends_read.py` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | API-04, API-06, API-07 | contract | `python3 tests/test_api_trends_read.py` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | API-03 | contract | `python3 tests/test_api_refresh_and_sources.py` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | API-05 | contract | `python3 tests/test_api_refresh_and_sources.py` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | INFRA-01, INFRA-02 | config | `python3 tests/test_infra_config.py` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 1 | INFRA-04 | config | `python3 tests/test_infra_config.py` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_api_trends_read.py` — endpoint and pagination contract checks
- [ ] `tests/test_api_refresh_and_sources.py` — refresh selector and sources payload checks
- [ ] `tests/test_infra_config.py` — Dockerfile/compose/env contract checks

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RN device can call `GET /api/trends` over LAN and sees CORS headers | API-07 | Requires physical/emulated device networking path | Start compose stack, call backend from RN app/device, confirm response success and no NocoDB token in device request |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
