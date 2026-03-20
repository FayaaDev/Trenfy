# Stack Research

**Domain:** React admin panel + public demo feed over FastAPI/NocoDB
**Researched:** 2026-03-20
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 5.x | Build tool / dev server | Fastest HMR, zero-config for React, first-class TS support |
| React | 18.x | UI framework | Established, hooks-first, excellent ecosystem for admin tools |
| TypeScript | 5.x | Type safety | Prevents runtime errors from API shape mismatches |
| React Router | 6.x | Client-side routing | /admin (protected) + /demo (public) — config routing |
| TanStack Query | 5.x | Data fetching + cache | Mutations with cache invalidation, loading/error states built-in — essential for a data-heavy admin |
| Tailwind CSS | 3.x | Utility-first styling | No CSS files to maintain, consistent spacing/colors |
| shadcn/ui | latest | Accessible component primitives | Built on Radix UI, copy-paste into project (no peer dep hell), gives Table, Dialog, Dropdown, Badge, Button, Select out of the box |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | 7.x | Form state + validation | Inline edit forms, modal edit forms — avoids re-render on every keystroke |
| Zod | 3.x | Schema validation | Validate form data before PATCH requests |
| clsx / tailwind-merge | latest | Class name merging | Used internally by shadcn; needed for conditional Tailwind classes |
| date-fns | 3.x | Date formatting | Format fetched_at, published_date in the content table |
| sonner | latest | Toast notifications | Lightweight, shadcn-compatible — feedback after approve/delete/edit |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + typescript-eslint | Lint | Catches misused hooks and TS issues |
| Prettier | Format | Consistent code style |

## Installation

```bash
# Scaffold
npm create vite@latest web -- --template react-ts

# Core
npm install react-router-dom @tanstack/react-query

# UI
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init

# Form validation
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install date-fns sonner clsx tailwind-merge

# Dev
npm install -D typescript @types/react @types/react-dom eslint prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| TanStack Query | SWR | SWR is fine too, but TanStack Query's mutation API + optimistic updates are better for admin write flows |
| shadcn/ui | Ant Design / MUI | Use if the team prefers an opinionated full component library; overkill for a solo admin tool |
| Tailwind | CSS Modules | CSS Modules are fine but slower to iterate for admin UIs |
| Vite | Next.js | Use Next.js only if you want SSR or API routes; not needed here, admin is SPA |
| React Hook Form | Formik | RHF has better TS support and smaller bundle |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App | Deprecated, webpack-based, slow | Vite |
| Redux / Zustand for server state | Unnecessary with TanStack Query | TanStack Query handles all server state |
| Axios | Unnecessary dependency; fetch is sufficient | Native fetch (wrapped in small client) |
| Full auth library (Auth0, Clerk) | Massive overkill for a single admin token check | sessionStorage + env var token |

## Stack Patterns by Variant

**For the admin page (protected):**
- Token check on mount → redirect to /login if missing
- All data via TanStack Query hooks
- Mutations invalidate relevant query keys on success

**For the demo page (public):**
- No auth
- Read-only: GET /api/trends?status=approved
- Minimal dependencies — just fetch + React state is fine here

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 18 | React Router 6 | RR6 is hooks-based, requires React 16.8+ |
| TanStack Query 5 | React 18 | TQ5 requires React 18 (uses useSyncExternalStore) |
| shadcn/ui | Tailwind 3 | shadcn does NOT yet support Tailwind v4 in stable release — use Tailwind 3 |

## Sources

- Vite docs (vitejs.dev) — scaffold, env vars, build config
- TanStack Query v5 docs (tanstack.com) — mutation + invalidation patterns
- shadcn/ui docs (ui.shadcn.com) — component list, install, Tailwind v3 requirement
- React Router 6 docs — loader/action vs hooks approach

---
*Stack research for: Trenfy v1.2 React admin panel over FastAPI/NocoDB*
*Researched: 2026-03-20*
