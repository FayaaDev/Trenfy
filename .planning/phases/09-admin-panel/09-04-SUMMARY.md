---
plan: 09-04
phase: 09-admin-panel
status: complete
completed: 2026-03-21
---

## Summary

Added multi-select checkboxes and bulk approve/reject action bar to TrendsPage.

## What Was Built

- `web/src/pages/admin/TrendsPage.tsx` — extended with:
  - `selectedIds: Set<number>` state and `isBulkPending` state
  - `allSelected` derived value for select-all toggle
  - `toggleSelectAll()` — selects all visible rows; deselects if all already selected
  - `toggleSelectOne(id)` — toggles individual row selection
  - `handleBulkAction(status)` — `Promise.all` parallel patchTrend calls; summary toast on success, error toast on failure; invalidates trends cache
  - Checkbox column in TableHeader (select-all) and each TableRow (per-row)
  - Bulk action bar visible when `selectedIds.size >= 2`, showing "Approve N" and "Reject N" buttons
  - Selection cleared on filter change, pagination, and sort

## Key Files

- `web/src/pages/admin/TrendsPage.tsx`

## Self-Check: PASSED

- [x] selectedIds is Set<number> state
- [x] isBulkPending guards bulk action buttons
- [x] Checkbox in TableHeader (select-all) and per row
- [x] Bulk action bar renders only when selectedIds.size >= 2
- [x] handleBulkAction uses Promise.all for parallel mutations
- [x] toast.success shows count, toast.error on failure
- [x] `npm run build --prefix web` exits 0
