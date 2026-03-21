---
plan: 09-05
phase: 09-admin-panel
status: complete
completed: 2026-03-21
---

## Summary

Built the Sources admin page at `/admin/sources` — table of trend sources with toggle to enable/disable each source.

## What Was Built

- `web/src/components/admin/SourceToggle.tsx` — toggle switch using `@base-ui/react/switch` with optimistic state
- `web/src/pages/admin/SourcesPage.tsx` — table with name, platform, enabled toggle, last fetched, status badge
- Optimistic `patchSource` mutation with rollback on error, toast notifications via sonner
- `StatusBadge` helper: green for success, destructive for error, secondary for unknown
- `formatDistanceToNow` relative time for `last_fetched_at`, "Never" when null
- `web/src/main.tsx` — `/admin/sources` route wired to SourcesPage

## Key Files

- `web/src/components/admin/SourceToggle.tsx`
- `web/src/pages/admin/SourcesPage.tsx`
- `web/src/main.tsx`

## Self-Check: PASSED

- [x] SourceToggle uses `@base-ui/react/switch`
- [x] SourcesPage exports `SourcesPage` function
- [x] useQuery calls getSources; useMutation calls patchSource
- [x] onMutate implements optimistic update pattern with rollback
- [x] Route `{ path: 'sources', element: <SourcesPage /> }` wired in main.tsx
- [x] `npm run build --prefix web` exits 0
