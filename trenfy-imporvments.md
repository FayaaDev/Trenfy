# Trenfy iOS App — Weakness Analysis & Improvement Plan

## Context

Trenfy is a no-auth, quick-access trend-catching app. Users open it, browse trends from YouTube/X filtered by category and region, and tap through to the source platform. The app currently has a single active screen (TrendingNowScreen) with search, filters via a FilterFAB, and infinite scroll. This analysis identifies weaknesses across UX, technical architecture, performance, and security — prioritized by impact on the core "quick trend access" goal.

---

## P0 — Critical (Do First)

### 1. Share Button on TrendCard
**Why:** Sharing is the #1 growth lever for a no-auth app. Currently trends are a dead end — users consume but can't spread them.

**How:** Add a share icon to the footer row in `TrendCard.tsx` and `FeedCard.tsx`. Use React Native's built-in `Share.share({ message: trend.title, url: trend.url })`. Zero new dependencies.

- `src/components/TrendCard.tsx` — add share icon to footer View
- `src/components/FeedCard.tsx` — same treatment

### 2. Local Bookmarking (No Auth Needed)
**Why:** Trends are ephemeral. If users can't save something for later, they lose it. Completes the core usage loop.

**How:** Create `src/hooks/useBookmarks.ts` backed by `expo-sqlite/kv-store` (same pattern as existing `useFilterPrefs.ts`). Store bookmarked trend IDs + data as JSON. Add bookmark toggle icon to cards. Create a `BookmarksScreen` accessible from a header icon or second tab.

- New: `src/hooks/useBookmarks.ts`
- New: `src/context/BookmarkContext.tsx` (follow `FilterContext.tsx` pattern)
- New: `src/screens/BookmarksScreen.tsx`
- Modify: `TrendCard.tsx`, `FeedCard.tsx` — add bookmark icon
- Modify: `AppNavigator.tsx` — wire in bookmarks access

### 3. Image Caching Props
**Why:** Every app open re-downloads all thumbnails. The app already uses `expo-image` which supports disk caching, but no caching props are set.

**How:** Add `transition={200}`, `recyclingKey={trend.id}`, and a placeholder color to `<Image>` in both card components. Zero new dependencies.

- `src/components/TrendCard.tsx` — add props to Image
- `src/components/FeedCard.tsx` — same

### 4. Request Cancellation (AbortController)
**Why:** `useTrendFeed` tracks stale requests by ID but never cancels them. Rapid filter toggling fires many concurrent requests that waste bandwidth and can cause UI glitches.

**How:** Add an `AbortController` ref to `useTrendFeed.ts`. Abort previous request before starting a new one. Forward `signal` through `client.ts` → `trends.ts` → `fetch()`. Swallow `AbortError` in catch block.

- `src/hooks/useTrendFeed.ts` — AbortController ref + abort logic
- `src/api/client.ts` — accept optional `signal` param
- `src/api/trends.ts` — forward signal

### 5. Remove Dead Code & Unused Dependencies
**Why:** Google Sign-In and Apple Auth plugins add binary size and build time for zero functionality. 7 stub screens are dead code.

**How:**
- Remove `@react-native-google-signin/google-signin` and `expo-apple-authentication` from `package.json`
- Remove Google Sign-In from `app.json` plugins
- Delete dead screens: `HomeScreen`, `ActivityScreen`, `LibraryScreen`, `ProfileScreen`, `ProfileStubScreen`, `WelcomeScreen`, `FoundationScreen`

### 6. Freshness Indicator & Auto-Refresh
**Why:** Users can't tell if trends are fresh or stale. A trend app showing yesterday's data without indication destroys trust.

**How:** Track `lastUpdatedAt` in `useTrendFeed.ts`. Display relative time ("2 min ago") below header in `TrendingNowScreen`. Use `AppState` listener to auto-refresh when app comes to foreground (throttled to once per 2 min).

- `src/hooks/useTrendFeed.ts` — add `lastUpdatedAt` state
- `src/screens/TrendingNowScreen.tsx` — display freshness label, add AppState listener

---

## P1 — Important (Significant Value)

### 7. Offline Support & Data Caching
Cache last successful API response in `expo-sqlite/kv-store`. Show cached data instantly on cold start, fetch in background. Show "offline" banner when no connectivity (add `@react-native-community/netinfo`).

### 8. Error Retry with Exponential Backoff
Create `src/utils/retry.ts` — generic `withRetry(fn, { maxAttempts: 3, baseDelay: 1000 })`. Wrap `fetchTrends` calls. Only retry on network errors, not 4xx. Keep manual retry as fallback.

### 9. Analytics / Telemetry
Add lightweight event tracking (app_open, trend_tap, search, filter_change, share). Use anonymous device ID stored in KV-store. Log to own backend endpoint `POST /api/events` or use PostHog.

### 10. Accessibility
Add `accessibilityLabel`, `accessibilityHint`, `accessibilityRole` to all interactive elements in TrendCard, FeedCard, SearchInput, and FilterFAB pills. Add `accessibilityElementsHidden` to SkeletonCard.

### 11. React.memo + StyleSheet Fix
Wrap TrendCard and FeedCard in `React.memo` with `(prev, next) => prev.trend.id === next.trend.id`. Move `StyleSheet.create()` calls out of render functions (currently inside component body in TrendCard, FeedCard, TrendingNowScreen, SearchInput, SkeletonCard).

### 12. Deep Linking
`app.json` already has `scheme: "trenfy"`. Add a TrendDetailScreen, wire linking config in AppNavigator. Update Share to use `trenfy://trend/${id}` with platform URL fallback. Backend already has `GET /api/trends/{id}`.

### 13. Client-Side Rate Limiting
Apply 200ms debounce to filter changes in `useTrendFeed.ts` (same pattern as search debounce). Currently each category toggle fires an immediate API call.

### 14. Search Input Sanitization
Add `maxLength={200}` to SearchInput TextInput. Trim and truncate query in `useTrendFeed.ts` before sending to API.

---

## P2 — Nice to Have (Polish & Scale)

### 15. Onboarding Flow
2-3 screen intro on first launch. Store `onboarding:completed` flag. Explain filters and long-press-to-clear (non-obvious interactions).

### 16. Trend Detail Screen
In-app detail view instead of immediately leaving to platform URL. Show related trends, enable bookmark/share from richer context.

### 17. Push Notifications
`expo-notifications` for breaking/high-velocity trends. Requires backend push token storage and notification dispatch.

### 18. OTA Updates
Configure `expo-updates` for over-the-air JS bundle updates. EAS project already configured.

### 19. API Security
Add API key header to all requests. Protect backend admin endpoints (PATCH/DELETE on trends) behind authentication. Consider Apple DeviceCheck for attestation.

### 20. Frontend Test Suite
Add Jest + `@testing-library/react-native`. Priority: `useTrendFeed`, `FilterContext`, TrendCard snapshots, API client mocks.

### 21. More Platforms & Regions (Backend-gated)
Add TikTok, Instagram, Reddit, Google Trends sources. Expand regions (UK, IN, BR, DE, FR). Update `REGION_OPTIONS` in AppNavigator and `TrendRegion` type.

---

## Implementation Sequence

**Week 1 (P0):**
1. P0-5: Remove dead code/deps (30 min)
2. P0-4: AbortController (1-2 hrs)
3. P0-3: Image caching props (1 hr)
4. P0-1: Share button (1-2 hrs)
5. P0-6: Freshness + auto-refresh (2-3 hrs)
6. P0-2: Local bookmarks (4-6 hrs)

**Week 2 (P1):**
1. P1-11: React.memo + StyleSheet (1-2 hrs)
2. P1-13: Rate limiting (1-2 hrs)
3. P1-14: Search sanitization (30 min)
4. P1-10: Accessibility (2-3 hrs)
5. P1-8: Retry with backoff (2 hrs)
6. P1-7: Offline caching (4-6 hrs)

**Week 3+ (P1/P2):**
Analytics → Deep linking → Onboarding → Detail screen → API security → Tests

---

## Verification

After implementing each item:
- Run `npx expo start` and test on iOS simulator
- For share: verify share sheet opens with correct URL/title
- For bookmarks: save a trend, kill app, reopen, verify persistence
- For image caching: toggle airplane mode after first load, verify thumbnails still render
- For AbortController: rapidly toggle filters, verify only final request resolves
- For freshness: background app for 2+ min, foreground, verify auto-refresh triggers
- For accessibility: enable VoiceOver on iOS simulator and navigate the full feed

## Key Files
- `app/src/hooks/useTrendFeed.ts` — core data hook (AbortController, caching, retry, rate limiting, freshness)
- `app/src/components/TrendCard.tsx` — primary card (share, bookmark, memo, a11y, image props)
- `app/src/components/FeedCard.tsx` — compact card (same changes as TrendCard)
- `app/src/navigation/AppNavigator.tsx` — app shell (new screens, deep linking, a11y on filter pills)
- `app/src/api/client.ts` — HTTP layer (signal forwarding, API key, retry)
- `app/package.json` — dependency cleanup
