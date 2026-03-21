# Phase 8: Web Scaffold + Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-21
**Phase:** 08-web-scaffold-auth
**Areas discussed:** API client transport, Admin shell layout, Login page presentation

---

## API Client Transport

| Option | Description | Selected |
|--------|-------------|----------|
| Native fetch wrapper | Thin wrapper around browser fetch, no extra dep, sufficient for a small admin tool. Throw errors on non-2xx. | ✓ |
| Axios | Axios instance with baseURL and interceptors. Adds ~14KB gzipped. | |
| Agent's discretion | Agent picks based on codebase patterns | |

**User's choice:** Native fetch wrapper
**Notes:** Error handling via thrown JavaScript errors (TanStack Query idiomatic). AbortSignal support for automatic cancellation. Single shared `apiRequest<T>()` helper in `client.ts` — `trends.ts` and `sources.ts` import it.

---

## Admin Shell Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar navigation | Left sidebar with nav links; admin content in right panel | ✓ |
| Top navigation bar | Horizontal tabs or links at top | |
| No nav yet | Bare content area; add nav in Phase 9 | |

**User's choice:** Sidebar navigation
**Notes:** Sections: Trends, Sources, Categories. Logout control in sidebar footer. Dark sidebar (slate-800/900), light main content area.

---

## Login Page Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal branded card | Centered card on dark background, "Trenfy Admin" title, password input, sign-in button | ✓ |
| Styled/branded page | Full-page gradient or styled layout with Trenfy identity | |
| Bare functional | No visual treatment, plain form | |

**User's choice:** Minimal branded card
**Notes:** Wrong password: shake animation on card (not static error text). Password field only — no username field. Single shared secret via `VITE_ADMIN_TOKEN`.

---

## Agent's Discretion

- Exact shadcn component variants and color tokens
- Sidebar width and logo/wordmark at top
- TanStack Query client default stale time and retry count
- Animation keyframes for login card shake

## Deferred Ideas

None during this discussion.
