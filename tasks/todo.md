# Admin Dropdown Styling

- [x] Inspect admin select/dropdown usage and confirm the remaining light menus live in `TrendsPage`
- [x] Reuse the shared dark admin select styles for page-level admin dropdown triggers and popups
- [x] Verify the affected files with targeted linting and a frontend build

## Review

- Extended the shared admin dark style module with page-level select trigger/content classes so admin filters and dialog selects share the same slate palette.
- Applied the dark trigger and popup styling to every filter dropdown on `web/src/pages/admin/TrendsPage.tsx`.
- Verification: targeted `npx eslint src/pages/admin/TrendsPage.tsx src/components/admin/adminDialogStyles.ts` passed.
- Verification: `npm run build` passed; Vite still reports the existing chunk-size warning only.
