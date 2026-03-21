---
status: diagnosed
trigger: "Investigate one UAT gap for Phase 09 admin panel. Diagnose root cause only; do not implement a fix."
created: 2026-03-21T00:00:00Z
updated: 2026-03-21T06:00:00Z
---

## Current Focus

hypothesis: Confirmed: /admin/trends fails in dev because frontend requests go to localhost:8000 while the backend's documented/default runtime is localhost:8080, and Phase 09 UAT does not include starting the backend.
test: Diagnosis complete.
expecting: N/A
next_action: return root-cause report

## Symptoms

expected: The trends admin page should load live trend rows through the dev setup.
actual: User saw "Failed to load trends."
errors: `npm run dev` gets `8:01:57 AM [vite] http proxy error: /api/trends?limit=50 AggregateError [ECONNREFUSED]: at internalConnectMultiple (node:net:1134:18) at afterConnectMultiple (node:net:1715:7)`
reproduction: Test 1 in UAT
started: Reported during Phase 09 UAT on 2026-03-21

## Eliminated

## Evidence

- timestamp: 2026-03-21T06:00:00Z
  checked: web/src/pages/admin/TrendsPage.tsx
  found: The page uses `useQuery(getTrends)` and renders `Failed to load trends.` whenever the query enters `isError`.
  implication: The UI message is a generic consequence of the API request failing, not a rendering-specific bug in the table itself.

- timestamp: 2026-03-21T06:00:00Z
  checked: web/src/api/trends.ts and web/src/api/client.ts
  found: `getTrends()` calls `/api/trends`, and `apiRequest()` uses `VITE_API_URL ?? ''`, so the default dev path depends on the Vite proxy.
  implication: In normal local dev, the trends page fully depends on the Vite proxy target being correct.

- timestamp: 2026-03-21T06:00:00Z
  checked: web/vite.config.ts, .planning/ROADMAP.md, .planning/phases/08-web-scaffold-auth/08-02-SUMMARY.md
  found: The frontend proxy is explicitly configured as `/api` -> `http://localhost:8000`.
  implication: Any dev request from the admin UI will be sent to port 8000 unless `VITE_API_URL` is overridden.

- timestamp: 2026-03-21T06:00:00Z
  checked: app.py, .env.example, .env, docker-compose.yml, docs/mockup-mode.md, Trenfy.md
  found: The backend defaults and project docs run the app on port 8080 (`SERVER_PORT=8080`, Docker maps `8080:8080`, docs use `uvicorn ... --port 8080`).
  implication: The repository's default backend runtime does not match the frontend proxy target.

- timestamp: 2026-03-21T06:00:00Z
  checked: .planning/phases/08-web-scaffold-auth/08-UAT.md and .planning/phases/09-admin-panel/09-VERIFICATION.md
  found: Phase 08 UAT only tells the tester to run `npm run dev --prefix web`, while Phase 09 verification notes trend-page behavior requires a live backend.
  implication: The UAT/dev workflow does not make the backend prerequisite explicit, so the default tester path leaves the proxy pointing at an unavailable service.

## Resolution

root_cause: The trends admin page is wired correctly, but its dev data path is not. `TrendsPage` fetches `/api/trends`, Vite proxies that to `http://localhost:8000`, and the reported `ECONNREFUSED` shows nothing is listening there. In this repo, the backend is configured and documented to run on `8080` by default, and the UAT/dev instructions do not tell the tester to start a backend or override the API base URL. This is primarily a dev setup/workflow integration gap caused by a frontend-backend port mismatch.
fix: None applied (diagnosis only).
verification: Diagnosis verified by tracing the request path from UI -> API client -> Vite proxy and comparing it to the backend's documented/default runtime port and UAT workflow.
files_changed: []
