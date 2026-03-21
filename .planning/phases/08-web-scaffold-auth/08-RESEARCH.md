# Phase 8: Web Scaffold + Auth — Research

**Phase:** 08-web-scaffold-auth
**Researched:** 2026-03-21
**Status:** Complete

---

## Summary

This phase bootstraps the `web/` directory from scratch. No existing frontend code. The backend is fully ready (Phase 7 verified), so the TypeScript interface shapes can be derived directly from the Pydantic models and confirmed API contracts. Research focuses on: correct tool versions and init sequences, TypeScript interface shapes, and auth gate architecture.

---

## Standard Stack

### Vite + React + TypeScript Scaffold

- **Init command:** `npm create vite@latest web -- --template react-ts`
- **Tailwind:** Must pin v3 explicitly — shadcn/ui is incompatible with Tailwind v4. Use `tailwindcss@^3 postcss autoprefixer`. Run `npx tailwindcss init -p` then configure `content` glob in `tailwind.config.js`.
- **shadcn/ui:** `npx shadcn-ui@latest init` — will ask about style (Default), base color (Slate), CSS variables (yes). Accept defaults.
- **shadcn component adds:** `npx shadcn-ui@latest add button table dialog select badge input checkbox sonner`
- **TanStack Query v5:** `@tanstack/react-query@^5` — v5 changed `useQuery` options (no `onSuccess`/`onError` callbacks on query; use `mutation` callbacks instead). `QueryClient` stale time default is 0 in v5.
- **React Router v6:** `react-router-dom@^6` — uses `createBrowserRouter` + `RouterProvider` pattern (not `<BrowserRouter>`).

### Key Package Versions

```
tailwindcss@^3  (NOT v4)
@tanstack/react-query@^5
react-router-dom@^6
react-hook-form@^7
zod@^3
@hookform/resolvers@^3
sonner@^1
date-fns@^3
```

---

## Architecture Patterns

### API Client (fetch, not axios)

Per D-01 (locked decision): native `fetch` only. Pattern:

```typescript
// web/src/api/client.ts
const BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function apiRequest<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = Object.assign(new Error(`API ${res.status}`), { status: res.status, body });
    throw err;
  }
  return res.json();
}
```

Key points (per D-02, D-03, D-04):
- Non-2xx throws Error with `.status` and `.body` attached
- All functions accept `signal?: AbortSignal` for TanStack Query cancellation
- No `credentials: 'include'` — CORS is `allow_credentials: false`

### TypeScript Interfaces (from backend Pydantic models)

Derived from `trend_agents/shared/models.py` and confirmed GET response envelope:

```typescript
// web/src/api/types.ts

export interface Trend {
  Id: number;                       // NocoDB row ID (integer)
  platform: string;                 // "youtube" | "x"
  category: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string | null;
  published_date: string;           // "YYYY-MM-DD"
  metric_type: string;              // "views" | "streams" | "players"
  metric_value: number;
  region_code: string;              // "US" | "SA" | "JP"
  metadata: Record<string, unknown>;
  content_hash: string;
  ar_translation: string | null;
  status: "pending" | "approved" | "rejected" | null;
  fetched_at?: string;              // DateTime ISO string
}

export interface PagingMeta {
  limit: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaginatedTrends {
  items: Trend[];
  paging: PagingMeta;
}

export interface TrendSource {
  id: string;                       // stable string ID e.g. "YOUTUBE_TRENDING_US"
  name: string;
  platform: string;
  endpoint: string;
  params: Record<string, unknown>;
  check_interval_minutes: number;
  enabled: boolean;
  last_fetched_at: string | null;
  last_fetch_status: string;        // "success" | "error" | ""
  min_metric_value: number;
  blocked_keywords: string[];
}

// Mutation payloads
export interface PatchTrendPayload {
  status?: "pending" | "approved" | "rejected";
  title?: string;
  category?: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  published_date?: string;
  metric_type?: string;
  metric_value?: number;
  region_code?: string;
  ar_translation?: string;
}

export interface PatchSourcePayload {
  enabled: boolean;
}

export interface DeleteTrendResponse {
  id: number;
  deleted: true;
}
```

### GET /api/trends Response Envelope

Confirmed from `api/routes/trends.py:157-163`:
```json
{
  "items": [...],
  "paging": {
    "limit": 50,
    "next_cursor": "base64string | null",
    "has_more": false
  }
}
```

Cursor pagination only — no offset. `next_cursor` is a base64-encoded JSON with offset and sort.

### Vite Proxy

`vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true }
  }
}
```
With proxy active, `VITE_API_URL` in `.env.local` can be empty string or omitted — `/api` prefix routes correctly.

### Auth Gate Architecture

Per D-11 (password-only), D-01 context (sessionStorage token), AUTH-01..04:

```typescript
// AdminGuard checks:
const storedToken = sessionStorage.getItem('admin_token');
const expectedToken = import.meta.env.VITE_ADMIN_TOKEN;
if (!storedToken || storedToken !== expectedToken) {
  return <Navigate to="/admin/login" replace />;
}
```

Login flow:
1. User types password into single input
2. Compare against `import.meta.env.VITE_ADMIN_TOKEN`
3. Match → `sessionStorage.setItem('admin_token', value)` → navigate to `/admin`
4. No match → shake animation (D-10)

**`VITE_ADMIN_TOKEN` security note:** env var is baked into the Vite bundle at build time. This is a lightweight admin-only tool — not production-grade auth, but satisfies AUTH-01..04 requirements.

### React Router v6 Setup

```typescript
// web/src/main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/admin/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminGuard><AdminLayout /></AdminGuard>,
    children: [
      { index: true, element: <AdminPage /> },
    ],
  },
  { path: '/demo', element: <DemoPage /> },
]);
```

---

## Don't Hand-Roll

- **Don't hand-roll CSS animations** — use Tailwind `animate-` utilities or define keyframes in `tailwind.config.js` `extend.keyframes`
- **Don't hand-roll fetch retry** — TanStack Query handles retries; set `retry: 1` on QueryClient for admin usage
- **Don't use axios** — locked to native fetch per D-01
- **Don't use offset pagination** — backend is cursor-only; no offset param
- **Don't include credentials in fetch** — CORS is `allow_credentials: false`; `credentials: 'include'` will cause CORS preflight failure

---

## Common Pitfalls

1. **Tailwind v4 incompatibility** — shadcn/ui requires v3. Installing without version pin gives v4. Always `tailwindcss@^3`.
2. **TanStack Query v5 API changes** — No `onSuccess`/`onError` in `useQuery`. Use `useMutation` for side effects. `QueryClient` constructor option is `defaultOptions.queries.staleTime`, not top-level `staleTime`.
3. **`VITE_ADMIN_TOKEN` in git** — Must go in `web/.env.local` (gitignored by Vite default). `.env.example` shows the key name only. Never commit actual token value.
4. **shadcn init asks interactive questions** — Use `--defaults` flag or pre-answer: style=default, baseColor=slate, cssVariables=yes, rsc=no.
5. **React Router v6 `<Navigate>` vs `navigate()`** — `AdminGuard` is a component, so use `<Navigate to="/admin/login" replace />` (not `useNavigate` hook called conditionally).
6. **`import.meta.env` types** — Add to `vite-env.d.ts`: `VITE_API_URL: string; VITE_ADMIN_TOKEN: string;` inside `ImportMetaEnv`.

---

## Validation Architecture

### Dimension 8 — What Should Be Tested

For Phase 8 (scaffold + types + auth):

| Area | Validation Approach |
|------|---------------------|
| Vite dev server starts | `npm run dev` exits without error within 10s |
| TypeScript compilation | `npm run build` exits 0 (no type errors) |
| API client shape | TypeScript types match backend Pydantic models — compile-time check via `tsc --noEmit` |
| Auth redirect | Navigate to `/admin` unauthenticated → URL is `/admin/login` |
| Auth success | Enter correct token → sessionStorage has `admin_token` → URL is `/admin` |
| Auth logout | Click logout → sessionStorage cleared → redirect to `/admin/login` |
| Vite proxy | `curl http://localhost:5173/api/trends` proxies to backend (manual smoke test) |

Primary validation: `npm run build` (TypeScript compiler). Secondary: browser smoke test for auth flow.

---

_Research complete: 2026-03-21_
