---
phase: quick-260321-bw2-phase-09-admin-ui-fixes-populate-title-a
plan: 01
subsystem: web-admin
tags: [quick-task, admin-ui, trends]
requires: [ADMIN-07, ADMIN-08]
provides: [hydrated-trend-edit-modal, editable-ar-translation]
affects: [web/src/components/admin/TrendEditModal.tsx, web/src/pages/admin/TrendsPage.tsx]
tech_stack:
  added: []
  patterns: [react-hook-form reset hydration, existing react-query patch mutation]
key_files:
  created: []
  modified:
    - web/src/components/admin/TrendEditModal.tsx
    - web/src/pages/admin/TrendsPage.tsx
decisions:
  - Reused the selected table row as the only modal data source and reset the form from that object on every open/close cycle.
  - Kept Arabic translation edits inside the existing PATCH mutation instead of adding a new API path or fetch-by-id layer.
metrics:
  duration: 11 min
  completed: 2026-03-21
---

# Phase quick-260321-bw2 Plan 01: Admin UI Fixes Populate Title A Summary

Edit modal hydration now comes directly from the selected trend row, and admins can edit Arabic translation in the same save flow as title/category/description/status.

## What Changed

- `web/src/pages/admin/TrendsPage.tsx`
  - Added a stable modal `key` from `editTarget?.Id` so switching rows remounts the dialog state cleanly.
- `web/src/components/admin/TrendEditModal.tsx`
  - Reset all editable fields from the incoming `trend` object, including clearing values when the modal closes.
  - Added `ar_translation` to the Zod form schema, default values, reset hydration, and submit payload.
  - Added an Arabic translation textarea to the modal UI.

## Verification

- `npm run build --prefix web`
- Verified task commits exist: `0b3ef70`, `2a53c06`

## Task Commits

- `0b3ef70` `fix(quick-260321-bw2-phase-09-admin-ui-fixes-populate-title-a-01): hydrate trend edit modal state`
- `2a53c06` `feat(quick-260321-bw2-phase-09-admin-ui-fixes-populate-title-a-01): add admin arabic translation editing`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- Found `web/src/components/admin/TrendEditModal.tsx`
- Found `web/src/pages/admin/TrendsPage.tsx`
- Found commit `0b3ef70`
- Found commit `2a53c06`
