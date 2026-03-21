---
phase: 08
slug: web-scaffold-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `vite run build` for type-check; Vitest for unit tests if needed) |
| **Config file** | `web/vite.config.ts` |
| **Quick run command** | `npm run build --prefix web` |
| **Full suite command** | `npm run build --prefix web` (TypeScript compilation is primary gate) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build --prefix web`
- **After every plan wave:** Run `npm run build --prefix web`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | WEB-01,02,03,04 | build | `npm run build --prefix web` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | WEB-05,06,07,08 | build | `npm run build --prefix web` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | WEB-09,AUTH-01..04 | build | `npm run build --prefix web` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/` directory created via `npm create vite@latest` — must exist before any plan runs
- [ ] `web/package.json` with React + TypeScript configured

*Wave 0 is 08-01 (scaffold plan) — it bootstraps the entire test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth redirect works in browser | AUTH-02 | React Router navigation requires browser runtime | Open `http://localhost:5173/admin` unauthenticated; confirm redirect to `/admin/login` |
| Auth login flow works | AUTH-03 | SessionStorage requires browser runtime | Enter correct token on login page; confirm redirect to `/admin` |
| Logout clears session | D-07 | SessionStorage requires browser runtime | Click logout in sidebar; confirm redirect to `/admin/login` |
| Vite proxy forwards to backend | WEB-08 | Requires running backend | `curl http://localhost:5173/api/trends` returns trend data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
