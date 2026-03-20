# Architecture Research

**Domain:** React admin panel + demo feed over existing FastAPI/NocoDB
**Researched:** 2026-03-20
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                       │
├───────────────────────────┬──────────────────────────────────┤
│    /admin (protected)     │     /demo (public)               │
│  ┌───────────────────┐    │  ┌──────────────────────┐        │
│  │  ContentTable     │    │  │  DemoFeed            │        │
│  │  CategoryPanel    │    │  │  (approved only)     │        │
│  │  SourcesPanel     │    │  └──────────────────────┘        │
│  │  APIControlPanel  │    │                                  │
│  └───────────────────┘    │                                  │
├───────────────────────────┴──────────────────────────────────┤
│                  TanStack Query (cache + mutations)            │
├──────────────────────────────────────────────────────────────┤
│                   API Client (src/api/)                        │
│  trendsApi  sourcesApi  categoriesApi  healthApi              │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP (CORS)
┌──────────────────────────▼───────────────────────────────────┐
│                  FastAPI (localhost:8000)                      │
│  GET/PATCH/DELETE /api/trends   GET/PATCH /api/sources        │
│  GET /api/trends/stats          GET /health                   │
│  POST /api/trends/refresh       GET /api/trends/mockup        │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                  NocoDB (localhost:8080)                       │
│  Trenfy table (+ new status field)   trend_sources table      │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| AdminPage | Layout + route protection (token check) | Wrapper that renders children only if token is valid |
| ContentTable | Paginated list, filters, per-row actions | shadcn Table + TanStack Query + filter state |
| CategoryPanel | List categories + item counts, move content | Derived from GET /api/trends distinct categories |
| SourcesPanel | View sources, toggle enabled | shadcn Table + PATCH mutation |
| APIControlPanel | Buttons per endpoint, response display | Button → mutation/query → expandable pre-JSON |
| DemoFeed | Public grid of approved trends | GET /api/trends?status=approved, card grid |
| api/ | Typed fetch wrappers | One file per resource (trends.ts, sources.ts, health.ts) |

## Recommended Project Structure

```
web/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts          # base fetch with base URL + token header
│   │   ├── trends.ts          # getTrends, getTrend, patchTrend, deleteTrend
│   │   ├── sources.ts         # getSources, patchSource
│   │   ├── health.ts          # getHealth, getIntegrations, getStats, triggerRefresh, getMockup
│   │   └── categories.ts      # getCategories (distinct values from trends)
│   ├── components/
│   │   ├── admin/
│   │   │   ├── ContentTable.tsx
│   │   │   ├── ContentEditModal.tsx
│   │   │   ├── CategoryPanel.tsx
│   │   │   ├── SourcesPanel.tsx
│   │   │   └── APIControlPanel.tsx
│   │   ├── demo/
│   │   │   └── TrendCard.tsx
│   │   └── ui/                # shadcn generated components live here
│   ├── hooks/
│   │   ├── useTrends.ts       # TanStack Query hooks for trends
│   │   ├── useSources.ts      # TanStack Query hooks for sources
│   │   └── useAuth.ts         # simple token check from sessionStorage
│   ├── pages/
│   │   ├── AdminPage.tsx      # protected wrapper
│   │   ├── LoginPage.tsx      # token entry form (one field)
│   │   └── DemoPage.tsx       # public feed
│   ├── lib/
│   │   ├── config.ts          # VITE_API_URL, VITE_ADMIN_TOKEN
│   │   └── utils.ts           # cn() from shadcn, date formatters
│   ├── App.tsx                # React Router routes
│   ├── main.tsx
│   └── index.css              # Tailwind directives
├── .env.local                 # VITE_API_URL=http://localhost:8000
│                              # VITE_ADMIN_TOKEN=<secret> (never committed)
├── .env.example               # Same keys, empty values (committed to git)
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## Architectural Patterns

### Pattern 1: Token Guard on Admin Route

**What:** Check sessionStorage for token on AdminPage mount. Redirect to /login if missing or invalid.
**When to use:** Always — admin page must never render without auth check.
**Trade-offs:** Token is client-side (can be inspected by devtools), but for a local/single-admin tool this is acceptable.

**Example:**
```tsx
// hooks/useAuth.ts
export function useAuth() {
  const stored = sessionStorage.getItem('admin_token')
  const expected = import.meta.env.VITE_ADMIN_TOKEN
  return { isAuthenticated: stored === expected }
}
```

### Pattern 2: Mutation + Cache Invalidation

**What:** After any write (PATCH status, DELETE, edit), invalidate the relevant TanStack Query key so the list re-fetches.
**When to use:** All mutations.
**Trade-offs:** Causes a refetch on every action (acceptable; list is small).

```tsx
const mutation = useMutation({
  mutationFn: (data) => patchTrend(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trends'] })
    toast.success('Updated')
  }
})
```

### Pattern 3: Status Field Default

**What:** All existing trends in NocoDB have no status value. New status field defaults to 'pending'.
**Trade-offs:** Admin must review all existing content. Alternative default='approved' skips the review backlog.

## Integration Points — FastAPI Changes Required

| Change | Why | Notes |
|--------|-----|-------|
| Add CORSMiddleware | React dev server (localhost:5173) will be blocked without it | `allow_origins` from env var |
| Add PATCH /api/trends/{id} | Update status, title, description, category, ar_translation | Accept partial update body |
| Add DELETE /api/trends/{id} | Admin needs to remove content | |
| Add PATCH /api/sources/{id} | Toggle enabled on sources | Only `enabled` field needed |
| Add status filter to GET /api/trends | Demo feed needs ?status=approved | Add to existing query params |
| Add `status` to Pydantic Trend model | Python model needs the new field | Default='pending' |

### NocoDB Schema Change

| Change | How | Risk |
|--------|-----|------|
| Add `status` SingleSelect field to Trenfy table | Via NocoDB UI or NocoDB API | Low — additive; existing rows get NULL, treated as pending |

## Data Flow

### Approve Action
```
Admin clicks "Approve"
  → useMutation(patchTrend(id, {status:'approved'}))
  → PATCH /api/trends/{id} {status: 'approved'}
  → FastAPI → updates NocoDB row
  → onSuccess: invalidateQueries(['trends'])
  → ContentTable re-renders with approved badge
```

### Demo Feed
```
User opens /demo
  → useQuery(getTrends({status:'approved'}))
  → GET /api/trends?status=approved
  → FastAPI → NocoDB filter where status='approved'
  → DemoPage renders TrendCard grid
```

## Sources

- FastAPI CORS docs — add_middleware(CORSMiddleware)
- TanStack Query v5 docs — mutations, invalidateQueries
- Vite env variables docs — VITE_ prefix required for client-side exposure
- shadcn/ui docs — component installation

---
*Architecture research for: Trenfy v1.2 React admin + demo*
*Researched: 2026-03-20*
