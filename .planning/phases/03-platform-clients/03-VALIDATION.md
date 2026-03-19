---
phase: 03
slug: platform-clients
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-19
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | standalone Python test scripts |
| **Config file** | none — existing project convention |
| **Quick run command** | `python tests/test_trend_client_contracts.py` |
| **Full suite command** | `python tests/test_trend_client_contracts.py && python tests/test_youtube_client.py && python tests/test_spotify_client.py && python tests/test_steam_client.py && python tests/test_tiktok_client.py && python tests/test_trends_workflow.py` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python tests/test_trend_client_contracts.py`
- **After every plan wave:** Run `python tests/test_trends_workflow.py`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PLAT-07 | unit | `python tests/test_trend_client_contracts.py` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | PLAT-01, PLAT-02 | unit | `python tests/test_youtube_client.py` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | PLAT-07 | unit | `python tests/test_spotify_client.py` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | PLAT-03, PLAT-05 | unit | `python tests/test_steam_client.py` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | PLAT-04, PLAT-06 | unit | `python tests/test_tiktok_client.py` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 3 | PLAT-08 | integration | `python tests/test_trends_workflow.py` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_trend_client_contracts.py` — contract + hash behavior tests
- [ ] `tests/test_youtube_client.py` — YouTube normalization and category mapping
- [ ] `tests/test_spotify_client.py` — OAuth token refresh and endpoint parsing
- [ ] `tests/test_steam_client.py` — Steam source normalization
- [ ] `tests/test_tiktok_client.py` — retry and circuit-breaker behavior
- [ ] `tests/test_trends_workflow.py` — dedup, partial success, and status updates

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| API credential validity against real upstream endpoints | PLAT-01 to PLAT-06 | Requires real secrets and network | Run one scheduler cycle with valid keys and inspect NocoDB rows + source statuses |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
