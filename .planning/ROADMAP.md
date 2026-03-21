# Roadmap: v1.2 — Web Admin + Demo Feed

**Milestone goal:** Build a React web admin panel (status moderation, source management) and a public demo feed page, on top of the existing FastAPI + NocoDB backend.

**Phase numbering:** Continues from v1.1 Phase 6. v1.2 starts at Phase 7.

**Stack:** Vite + React 18 + TypeScript + shadcn/ui + TanStack Query v5 + Tailwind v4

---

## Phase 7 — Backend Readiness

**Goal:** FastAPI and NocoDB are fully ready for web frontend. CORS is open to Vite dev, `status` field exists in NocoDB and Pydantic models, and three new endpoints are live.

**Requirements covered:** DB-01, DB-02, BAPI-01, BAPI-02, BAPI-03, BAPI-04, BAPI-05, BAPI-06, BAPI-07

**Plans:**

### 07-01: NocoDB Status Field

**Goal:** `status` SingleSelect field exists in NocoDB `trends` table with values `pending`/`approved`/`rejected`; default is `pending`.

Tasks:
- Add `status` SingleSelect field to NocoDB `trends` table via NocoDB UI or API
- Set default value to `pending`
- Verify existing records show `status = null` or `pending` (acceptable either way)

**Satisfies:** DB-01, DB-02

---

### 07-02: Pydantic Model + GET Filter Update

**Goal:** `TrendItem` includes `status: Optional[str]`, and `GET /api/trends` accepts `?status=pending|approved|rejected`.

Tasks:
- Add `status: Optional[str] = None` to `TrendItem` in `trend_agents/shared/models.py`
- Update `TrendResponse` if it wraps `TrendItem` fields
- Add `status` query param to `GET /api/trends` handler in `app.py`
- Pass `status` to NocoDB filter when set
- Smoke test: `GET /api/trends?status=pending` returns only pending records

**Satisfies:** BAPI-01, BAPI-02

---

### 07-03: PATCH + DELETE Trends Endpoints

**Goal:** Admin panel can approve, reject, edit, and delete trends via REST.

Tasks:
- Add `PATCH /api/trends/{id}` to `app.py` accepting `PatchTrendRequest` (Pydantic partial model)
- Validate `status` value is one of `pending`/`approved`/`rejected` when present
- Call NocoDB update via existing client
- Add `DELETE /api/trends/{id}` to `app.py`
- Call NocoDB delete via existing client
- Smoke test both endpoints manually

**Satisfies:** BAPI-03, BAPI-04, BAPI-05

---

### 07-04: PATCH Sources + CORS Update

**Goal:** Admin panel can toggle sources; React dev server can reach FastAPI.

Tasks:
- Add `PATCH /api/sources/{id}` to `app.py` accepting `{"enabled": bool}`
- Call NocoDB update on `trend_sources` table
- Update CORS middleware: add `http://localhost:5173` and `CORS_ORIGINS` env var support (comma-separated)
- Add `CORS_ORIGINS` to `.env.example`
- Smoke test: `OPTIONS http://localhost:8080/api/trends` from Vite origin succeeds

**Satisfies:** BAPI-06, BAPI-07

---

## Phase 8 — Web Scaffold + Auth

**Goal:** `web/` directory is initialized with Vite + React + TS + shadcn/ui. API client is typed and wired to the backend. Admin auth gate is functional.

**Requirements covered:** WEB-01 through WEB-09, AUTH-01 through AUTH-04

**Plans:** 3 plans (all complete)

Plans:
- [x] 08-01-PLAN.md — Vite + React + TS scaffold, Tailwind v4, shadcn/ui, runtime deps
- [x] 08-02-PLAN.md — Typed API client layer (types.ts, client.ts, trends.ts, sources.ts, Vite proxy)
- [x] 08-03-PLAN.md — React Router v6 routes, AdminGuard, LoginPage, AdminLayout, stub pages

### 08-01: Vite + React Scaffold

**Goal:** `web/` compiles and dev server starts cleanly.

Tasks:
- `npm create vite@latest web -- --template react-ts` at project root
- Install `tailwindcss@^3 postcss autoprefixer` (pin v3, not v4)
- Run `npx tailwindcss init -p`; configure `content` globs
- Initialize shadcn/ui: `npx shadcn-ui@latest init`
- Install core shadcn components: Button, Table, Dialog, Select, Badge, Input, Checkbox, Sonner
- Install runtime deps: `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner`, `date-fns`, `react-router-dom`
- Verify `npm run dev` starts without errors

**Satisfies:** WEB-01, WEB-02, WEB-03, WEB-04

---

### 08-02: API Client Layer

**Goal:** All FastAPI endpoints have typed TypeScript wrappers used throughout the app.

Tasks:
- Create `web/src/api/client.ts` — base fetch/axios instance reading `VITE_API_URL`
- Create `web/src/api/trends.ts` — `getTrends(params)`, `getTrend(id)`, `patchTrend(id, data)`, `deleteTrend(id)`
- Create `web/src/api/sources.ts` — `getSources()`, `patchSource(id, data)`
- Create `web/src/api/types.ts` — TypeScript interfaces matching backend Pydantic models (Trend, Source, PaginatedTrends)
- Configure `vite.config.ts` proxy: `/api` → `http://localhost:8080`
- Add `VITE_API_URL` to `web/.env.example` and `web/.env.local.example` for non-default backend URLs

**Satisfies:** WEB-05, WEB-06, WEB-07, WEB-08

---

### 08-03: Routing + Auth Gate

**Goal:** React Router routes are set up; unauthenticated admin access redirects to login.

Tasks:
- Set up React Router v6 in `web/src/main.tsx`: routes `/admin`, `/admin/login`, `/demo`
- Create `web/src/components/auth/AdminGuard.tsx` — checks `sessionStorage` token vs `VITE_ADMIN_TOKEN`
- Create `web/src/pages/admin/LoginPage.tsx` — password input, on match writes to sessionStorage
- Wrap `/admin` route with `AdminGuard`
- Create stub `AdminPage` and `DemoPage` placeholders (renders "coming soon")
- Add `VITE_ADMIN_TOKEN` to `web/.env.example` (placeholder value only)
- Verify redirect works: visiting `/admin` unauthenticated → `/admin/login`

**Satisfies:** WEB-09, AUTH-01, AUTH-02, AUTH-03, AUTH-04

---

## Phase 9 — Admin Panel

**Goal:** Authenticated admin can list, filter, approve, reject, edit, delete trends; toggle sources; and view categories.

**Requirements covered:** ADMIN-01 through ADMIN-12, SRC-01 through SRC-04, CAT-01 through CAT-03

**Plans:** 7 plans

Plans:
- [x] 09-01-PLAN.md — Trends table with filters, pagination, sort (TrendsPage + route wiring)
- [x] 09-02-PLAN.md — Trend actions: Approve/Reject/Delete with optimistic updates + toasts
- [x] 09-03-PLAN.md — Trend edit modal (TrendEditModal, RHF + Zod validation)
- [x] 09-04-PLAN.md — Bulk actions: checkbox multi-select + parallel Approve/Reject
- [x] 09-05-PLAN.md — Sources panel: toggle enable/disable with optimistic patchSource
- [x] 09-06-PLAN.md — Categories panel: distinct categories + counts from live data
- [x] 09-07-PLAN.md — Align local Vite proxy/UAT docs with backend default port `8080`

### 09-01: Trends Table + Filters

**Goal:** Admin trends page loads paginated trend list with filters and column sorting.

Tasks:
- Create `web/src/pages/admin/TrendsPage.tsx`
- Use TanStack Query `useQuery` with `getTrends(params)` for data fetching
- Render shadcn Table with columns: title, platform, category, status (Badge), region, published_date (date-fns), metric_value
- Add filter controls: status Select, platform Select, category Select, region Select
- Wire filters to query params; table refetches on filter change
- Implement server-side pagination with cursor (Next/Prev buttons)
- Add sort controls on `published_date` and `metric_value` columns

**Satisfies:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-12

---

### 09-02: Trend Actions (Approve / Reject / Delete)

**Goal:** Each trend row has working inline action buttons; confirmations shown before destructive ops.

Tasks:
- Add Approve/Reject buttons per row — call `patchTrend(id, {status})` via TanStack Query mutation
- Optimistic update: update row status in cache immediately; rollback on error
- Add Delete button per row — opens shadcn AlertDialog confirmation before `deleteTrend(id)`
- Remove deleted row from cache optimistically
- Show sonner toast on success and error for all mutations

**Satisfies:** ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-11

---

### 09-03: Trend Edit Modal

**Goal:** Admin can open an edit modal to update title, category, description, and status.

Tasks:
- Create `web/src/components/admin/TrendEditModal.tsx` — shadcn Dialog
- Form fields: title (Input), category (Select + free text), description (Textarea), status (Select)
- React Hook Form + Zod schema for validation
- On submit: call `patchTrend(id, data)` mutation; close modal on success
- Invalidate trends query after successful save
- Show validation errors inline; show toast on API error

**Satisfies:** ADMIN-07, ADMIN-08

---

### 09-04: Bulk Actions

**Goal:** Admin can select multiple trends and bulk-approve or bulk-reject.

Tasks:
- Add checkbox column to trends table
- Track selected row IDs in local state
- Show bulk action bar when 2+ rows selected: "Approve N" and "Reject N" buttons
- On bulk action: fire `patchTrend` for each ID (parallel `Promise.all` mutations)
- Clear selection and invalidate query on completion
- Show summary toast: "Approved 5 trends"

**Satisfies:** ADMIN-09, ADMIN-10

---

### 09-05: Sources Panel

**Goal:** Admin can view all sources and toggle enabled/disabled.

Tasks:
- Create `web/src/pages/admin/SourcesPage.tsx`
- Use TanStack Query `useQuery` with `getSources()` for data
- Render table with columns: name, platform, enabled (Toggle switch), last_fetched_at, last_fetch_status (Badge)
- `last_fetch_status` badge colors: success=green, error=red, others=gray
- Toggle switch calls `patchSource(id, {enabled})` mutation; optimistic update
- Show sonner toast on success/error

**Satisfies:** SRC-01, SRC-02, SRC-03, SRC-04

---

### 09-06: Categories Panel

**Goal:** Admin can see distinct categories with trend counts; no-trends fallback uses defaults.

Tasks:
- Create `web/src/pages/admin/CategoriesPage.tsx`
- Fetch distinct categories by calling `getTrends` with `pageSize=1000` and extracting unique `category` values (or add a dedicated endpoint if needed)
- Fallback to `["gaming", "music", "entertainment"]` if result is empty
- Display each category with a count of trends
- (v1.2 scope: read-only view; reassign modal is deferred to v1.3)

**Satisfies:** CAT-01, CAT-02, CAT-03

---

## Phase 10 — Demo Feed

**Goal:** Public `/demo` route shows approved trends with filter controls. No auth required.

**Requirements covered:** DEMO-01 through DEMO-08

**Plans:** 2 plans (planned)

Plans:
- [ ] 10-01-PLAN.md — Demo Feed Page
- [ ] 10-02-PLAN.md — Trend Card Component

### 10-01: Demo Feed Page

**Goal:** Public demo feed loads approved trends and displays filter controls and trend cards.

Tasks:
- Create `web/src/pages/demo/DemoPage.tsx`
- Query `getTrends({status: "approved", ...filters})`; status filter always set server-side
- Implement filter bar: platform Select, category Select, region Select
- Render grid/list of trend cards
- Implement "Load more" pagination button (append next page to list)
- Show empty state component when no results

**Satisfies:** DEMO-01, DEMO-02, DEMO-03, DEMO-06, DEMO-07

---

### 10-02: Trend Card Component

**Goal:** Trend cards are readable and link to source URLs.

Tasks:
- Create `web/src/components/demo/TrendCard.tsx`
- Display: thumbnail (with fallback), title, platform badge, category, metric_value (formatted), published_date (time-ago with date-fns)
- Show `ar_translation` below title when present (SA region context)
- "Open source" link opens `url` in new tab
- Responsive card layout (works on mobile viewport too)

**Satisfies:** DEMO-04, DEMO-05, DEMO-08

---

## Phase Summary

| Phase | Goal | Requirements | Status |
|-------|------|-------------|--------|
| 07 | Backend readiness — CORS, status field, PATCH/DELETE endpoints | DB-01..02, BAPI-01..07 | complete |
| 08 | Web scaffold, API client, auth gate | WEB-01..09, AUTH-01..04 | complete |
| 09 | Admin panel + local proxy contract alignment | ADMIN-01..12, SRC-01..04, CAT-01..03, WEB-08 | complete |
| 10 | Demo feed page | DEMO-01..08 | planned |
| **Total** | | **49 requirements** | **9/10 phases done** |

---

*Roadmap created: 2026-03-20*
*Milestone: v1.2 Web Admin + Demo Feed*
