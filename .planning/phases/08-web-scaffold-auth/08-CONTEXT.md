# Phase 8: Web Scaffold + Auth - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Initialize `web/` with Vite + React 18 + TypeScript + shadcn/ui, install all runtime dependencies, create a typed API client wired to the FastAPI backend, set up React Router v6 routes, and implement the admin auth gate (sessionStorage token check + login page + route guard). No content panels, no trend data rendering — those are Phase 9. Demo feed page is a stub only — Phase 10 builds it.

</domain>

<decisions>
## Implementation Decisions

### API Client Transport
- **D-01:** Use native `fetch` — no axios. The admin tool's handful of endpoints don't need the overhead.
- **D-02:** Non-2xx responses throw JavaScript `Error` objects (with status and body attached). TanStack Query catches them in the `error` state automatically — idiomatic and no custom handling at call sites.
- **D-03:** All API functions accept `AbortSignal` (passed from TanStack Query's `queryFn` context). Enables automatic request cancellation on unmount and refetch.
- **D-04:** `client.ts` exports a single shared `apiRequest<T>(url, options?)` helper. `trends.ts` and `sources.ts` import it — one error-handling path, consistent behavior across all endpoints.

### Admin Shell Layout
- **D-05:** Left sidebar navigation. Admin content fills the right panel.
- **D-06:** Sidebar sections: **Trends**, **Sources**, **Categories**. Stub nav links in Phase 8 — Phase 9 fills them with real pages.
- **D-07:** Logout control in sidebar footer — clears sessionStorage token and redirects to `/admin/login`.
- **D-08:** Dark sidebar (slate-800 or slate-900), light main content area (white/gray-50). Standard admin tool aesthetic, consistent with shadcn/Tailwind conventions.

### Login Page
- **D-09:** Minimal branded card — centered card on a dark/neutral background, "Trenfy Admin" title, password-only input, sign-in button.
- **D-10:** Wrong password feedback: shake animation on the card (CSS animation). No static error text.
- **D-11:** Password field only — no username. Single shared secret via `VITE_ADMIN_TOKEN`.

### Agent's Discretion
- Exact shadcn component variants (card border radius, button variant, input size)
- Sidebar width and exact color tokens (slate-800 vs slate-900)
- TanStack Query client default stale time and retry count
- Animation keyframes for the login card shake

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 8 goal plus plans `08-01` through `08-03` with exact file paths, function names, and component names.
- `.planning/REQUIREMENTS.md` — WEB-01 through WEB-09 and AUTH-01 through AUTH-04 are the acceptance criteria for this phase.
- `.planning/PROJECT.md` — v1.2 milestone goals and constraints; no auth in v1 posture (public API, sessionStorage-only admin gate).

### Backend contract (TypeScript types must mirror these)
- `.planning/phases/07-backend-readiness/07-CONTEXT.md` — Mutation response shapes: PATCH returns updated object, DELETE returns `{id, deleted: true}`, errors are explicit JSON 400/404.
- `.planning/phases/04-api-infrastructure/04-CONTEXT.md` — Locked GET /api/trends response envelope and cursor pagination contract that TypeScript interfaces must reflect.
- `Trenfy.md` — NocoDB schema (TrendItem and TrendSource field names and types) — TypeScript interfaces in `api/types.ts` must mirror these.
- `trend_agents/shared/models.py` — Canonical Pydantic models for `TrendItem` and `TrendSource`; TypeScript interfaces are the frontend mirror.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `trend_agents/shared/models.py` — `TrendItem` and `TrendSource` Pydantic models define the field names and types that `web/src/api/types.ts` must mirror.
- `app.py` — FastAPI CORS config: `allow_credentials=False`, Vite dev origin `http://localhost:5173` whitelisted. API client must not send credentials.

### Established Patterns
- Backend returns explicit JSON error payloads for 400/404 — `apiRequest<T>` error throwing should preserve the JSON body for TanStack Query consumers.
- Cursor pagination is the only pagination contract (`GET /api/trends` uses cursor, not offset). TypeScript types must include cursor fields.
- CORS: no credentials — fetch calls must NOT include `credentials: 'include'`.

### Integration Points
- `web/src/api/client.ts` → reads `VITE_API_URL` from `import.meta.env`; falls back to Vite proxy `/api` path.
- `vite.config.ts` proxy: `/api` → `http://localhost:8000` (removes need for full URL in dev).
- `web/src/main.tsx` → registers `QueryClient`, `RouterProvider`, root routes.
- `web/src/components/auth/AdminGuard.tsx` → wraps `/admin` route; checks sessionStorage token; redirects to `/admin/login`.

</code_context>

<specifics>
## Specific Ideas

- Login page: "Trenfy Admin" title above the card. Dark background (not a full-screen image — just a neutral dark/charcoal background). Card stays compact and centered vertically.
- Sidebar: Trendy, Sources, Categories listed as nav links. Logo or "Trenfy" wordmark at sidebar top optional (agent discretion).
- Shake animation on login: standard "invalid input" pattern — quick horizontal shake, no delay, resolves immediately.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-web-scaffold-auth*
*Context gathered: 2026-03-21*
