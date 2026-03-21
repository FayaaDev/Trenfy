---
status: diagnosed
phase: 09-admin-panel
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md, 09-06-SUMMARY.md]
started: 2026-03-21T05:04:03Z
updated: 2026-03-21T06:45:00Z
---

## Current Test

[testing paused - 9 items outstanding]

## Startup Context

- Before testing `/admin/trends`, start the backend on the repo default port: `SERVER_PORT=8080`.
- Then run `npm run dev --prefix web` and open the admin panel through Vite.
- If your backend is running on a different URL or port, set `VITE_API_URL` in `web/.env.local` before starting the web dev server.
- Rerun Test 1 after the backend is reachable through either the default Vite proxy path or the explicit `VITE_API_URL` override.

## Tests

### 1. Trends Table Loads
expected: Start the backend on `http://localhost:8080` (or set `VITE_API_URL` to your non-default backend), then open `/admin/trends`. The page loads a trends table with visible filter controls for Status, Platform, Category, and Region, plus trend rows showing key fields like title, status, dates, and metrics. If the page previously showed `Failed to load trends.`, rerun the test after fixing the backend/API target setup.
result: issue
reported: "Pass, but it says \"Failed to load trends.\""
severity: major

### 2. Trends Filters And Sorting
expected: Changing Status, Platform, Category, or Region filters updates the visible rows. Sorting by published date or metric value reorders the table and toggles between ascending and descending.
result: [pending]

### 3. Trends Pagination
expected: Using Next and Prev moves through pages of trend results without losing the ability to navigate back to the earlier cursor position.
result: [pending]

### 4. Single Trend Moderation Actions
expected: Clicking Approve or Reject on a row updates that trend's status quickly in the table and shows a success toast. If the request fails, the row should revert and show an error toast.
result: [pending]

### 5. Delete Trend Confirmation
expected: Clicking Delete opens a confirmation dialog. Cancel leaves the row unchanged. Confirm removes the row from the table and shows feedback.
result: [pending]

### 6. Edit Trend Modal
expected: Clicking Edit opens a modal prefilled with the trend's current values. Required-field validation appears inline when fields are invalid. Saving closes the modal, shows a toast, and refreshes the row with updated values.
result: [pending]

### 7. Bulk Trend Actions
expected: Selecting two or more visible trends shows a bulk action bar. Bulk Approve or Reject updates all selected rows and gives feedback. Changing filters, sorting, or pagination clears the selection.
result: [pending]

### 8. Sources Page Loads
expected: Open `/admin/sources`. The page shows a table of sources with name, platform, enabled state, last fetched time, and status badge.
result: [pending]

### 9. Source Toggle Updates State
expected: Toggling a source on `/admin/sources` updates the enabled state immediately and shows success feedback. If the API rejects the change, the toggle reverts and shows an error toast.
result: [pending]

### 10. Categories Page Loads
expected: Open `/admin/categories`. The page shows category cards with counts sorted from highest to lowest. If no trend data exists, fallback category cards still render instead of an empty page.
result: [pending]

## Summary

total: 10
passed: 0
issues: 1
pending: 9
skipped: 0
blocked: 0

## Gaps

- truth: "Open `/admin/trends`. The page loads a trends table with visible filter controls for Status, Platform, Category, and Region, plus trend rows showing key fields like title, status, dates, and metrics."
  status: failed
  reason: "User reported: Pass, but it says \"Failed to load trends.\""
  severity: major
  test: 1
  root_cause: "Frontend admin requests go to `/api/trends`, which Vite proxies to `http://localhost:8000`, but the repo's backend defaults and docs run on port `8080`, and the UAT/dev workflow does not make the backend startup requirement explicit."
  artifacts:
    - path: "web/vite.config.ts"
      issue: "Dev proxy hardcodes `/api` to `http://localhost:8000`."
    - path: "app.py"
      issue: "Backend runtime defaults to `SERVER_PORT` with `8080` as the fallback."
    - path: ".env.example"
      issue: "Repo defaults document `SERVER_PORT=8080`."
    - path: ".planning/phases/08-web-scaffold-auth/08-UAT.md"
      issue: "Frontend UAT startup path omits the backend prerequisite."
  missing:
    - "Align the frontend dev API target with the backend's actual default port."
    - "Standardize and document the local dev startup contract so admin UAT includes a running backend or explicit API URL override."
  debug_session: ".planning/debug/phase-09-admin-trends-load.md"
