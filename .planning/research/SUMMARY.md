# Research Summary: Trenfy v1.2 — Web Admin + Demo Feed

## Recommended Stack

**Frontend (web/)**
- **Vite + React 18 + TypeScript** — fast dev server, HMR, typed codebase
- **TanStack Query v5** — server-state management, caching, background refetch, optimistic updates
- **shadcn/ui + Tailwind CSS v3** — copy-paste component library on Radix primitives; Tailwind v3 required (shadcn incompatible with v4)
- **React Hook Form + Zod** — typed form validation; used for trend editing and source management
- **sonner** — toast notifications for PATCH/DELETE feedback
- **date-fns** — lightweight date formatting for `published_date`, `fetched_at`, `last_fetched_at`

**Backend additions (existing FastAPI)**
- `PATCH /api/trends/{id}` — status approve/reject, field edits
- `DELETE /api/trends/{id}` — hard delete from NocoDB
- `PATCH /api/sources/{id}` — toggle enabled/disabled
- `status` filter param on `GET /api/trends`
- CORS origins updated to include `http://localhost:5173` (Vite dev) and production domain

**NocoDB schema change**
- Add `status` SingleSelect field (`pending` / `approved` / `rejected`) to `trends` table (md3c6cy09fvz2jg)

---

## Table Stakes Features (v1.2 must-haves)

**Admin Panel**
- Password/token gate (env var `VITE_ADMIN_TOKEN`, checked at load, stored in `sessionStorage`)
- Trends table: list with filters (platform, category, status, region), sortable columns
- Per-trend actions: approve, reject, edit fields, delete
- Bulk approve/reject for pending trends
- Sources panel: list all sources with status chips; toggle enabled/disabled
- Category management: view distinct categories; rename/reassign content

**Demo Feed Page**
- Public-facing, no auth
- Displays only `status = approved` trends
- Filterable by platform, category, region
- Read-only trend cards linking to source URLs

---

## Architecture Overview

```
React Web App (web/)
    ├── /admin   → Auth-gated admin panel
    │     ├── TrendsTable (list, filter, bulk actions)
    │     ├── TrendEditModal (approve/reject/edit/delete)
    │     ├── SourcesPanel (list + toggle enabled)
    │     └── CategoriesPanel (view + reassign)
    └── /demo    → Public demo feed
          ├── DemoFeed (approved trends, filters)
          └── TrendCard (read-only, link to source URL)

FastAPI (existing)
    ├── GET /api/trends          ← add status filter param
    ├── PATCH /api/trends/{id}   ← NEW
    ├── DELETE /api/trends/{id}  ← NEW
    ├── PATCH /api/sources/{id}  ← NEW
    └── CORS update

NocoDB
    └── trends table: add `status` field (pending/approved/rejected)
```

The admin token is checked client-side only — not a security model for production, but sufficient for an internal dashboard. The `status` field in NocoDB is the authoritative approval state.

---

## Build Order (within v1.2)

1. **NocoDB `status` field** — add SingleSelect to trends table before any frontend work
2. **FastAPI CORS update** — add `http://localhost:5173` to allowed origins
3. **FastAPI new endpoints** — `PATCH /trends/{id}`, `DELETE /trends/{id}`, `PATCH /sources/{id}`; update `GET /trends` status filter
4. **Pydantic model update** — add `status` to `TrendItem`; update `TrendResponse`
5. **Vite + React scaffold** — `web/` directory, TypeScript config, Tailwind v3, shadcn init
6. **API layer** — `web/src/api/` typed client wrappers for all endpoints
7. **Admin auth gate** — token check at load, sessionStorage, redirect guard
8. **Trends table + filters** — TanStack Query, sortable table, status/platform/category filters
9. **Trend edit modal** — approve/reject/edit fields/delete with optimistic updates
10. **Bulk actions** — multi-select checkbox + bulk approve/reject
11. **Sources panel** — list sources, toggle enabled/disabled via PATCH
12. **Category management** — distinct category list, reassign modal
13. **Demo feed page** — public route, approved-only, filter bar, trend cards
14. **Build + deploy config** — `vite.config.ts` with API proxy for dev, `VITE_API_URL` for prod

---

## Top Risks

1. **CORS blocking React → FastAPI** — CORS middleware must be updated before any frontend API call; whitelist Vite dev origin (`http://localhost:5173`) and production domain explicitly.

2. **`status` field missing from Pydantic model** — If `status` is not added to `TrendItem` and `TrendResponse` simultaneously with NocoDB schema change, all `/api/trends` responses will silently omit the field.

3. **Admin token in git** — `VITE_ADMIN_TOKEN` must only live in `.env.local` (gitignored); `.env.example` must show the key with a placeholder value, never a real token.

4. **shadcn/ui + Tailwind v4 incompatibility** — shadcn requires Tailwind v3. Using `npm install tailwindcss` without pinning installs v4 by default. Must pin `tailwindcss@^3`.

5. **Empty category list** — On first load, if no trends exist yet, the category dropdown is empty. Must fall back to hardcoded defaults: `["gaming", "music", "entertainment"]`.

6. **Demo feed showing unapproved content** — The demo feed must always filter `status=approved` at the API level, not just client-side. If the filter is client-side only, a direct API call exposes unpublished content.

7. **Missing PATCH /sources endpoint** — Existing codebase only has `GET /api/sources`. The toggle feature in the admin panel requires `PATCH /api/sources/{id}` to be built before the frontend panel is implemented.

---

## Decisions Made by Research

These are settled. The roadmapper should treat them as fixed constraints.

| Decision | Verdict |
|---|---|
| Admin auth model | Client-side env var token (`VITE_ADMIN_TOKEN`) stored in `sessionStorage`; not a production security model |
| Web framework | Vite + React 18 + TypeScript |
| UI component library | shadcn/ui with Tailwind v3 (v4 incompatible) |
| State management | TanStack Query v5 for server state; no global state store needed |
| Category source | Derived from DB distinct values; hardcoded fallback `["gaming","music","entertainment"]` |
| Demo feed filtering | `status=approved` filter sent to API, not client-side only |
| Source enable/disable | `PATCH /api/sources/{id}` — must be added to FastAPI |
| `status` field values | `pending` / `approved` / `rejected` — SingleSelect in NocoDB |
| Project location | `web/` at project root |
| Mobile app (v1.2) | Deferred — not in this milestone |
