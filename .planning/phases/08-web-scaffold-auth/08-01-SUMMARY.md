# Phase 08-01 SUMMARY: Vite + React + TS Scaffold

## What Was Built

Bootstrapped the `web/` directory from scratch with a production-ready frontend stack.

## Artifacts Created

| File | Purpose |
|------|---------|
| `web/package.json` | All deps declared |
| `web/vite.config.ts` | Vite config with `@tailwindcss/vite` plugin and `@` path alias |
| `web/tsconfig.app.json` | TS config with `@/*` → `./src/*` path alias |
| `web/tsconfig.json` | Root tsconfig with paths for shadcn compat |
| `web/src/index.css` | Tailwind v4 imports + shadcn theme CSS variables + shake animation |
| `web/components.json` | shadcn/ui config (style: base-nova, baseColor: neutral) |
| `web/src/components/ui/button.tsx` | shadcn Button |
| `web/src/components/ui/table.tsx` | shadcn Table |
| `web/src/components/ui/dialog.tsx` | shadcn Dialog |
| `web/src/components/ui/select.tsx` | shadcn Select |
| `web/src/components/ui/badge.tsx` | shadcn Badge |
| `web/src/components/ui/input.tsx` | shadcn Input |
| `web/src/components/ui/checkbox.tsx` | shadcn Checkbox |
| `web/src/components/ui/sonner.tsx` | shadcn Sonner toasts |
| `web/src/vite-env.d.ts` | `VITE_API_URL` and `VITE_ADMIN_TOKEN` typed |
| `web/.env.example` | Documents both env var keys |
| `web/src/App.tsx` | Minimal stub |

## Key Decisions / Deviations

- **Tailwind v4** (not v3 as originally planned): `shadcn@4.1.0` (current) requires Tailwind v4. The plan's constraint to pin Tailwind v3 was based on old `shadcn-ui@0.x` which is now deprecated. Migrated to `@tailwindcss/vite` plugin, removed `postcss.config.js` and `tailwind.config.js`.
- **Shake animation** defined in `index.css` as plain `@keyframes shake` + `.animate-shake` class (Tailwind v4 doesn't use `tailwind.config.js` plugins for this).
- **shadcn style**: `base-nova` (default for shadcn v4 `--defaults`).

## Runtime Dependencies Installed

```
@tanstack/react-query    react-router-dom    react-hook-form
zod                      @hookform/resolvers sonner
date-fns                 lucide-react        (via shadcn)
```

## Verification

- `npm run build --prefix web` exits 0 ✓
- All shadcn components in `web/src/components/ui/` ✓
- `VITE_ADMIN_TOKEN` typed in `vite-env.d.ts` ✓
- `.env.example` documents both keys ✓

## Requirements Satisfied

WEB-01 (Vite+React+TS scaffold), WEB-02 (Tailwind CSS), WEB-03 (shadcn/ui), WEB-04 (runtime deps)
