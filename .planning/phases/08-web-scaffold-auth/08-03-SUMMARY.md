# Phase 08-03 SUMMARY: Auth Gate + React Router

## What Was Built

Implemented the React Router v6 route structure, `AdminGuard` session-storage auth gate, login page with shake animation, admin shell layout, and stub pages.

## Artifacts Created

| File | Purpose |
|------|---------|
| `web/src/main.tsx` | App entry: createBrowserRouter + QueryClientProvider |
| `web/src/components/auth/AdminGuard.tsx` | Route guard — checks sessionStorage vs VITE_ADMIN_TOKEN |
| `web/src/pages/admin/LoginPage.tsx` | Password-only login with shake animation on wrong password |
| `web/src/components/layout/AdminLayout.tsx` | Dark sidebar (slate-900) + light main content shell |
| `web/src/pages/admin/AdminPage.tsx` | Stub admin landing page |
| `web/src/pages/demo/DemoPage.tsx` | Stub public demo feed page |

## Route Structure

```
/              → redirect to /admin
/admin/login   → LoginPage (public)
/admin         → AdminGuard → AdminLayout → AdminPage (index)
/demo          → DemoPage (public)
```

## Auth Flow

1. `AdminGuard` reads `sessionStorage.getItem('admin_token')`
2. Compares against `import.meta.env.VITE_ADMIN_TOKEN`
3. Mismatch → `<Navigate to="/admin/login" replace />`
4. Login: correct password → `sessionStorage.setItem` + navigate to `/admin`
5. Wrong password → shake animation (no error text, per D-10)
6. Logout → `sessionStorage.removeItem` + navigate to `/admin/login`

## Key Design Points (per CONTEXT.md decisions)

- **D-05**: Left sidebar navigation
- **D-06**: Sidebar sections: Trends, Sources, Categories
- **D-07**: Logout button in sidebar footer
- **D-08**: Dark sidebar `bg-slate-900`, light main `bg-gray-50`
- **D-09**: Login card centered on dark `bg-slate-900` background
- **D-10**: Shake animation only — no static error text
- **D-11**: Password-only input (no username)

## Verification

- `npm run build --prefix web` exits 0 ✓
- AdminGuard redirects when sessionStorage doesn't match ✓
- Login shake animation via `.animate-shake` class (defined in index.css) ✓
- No error text in LoginPage ✓
- Logout clears sessionStorage ✓
- `.env.example` has `VITE_ADMIN_TOKEN=` (key only) ✓

## Requirements Satisfied

WEB-09 (React Router routes), AUTH-01 (AdminGuard), AUTH-02 (login page), AUTH-03 (session auth), AUTH-04 (logout)
