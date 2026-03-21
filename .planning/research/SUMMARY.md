# Research Summary: v1.3 React Native Mobile App

**Project:** Trenfy v1.3 — React Native Consumer App
**Domain:** Trend discovery mobile app (gaming, music, entertainment) — MENA-focused
**Researched:** 2026-03-21
**Confidence:** HIGH (all claims verified via Context7 official docs + codebase inspection)

---

## Executive Summary

Trenfy v1.3 is a read-only trend discovery consumer app built atop an already-working FastAPI/NocoDB backend. The mobile app's core value is a fast, filterable feed of approved trends with Arabic translations — making it a uniquely bilingual product in the MENA market. Expert-built trend apps (Twitter/X, TikTok Discover, YouTube Trending) converge on the same proven UX pattern: a ranked card feed, surface-level filter chips, pull-to-refresh, infinite scroll, and tap-to-source. These are not nice-to-haves — they are the table stakes that make the product feel complete rather than broken.

The recommended build stack adds only 8 targeted packages to the existing Expo SDK 53 / RN 0.79.6 / React Navigation 7 scaffold: FlashList v2 (feed performance), Reanimated v3 (collapsible header animation — **not v4**, which requires RN 0.80+), expo-image (thumbnail caching), expo-sqlite/kv-store (local storage), expo-apple-authentication, @react-native-google-signin/google-signin (auth deferred to after v1.3 launch), expo-web-browser, and expo-linking. No design system library, no Zustand, no TanStack Query is strictly required — though TanStack Query is strongly recommended for cursor-based infinite scroll and background refetch. State management is intentionally lean: two React Contexts (Bookmarks, Auth) + local component state for filters.

The single biggest risk is the scaffold-to-product migration: `mockData.ts` and `starterCopy.ts` must be fully purged before any API wiring begins, and `app.json` branding must be updated on day one. FlashList recycling semantics (no `key` props on items, no nesting inside ScrollView) and Reanimated's `translateY`+`opacity` pattern for the collapsible header (never animate `height`) are the two most likely causes of invisible performance regressions. Auth integration requires a development build (not Expo Go) and careful handling of Apple's one-time credential delivery.

---

## Stack Additions

Only 8 new packages are needed. Everything else is already present in `WhiteLabelApp/package.json`.

| Package | Version | Purpose |
|---------|---------|---------|
| `@shopify/flash-list` | `~2.3.0` | High-perf virtualized list for trend feed; cell recycling eliminates blank cells on large lists |
| `react-native-reanimated` | `~3.19.5` | Collapsible filter header animation on UI thread (**v3 only** — RN 0.79.6 incompatible with v4) |
| `expo-image` | `~55.0.6` | Thumbnail loading with blurhash placeholders; backed by SDWebImage/Glide with disk+memory cache |
| `expo-sqlite` | `~15.2.14` | Local bookmark/preferences storage via `expo-sqlite/kv-store` (drop-in AsyncStorage replacement) |
| `expo-apple-authentication` | `~55.0.9` | Native Sign In with Apple — required by App Store if any other social login is offered on iOS |
| `@react-native-google-signin/google-signin` | `^16.1.2` | Google Sign-In (requires dev build — cannot use in Expo Go) |
| `expo-web-browser` | `~55.0.10` | OAuth session completion + in-app browser for trend source URLs |
| `expo-linking` | `~55.0.8` | Deep linking + `Linking.openURL()` for opening source URLs in native browser |

> Always use `npx expo install` (not `npm install`) — auto-resolves SDK 53-compatible version pins.

**Babel config required after Reanimated install** (`babel.config.js`):
```js
plugins: ['react-native-reanimated/plugin']  // must be last plugin
```

**Do NOT add:** react-native-mmkv (expo-sqlite/kv-store covers the use case with zero added binary), expo-router (full restructure — out of scope), nativewind/restyle/paper (no design system change requested), lottie (no animations beyond collapsible header), react-native-fast-image (superseded by expo-image).

---

## Feature Table Stakes

Features users expect in a trending feed. Missing = product feels broken.

| Feature | Why It's Non-Negotiable |
|---------|------------------------|
| Trend feed — ranked card list | Core product value; no feed, no app |
| Platform filter chips (X, YouTube) | Users need to distinguish X gaming from YouTube gaming |
| Category filter chips (Gaming, Music, Entertainment) | Primary navigation into interest domains |
| Pull-to-refresh | Universal mobile gesture; users will tap immediately to test liveness |
| Tap card → open source URL in native browser | The entire product value; missing = zero utility |
| Trend card: title + Arabic translation + platform icon + metric + badge | Visual hierarchy enabling fast scanning of 20+ items |
| Loading skeleton / shimmer | Blank white space reads as "broken" on first open |
| Empty state + error state with retry | Network failures and filter misses need a visible path back |
| Dark mode (follows system) | `useColorScheme()` only; half of users expect it; missing reads as unpolished |
| RTL layout for Arabic content | Arabic titles and translations must not overflow LTR layout |
| Infinite scroll (cursor-based pagination) | Backend `/api/trends` supports `cursor`+`limit` — confirmed in `routes/trends.py` |
| Category grid screen with drill-down to filtered feed | Browsable alternative to the raw feed |
| Bookmarks (local-only, no auth required) | Basic stickiness; local-first means no login friction |

---

## Feature Differentiators

Features that make Trenfy stand out. Ship carefully — scope against time budget.

| Feature | Value Proposition | Complexity |
|---------|-----------------|------------|
| Arabic translation on card (`ar_translation` field) | Unique to Trenfy — shows what the trend means in Arabic | LOW |
| Trend metric display (`metric_value` field) | "10M views" is more compelling than just a title | LOW |
| Collapsible filter header (shrinks on scroll, expands on scroll-up) | Maximizes feed real estate; feels like a real content app | MEDIUM |
| Active filter badge count when header is hidden | Users know the feed is filtered even when chips are off-screen | LOW |
| Platform icon rendered visually (YouTube/X badge) | Instant at-a-glance scan — no reading required | LOW |
| Region filter chip (Global vs Saudi Arabia) | MENA users want region-specific trends | LOW UI / MEDIUM backend |
| Top trend preview on category card | Immediate value signal before drilling in | MEDIUM |
| Animated "new trends" banner after pull-to-refresh | "12 new trends available" compares new vs cached IDs | MEDIUM |

**Defer to v1.4+:** Social sign-in (no backend auth endpoint in v1.3), cross-device bookmark sync, push notifications, region filter (backend param needs verification), trend history/charts (no time-series data in NocoDB).

---

## Build Order Recommendation

Phase sequence strictly respects the dependency chain: data layer before UI, navigation shell before screens, core feed before secondary tabs, auth last.

### 1 — Scaffold → Trenfy Foundation
**Why first:** Must clear mock data and fix branding before any feature work. Silent mock data contamination is the highest-probability launch embarrassment.
**Delivers:** App builds as "Trenfy", all mock data gone, real API data reachable, local storage abstracted.
- Update `app.json` (name, slug, `scheme: "trenfy"`, bundle IDs, icon/splash)
- Grep and remove all imports from `mockData.ts` + `starterCopy.ts`; delete both files
- Install 8 new packages with `npx expo install`
- Write `src/api/client.ts` + `src/api/trends.ts` + `src/api/types.ts` (verify exact field names from `contracts.py`)
- Configure `EXPO_PUBLIC_API_URL` in `.env.local`; set Android `10.0.2.2` fallback and `usesCleartextTraffic: true`
- Add Reanimated Babel plugin; clear Metro cache

### 2 — Navigation Shell
**Why second:** Route names and param lists must be locked before building screens — string-based `navigate()` calls fail silently at runtime if routes change later.
**Delivers:** 3-tab bottom navigator + nested stacks, TypeScript param lists enforcing route safety, all screens as stubs.
- Rewrite `AppNavigator.tsx` → 3-tab (TrendingNow, Categories, Profile)
- Create `TrendingStack`, `CategoriesStack`, `ProfileStack`
- Write `navigation/types.ts` with `RootTabParamList`, `TrendingStackParamList`, etc.
- Fix tab bar height: replace hardcoded `height: 88` with `useSafeAreaInsets()`

### 3 — Trending Now Feed (Core Experience)
**Why third:** This IS the product. Nothing else matters until the feed works end-to-end with real data, correct performance, and all filter states.
**Delivers:** Live feed with FlashList, TrendCard, collapsible Reanimated filter header, pull-to-refresh, infinite scroll, bookmark toggle, skeletons, error + empty states.
- `useTrends(filters)` hook with `useInfiniteQuery` + cursor pagination
- `TrendCard` component (thumbnail, title, `ar_translation`, platform icon, `metric_value`, badge, bookmark icon derived from BookmarksContext — no local state)
- `FilterHeader` with Reanimated `translateY`+`opacity` (never `height`); positioned absolutely above FlashList
- `BookmarksContext` + `expo-sqlite/kv-store` persistence
- FlashList with `keyExtractor` only (no `key` props inside `renderItem`); FlashList as root scroll container (no wrapping ScrollView)

### 4 — Categories Tab
**Why fourth:** Reuses TrendingScreen as CategoryFeedScreen — depends on Phase 3 being complete.
**Delivers:** 2-column category grid with counts + top trend preview; drill-down to filtered feed; correct back navigation.
- `useCategories()` hook deriving from `/api/trends/mockup`
- `CategoryCard` component (name, count badge, top trend preview, category emoji)
- `CategoriesScreen` grid → `CategoryFeedScreen` (TrendingScreen with `initialFilters` preset)

### 5 — Polish (Dark Mode + RTL)
**Why fifth:** Polish touches every component — doing it after the component set is stable avoids double work.
**Delivers:** Full dark mode on both platforms, Arabic text rendering correctly RTL, error boundaries, empty state illustrations.
- `useThemeColors()` hook replacing static `colors` references in StyleSheet
- Dynamic `NavigationContainer` theme (not computed at module load)
- Install `expo-system-ui` for Android dark mode
- Replace `paddingLeft`/`paddingRight` with `paddingStart`/`paddingEnd` throughout
- Directional icons: `scaleX: I18nManager.isRTL ? -1 : 1`
- Explicit `textAlign: 'right'` for Arabic text fields (cross-platform consistent)

### 6 — Profile + Auth
**Why last:** Auth is entirely local in v1.3 (no backend auth endpoint). The app ships fully usable without it — bookmarks work anonymously. Requires dev build, not Expo Go.
**Delivers:** AuthContext, Google Sign-In, Apple Sign-In (iOS only), ProfileScreen (unauthenticated + authenticated states), BookmarksScreen.
- Create dev build before implementing auth (Google Sign-In requires native module)
- Persist Apple Sign-In `fullName`/`email` immediately on first callback (Apple only sends once)
- Render Apple button conditionally: `AppleAuthentication.isAvailableAsync()` before showing

---

## Watch Out For

Top 5 critical pitfalls that could derail the milestone:

1. **Stale mock data in production** — `starterFeed`, `heroMetrics`, `starterProfile` etc. from `mockData.ts`/`starterCopy.ts` survive in partially-ported screens. Prevention: audit all imports at Phase 1 start, delete both files only after full port, run `tsc --noEmit` to catch any survivors. One surviving import = "Avery Quinn" or "White-label starter" in production.

2. **`key` prop on FlashList items kills recycling silently** — Adding `key={item.id}` to `TrendCard` inside `renderItem` forces remount on every recycle, degrading to worse-than-FlatList. Prevention: use only `keyExtractor` on the `<FlashList>` itself — never `key` inside `renderItem`. The regression is invisible in dev/debug mode; only surfaces in release builds.

3. **Reanimated v4 installed instead of v3** — v4 requires RN 0.80–0.84; this project is on 0.79.6. v4 docs appear prominently in search and recommend themselves. Prevention: always use `npx expo install react-native-reanimated` (SDK pins to 3.19.x), never `npm install`. Check `package.json` after install.

4. **Animating `height` on the collapsible header triggers FlashList layout recalculations** — every frame of a `height` animation forces FlashList to recompute item positions → 20-30fps scroll. Prevention: animate `translateY` + `opacity` exclusively (GPU-compositable). Position header absolutely; give FlashList a static `paddingTop` offset equal to header height so FlashList layout never changes.

5. **Apple Sign-In credentials only delivered once — ever** — `fullName` and `email` return `null` on every subsequent sign-in from the same device. Prevention: persist to local storage **immediately** in the first successful sign-in callback before doing anything else (render, navigate, etc.).

---

## Open Questions

Items needing resolution before or during execution:

| Question | When Needed | Where to Check |
|----------|-------------|----------------|
| Exact field name for tap-to-source URL: `url` or `source_url`? | Phase 1 (before writing `types.ts`) | `contracts.py` / `routes/trends.py` |
| Exact field name for Arabic translation: `ar_translation` or `ar_title`? | Phase 3 (TrendCard) | `contracts.py` |
| Exact field name for metric: `metric_value` or `view_count`? | Phase 3 (TrendCard) | `contracts.py` |
| Does `/api/trends` accept `region_code` or `region` param? | Phase 3 (filter chips) | `routes/trends.py` query params |
| Does `/api/categories` return a `count` field per category? | Phase 4 (category grid) | Test API response directly |
| What is the production API base URL for `EXPO_PUBLIC_API_URL`? | Phase 1 (`.env.local`) | DevOps / `docker-compose.yml` |
| Which Google OAuth `webClientId` to use? | Phase 6 (auth) | Google Cloud Console (create if missing) |
| Is `expo-system-ui` already in `WhiteLabelApp/package.json`? | Phase 5 (dark mode) | `cat WhiteLabelApp/package.json` |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via Context7 official Expo/RN docs + npm registry. Reanimated v3/v4 incompatibility explicitly confirmed. |
| Features | HIGH | Table stakes derived from NNGroup research + established Twitter/X, TikTok, YouTube Trending patterns. Backend endpoints confirmed against `contracts.py`. |
| Architecture | HIGH | API contracts verified from `contracts.py` + `routes/trends.py`. Navigation structure fits existing scaffold. TanStack Query cursor pattern maps directly to backend's `has_more`/`next_cursor` contract. |
| Pitfalls | HIGH | All critical pitfalls sourced from official docs (FlashList v2 GitHub, Expo Apple/Google Auth docs, RN I18nManager docs, Expo Color Themes docs). Scaffold-specific pitfalls from codebase inspection. |

**Overall confidence:** HIGH

### Gaps to Address

- **API field names** — verify `url` vs `source_url`, `ar_translation` vs `ar_title`, `metric_value` vs `view_count` against `contracts.py` in Phase 1 before writing `src/api/types.ts`. Wrong field name = silent `undefined` values throughout the UI.
- **Region filter backend support** — ARCHITECTURE.md confirms `region_code` param exists on `GET /api/trends`, but FEATURES.md flags it as "unverified". Low risk to ship the filter chip; gracefully degrades if backend ignores it.
- **Google auth credentials** — No Google Cloud Console project credentials exist yet. Phase 6 is blocked until created.

---

## Sources

### Primary (HIGH confidence)
- FlashList v2 GitHub README (Shopify, March 2026) — cell recycling mechanics, `key` prop behavior, v2 `estimatedItemSize` deprecation
- Reanimated v4 npm registry — RN 0.80-0.84 peer requirement (confirms v3 required)
- Expo SDK 53 docs (Context7) — New Architecture default-on, `expo-sqlite/kv-store`, `expo-image`, `expo-apple-authentication`, Google Sign-In dev-build requirement
- Expo Apple Authentication docs (expo.dev, 2026) — one-time credential delivery constraint
- Expo Google Authentication docs (expo.dev, January 2026) — native module, Expo Go incompatibility
- Expo Color Themes docs (expo.dev, February 2026) — `useColorScheme`, `expo-system-ui` Android requirement
- React Native I18nManager docs (reactnative.dev, February 2026) — restart requirement
- React Native RTL blog (reactnative.dev) — `left`/`right` vs logical properties, icon mirroring
- Trenfy `contracts.py` + `routes/trends.py` (codebase inspection, March 2026) — Trend interface, cursor pagination contract
- NNGroup: "Infinite Scrolling: When to Use It" (2022) — infinite scroll for entertainment/discovery feeds

### Secondary (MEDIUM confidence)
- Twitter/X, TikTok Discover, YouTube Trending, Apple News UX patterns — table stakes feature list derived from observation + NNGroup validation

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
