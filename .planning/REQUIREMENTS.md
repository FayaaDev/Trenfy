---
milestone: v1.2
status: active
created: 2026-03-20
archive_ref: .planning/milestones/v1.1-REQUIREMENTS.md
---

# Active Requirements Baseline — v1.2

This is the **active** requirements traceability file for milestone v1.2 (Web Admin + Demo Feed).

**v1.1 archive:** `.planning/milestones/v1.1-REQUIREMENTS.md`

---

## v1.1 Carry-Over

All v1.1 APP-* requirements (APP-01..APP-12) were deferred to Phase 8 (mobile app). They remain deferred — the v1.2 milestone replaces Phase 8 with a web admin panel and public demo feed instead. Mobile app delivery is pushed to v1.3.

The verification debt requirements (REQ-701..REQ-705) from v1.1 are also carried forward as deferred — they are not in scope for v1.2.

---

## v1.2 Active Requirements

### Database Schema (DB)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| DB-01 | Add `status` SingleSelect field (`pending`/`approved`/`rejected`) to NocoDB `trends` table | Critical | 07 |
| DB-02 | Default value for `status` is `pending` on all new and existing records | High | 07 |

### Backend API (BAPI)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| BAPI-01 | Add `status` field to `TrendItem` Pydantic model with `Optional[str]` type | Critical | 07 |
| BAPI-02 | Update `GET /api/trends` to accept `status` query param filter | High | 07 |
| BAPI-03 | Add `PATCH /api/trends/{id}` endpoint accepting partial field updates (status, title, category, etc.) | Critical | 07 |
| BAPI-04 | `PATCH /api/trends/{id}` validates that `status` value is one of `pending`/`approved`/`rejected` | High | 07 |
| BAPI-05 | Add `DELETE /api/trends/{id}` endpoint — hard delete from NocoDB | High | 07 |
| BAPI-06 | Add `PATCH /api/sources/{id}` endpoint — updates `enabled` field on `trend_sources` table | Critical | 07 |
| BAPI-07 | Update FastAPI CORS middleware to allow `http://localhost:5173` (Vite dev) and `CORS_ORIGINS` env var for production | Critical | 07 |

### Web Scaffold (WEB)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| WEB-01 | Create `web/` directory with Vite + React 18 + TypeScript scaffold | Critical | 08 |
| WEB-02 | Install and configure Tailwind CSS v3 (pinned, not v4) | Critical | 08 |
| WEB-03 | Initialize shadcn/ui with base components (Button, Table, Dialog, Select, Badge, Input, Checkbox, Toast) | High | 08 |
| WEB-04 | Install TanStack Query v5, React Hook Form, Zod, sonner, date-fns | High | 08 |
| WEB-05 | Create `web/src/api/` typed client module wrapping all FastAPI endpoints | Critical | 08 |
| WEB-06 | Typed API functions: `getTrends`, `getTrend`, `patchTrend`, `deleteTrend`, `getSources`, `patchSource` | High | 08 |
| WEB-07 | `VITE_API_URL` env var used as base URL in API client | High | 08 |
| WEB-08 | Vite dev proxy configured to forward `/api` to the repo default backend at `http://localhost:8080`, with `VITE_API_URL` available for non-default backends | High | 08 |
| WEB-09 | React Router v6 with routes: `/admin`, `/admin/login`, `/demo` | High | 08 |

### Admin Auth (AUTH)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| AUTH-01 | Admin panel checks `VITE_ADMIN_TOKEN` env var on load; token stored in `sessionStorage` after entry | Critical | 08 |
| AUTH-02 | Unauthenticated users are redirected to `/admin/login` by a route guard | High | 08 |
| AUTH-03 | Login page has a password input; on correct match, stores token and redirects to `/admin` | High | 08 |
| AUTH-04 | `VITE_ADMIN_TOKEN` is never committed — `.env.local` only; `.env.example` shows the key with placeholder | Critical | 08 |

### Admin Trends Panel (ADMIN)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| ADMIN-01 | Trends table page lists all trends with columns: title, platform, category, status, region, published_date, metric_value | Critical | 09 |
| ADMIN-02 | Trends table supports filtering by status, platform, category, region | High | 09 |
| ADMIN-03 | Trends table supports sorting by published_date and metric_value | Medium | 09 |
| ADMIN-04 | Each trend row has inline action buttons: Approve, Reject, Edit, Delete | Critical | 09 |
| ADMIN-05 | Approve/Reject actions call `PATCH /api/trends/{id}` and update the table optimistically | High | 09 |
| ADMIN-06 | Delete action shows a confirmation dialog before calling `DELETE /api/trends/{id}` | High | 09 |
| ADMIN-07 | Edit action opens a modal with editable fields: title, category, description, status | High | 09 |
| ADMIN-08 | Edit modal uses React Hook Form + Zod for validation | Medium | 09 |
| ADMIN-09 | Trends table supports multi-select checkboxes for bulk actions | Medium | 09 |
| ADMIN-10 | Bulk approve and bulk reject actions available when 2+ trends are selected | Medium | 09 |
| ADMIN-11 | Toast notification (sonner) shown on successful or failed PATCH/DELETE operations | High | 09 |
| ADMIN-12 | Trends table is paginated (server-side, using existing cursor pagination) | High | 09 |

### Admin Sources Panel (SRC)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| SRC-01 | Sources panel page lists all trend sources with columns: name, platform, enabled, last_fetched_at, last_fetch_status | High | 09 |
| SRC-02 | Each source row has a toggle switch that calls `PATCH /api/sources/{id}` to enable/disable | Critical | 09 |
| SRC-03 | Toggle reflects `enabled` state from API; optimistic update on click | High | 09 |
| SRC-04 | `last_fetch_status` displayed as a color-coded badge (success=green, error=red, unknown=gray) | Medium | 09 |

### Admin Categories Panel (CAT)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| CAT-01 | Categories panel shows distinct category values derived from live trend data | Low | 09 |
| CAT-02 | Fallback to hardcoded list `["gaming","music","entertainment"]` when no categories are found | Medium | 09 |
| CAT-03 | Each category shows a count of trends assigned to it | Low | 09 |

### Demo Feed (DEMO)

| ID | Description | Priority | Phase |
|----|-------------|----------|-------|
| DEMO-01 | Public `/demo` route requires no authentication | Critical | 10 |
| DEMO-02 | Demo feed only shows trends with `status=approved`; filter is sent at API level | Critical | 10 |
| DEMO-03 | Demo feed has filter controls: platform, category, region | High | 10 |
| DEMO-04 | Trend cards display: title, platform icon/label, category, metric_value, published_date (time-ago), thumbnail | High | 10 |
| DEMO-05 | Trend card links to source URL (opens in new tab) | High | 10 |
| DEMO-06 | Demo feed is paginated or infinite-scroll with a "Load more" button | Medium | 10 |
| DEMO-07 | Empty state shown when no approved trends match the selected filters | High | 10 |
| DEMO-08 | Arabic `ar_translation` shown below title when present and region is SA | Low | 10 |

---

## Traceability Summary

| Category | Total | Complete | Pending | Phase |
|----------|-------|----------|---------|-------|
| DB | 2 | 0 | 2 | 07 |
| BAPI | 7 | 0 | 7 | 07 |
| WEB | 9 | 0 | 9 | 08 |
| AUTH | 4 | 0 | 4 | 08 |
| ADMIN | 12 | 0 | 12 | 09 |
| SRC | 4 | 0 | 4 | 09 |
| CAT | 3 | 0 | 3 | 09 |
| DEMO | 8 | 0 | 8 | 10 |
| **Total** | **49** | **0** | **49** | |

---

*Active requirements baseline established: 2026-03-20*
