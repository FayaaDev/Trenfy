# Features Research: React Native Mobile App

**Domain:** Trend discovery consumer app (gaming, music, entertainment) — mobile-first
**Milestone:** v1.3 React Native mobile consumer app
**Researched:** 2026-03-21
**Confidence:** HIGH (UX patterns from NNGroup + established app conventions; library capabilities from official GitHub/Expo docs)

---

## How Trend Discovery Apps Work on Mobile

Trend discovery apps (Twitter/X Trends, TikTok Discover, YouTube Trending, Google Trends) converge on a small set of proven UX patterns:

1. **Feed = list of ranked items with rich metadata**, not just text links.
2. **Filters are surface-level, not buried in a settings screen.** Platform, category, and region filters appear as chips in a scrollable horizontal row near the top of the feed.
3. **Tap opens the source directly.** The primary CTA on any trend card is "go read/watch this". There is no intermediate detail page unless there's something to show (e.g., trending tweet thread, YouTube embed).
4. **Pull-to-refresh is the universal "check for new content" gesture** on mobile. Users have been conditioned to this by Twitter, Instagram, and every news app since 2012.
5. **Infinite scroll fits trend discovery** perfectly because users have no specific goal — they are browsing homogeneous, equally-relevant items. (NNGroup confirms this is the correct use case for infinite scroll.)
6. **Bookmarks/saves are local-first.** Apps like Pocket, Feedly, and Apple News all let you save without signing in first.

---

## Trend Feed

### Table Stakes

Features users expect in a trending feed. Missing = product feels broken.

| Feature | Why Expected | Complexity | Backend Dependency |
|---------|--------------|------------|--------------------|
| Chronological/ranked list of trends | Core product value — no feed, no app | LOW | `GET /api/trends` (exists) |
| Pull-to-refresh | Universal mobile gesture since 2012; users will tap the list immediately to see if it's live | LOW | Re-fetches `/api/trends` |
| Infinite scroll (pagination) | Trends list will grow; loading 20 items at a time prevents blank screens | MEDIUM | `limit` + `offset` or `cursor` params on `/api/trends` — **needs verification** |
| Loading skeleton / shimmer while fetching | Any blank white space reads as "broken" on first open | LOW | None |
| Empty state with context | Show "No trends yet" or "No results for this filter" — not a blank screen | LOW | None |
| Error state with retry | Network failures happen; users need a path back | LOW | None |
| Platform filter chips (X, YouTube, etc.) | Users care which platform the trend is on; X gaming ≠ YouTube gaming | LOW | `platform=` param on `/api/trends` (exists) |
| Category filter chips (Gaming, Music, Entertainment) | Users want to narrow to their interest domain | LOW | `category=` param on `/api/trends` (exists) |
| Tap card → open source URL in browser | This is the entire product — read/watch the trend | LOW | `source_url` field in trend object (must verify field name) |
| Trend card: title + metric + platform icon + category badge | Visual hierarchy that lets users scan 20+ items quickly | LOW | All fields in existing trend schema |
| Dark mode (follows system) | iOS/Android system pref is now mainstream; half your users will expect it | LOW | `useColorScheme()` hook — no backend dependency |
| RTL layout for Arabic content | Arabic title/translation must not overflow LTR layout | MEDIUM | `ar_title` / `ar_translation` fields in trend schema |

### Differentiators

Features that differentiate Trenfy from a simple web scrape. Not expected, but create stickiness.

| Feature | Value Proposition | Complexity | Backend Dependency |
|---------|-------------------|------------|--------------------|
| Arabic translation shown on card | Unique to Trenfy — shows what the trend means in Arabic, not just the source title | LOW | `ar_translation` field in trend schema |
| Platform icon (YouTube/X/TikTok) rendered visually | Instant visual scan — user knows it's a YouTube trend at a glance | LOW | `platform` field |
| Trend metric shown (views, tweets, etc.) | Quantifies how hot the trend is — "10M views" is more compelling than just the title | LOW | `metric` or `view_count` field in trend schema |
| Collapsible filter header (shrinks on scroll, expands on scroll-up) | Maximizes feed real estate on small screens; common in content apps like Instagram/Twitter | MEDIUM | None — pure UI |
| Region filter chip | MENA users want region-specific trends; "Global" vs "Saudi Arabia" is meaningful | LOW | `region=` param on `/api/trends` — **needs backend verification** |
| Bookmark / save trend | Users want to revisit items without re-filtering | MEDIUM | Local-first with MMKV/AsyncStorage; backend sync deferred to v2 |
| Active filter badge count | Show "(3 active)" on a filter icon so users know the feed is filtered | LOW | Pure UI state |
| Animated "new trends" banner | "12 new trends" notification at top of feed when a refresh detects new items | MEDIUM | Compare new response IDs to cached IDs |

### Anti-Features

Features commonly requested for trend apps that create more problems than value.

| Anti-Feature | Why It Sounds Good | Why Avoid | What to Do Instead |
|--------------|-------------------|-----------|-------------------|
| Auto-refresh / live feed | "Always fresh content" | Hammers the backend; disrupts active scroll position; creates anxiety UI; violates NNGroup scroll position preservation | Manual pull-to-refresh only |
| Push notifications for new trends | "Stay updated" | Requires permissions, notification infrastructure, and backend push support — massive scope; most users ignore trend notifications | In-app "new trends" banner on reopen |
| Social sharing buttons | "Share this trend" | Adds visual noise to card; most sharing happens via the source URL anyway | The source URL IS the sharable content |
| In-app browser / WebView embeds | "Keep users in the app" | WebView UX is universally worse than native browsers; breaks native share/copy/translate; Linking.openURL() → native browser is strictly better | `Linking.openURL(trend.source_url)` |
| Comments / reactions | "Community engagement" | No auth, no user table, no backend support; wrong product for this milestone | Bookmark + share externally |
| Algorithmic ranking / personalization | "Smart feed" | Requires user profile, behavior tracking, ML backend; far beyond v1.3 scope | Manual category + platform filters give users control |
| Trend history / charts | "See how a trend grew" | No time-series data in current backend; NocoDB stores current snapshot only | Show `fetched_at` timestamp on cards as freshness indicator |

---

## Category Browsing

### Table Stakes

| Feature | Why Expected | Complexity | Backend Dependency |
|---------|--------------|------------|--------------------|
| Category grid screen | Users expect a browsable alternative to the feed | MEDIUM | `GET /api/categories` (exists) |
| Category card: name + trend count | Shows how active each category is before drilling in | LOW | count field from `/api/categories` (verify field name) |
| Tap category → filtered feed | Drill-down to see all trends for that category | LOW | Reuses feed screen with `category=` param pre-set |
| Back navigation to grid | Standard mobile back gesture / button | LOW | React Navigation stack |
| Loading state for category grid | Categories may be slow to load | LOW | FlashList skeleton |

### Differentiators

| Feature | Value Proposition | Complexity | Backend Dependency |
|---------|-------------------|------------|--------------------|
| Top trend preview on category card | Shows the hottest trend in the category before tapping in — immediate value signal | MEDIUM | Top item from category-filtered `/api/trends` — may require an extra query |
| Trend count badge per category | "Gaming (47)" gives an at-a-glance signal of category health | LOW | `count` from `/api/categories` |
| Category icon / emoji | Visual identity for each category (🎮 Gaming, 🎵 Music, 🎬 Entertainment) | LOW | Hardcoded in app; categories are a fixed small set |
| Last updated timestamp on category | "Updated 3 hours ago" sets freshness expectations | LOW | `last_fetched_at` from backend — verify field exists |
| Smooth shared-element transition (grid → feed) | Category image/icon animates into the next screen header | HIGH | Pure UI — React Navigation + Reanimated |

---

## User Preferences / Profile

### Table Stakes

| Feature | Why Expected | Complexity | Backend Dependency |
|---------|--------------|------------|--------------------|
| Bookmarked trends list | Users who save expect to access saves | MEDIUM | Local-only: MMKV or AsyncStorage |
| Remove bookmark | Saves are useless if you can't clean them up | LOW | Local state update |
| Persisted filter preferences | Re-opening the app should remember last selected platform/category | LOW | MMKV persisted store |
| Dark mode toggle override | Some users want to override system setting | LOW | `Appearance` API from react-native |

### Differentiators

| Feature | Value Proposition | Complexity | Backend Dependency |
|---------|-------------------|------------|--------------------|
| Optional Google Sign-In | Enables future cross-device bookmark sync; optional = zero friction for anonymous users | HIGH | `@react-native-google-signin/google-signin` — OAuth; no backend auth endpoint in v1.3 |
| Optional Apple Sign-In | Required on iOS if any other social login is present (App Store rule) | HIGH | `expo-apple-authentication` — same no-backend constraint |
| Default language preference (EN/AR) | Arabic-first users may want AR title shown by default | LOW | App-local preference; no backend change |
| Filter presets / "My Feed" customization | Save a named filter combo as a home screen shortcut | MEDIUM | Local-only storage |

---

## UX Patterns

Specific interaction patterns that work well for trend discovery, with implementation notes.

### 1. Collapsible / Sticky Filter Header

**Pattern:** The filter chip row (platform + category + region) sits below the screen header. When the user scrolls **down** the feed, the filter row collapses/hides to maximize feed real estate. When the user scrolls **up** (indicating they want to change filters), the filter row re-appears.

**Why it works:** Common in Twitter, Instagram, and Apple News. Maximizes visible content on phones with 390px viewport width.

**Implementation approach:**
- Use `Animated.Value` tracking `scrollY` from the `FlashList` `onScroll` event.
- Interpolate filter header `height` and `opacity` based on scroll direction (detect scroll direction by comparing previous vs current Y value).
- Use `useAnimatedScrollHandler` from `react-native-reanimated` for 60fps header animation.
- The header should **always** be visible on first load; only collapse after the user has scrolled past ~80px.
- Include a pill indicator or active filter count badge so users know filters are applied even when the header is hidden.

**Complexity:** MEDIUM — animation logic is well-established with Reanimated 3, but RTL compatibility requires explicit `flexDirection` and `marginStart`/`marginEnd` handling.

---

### 2. Infinite Scroll + Pull-to-Refresh

**Pattern:** The feed loads the first page (20 items) on mount. When the user scrolls within 5 items of the end, the next page fetches automatically and appends to the list. Pull-to-refresh resets to page 1 and replaces content.

**Why it works:** TanStack Query + FlashList is the standard React Native stack for this. FlashList v2 (JS-only, New Architecture) achieves 60fps scrolling with view recycling, eliminating blank cells — verified from official FlashList v2 README (Mar 2026).

**Implementation approach:**
```
FlashList
  onEndReachedThreshold={0.2}      // trigger when 20% from bottom
  onEndReached={() => fetchNextPage()}
  refreshControl={
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={refetch}
    />
  }
  ListFooterComponent={
    isFetchingNextPage ? <ActivityIndicator /> : null
  }
```

**Pagination requirement:** The backend `/api/trends` endpoint must support `limit` + `offset` (or cursor-based) pagination. **Currently unverified — must confirm with backend.** The current endpoint may return all records without pagination.

**Backend dependency flag:** If `/api/trends` does not support pagination, the first phase task must add `limit` + `offset` query params to FastAPI before the mobile feed can implement infinite scroll.

---

### 3. Tap-to-Source URL

**Pattern:** Tapping anywhere on a trend card (not just a "Read more" button) opens the source URL in the system browser.

**Why it works:** Largest tap target possible. Twitter and YouTube Trending both open in-browser on tap. `Linking.openURL()` from `expo-linking` handles this correctly cross-platform — verified from official Expo docs.

**Implementation approach:**
```typescript
import * as Linking from 'expo-linking';

const handleCardPress = async (sourceUrl: string) => {
  const supported = await Linking.canOpenURL(sourceUrl);
  if (supported) {
    await Linking.openURL(sourceUrl);
  }
};
```

**Anti-pattern to avoid:** Do NOT use a WebView. `Linking.openURL()` opens in the native browser (Safari/Chrome), which supports native share, reading mode, translation, and copy — all lost inside WebView.

---

### 4. Bookmark Toggle

**Pattern:** A bookmark icon (outline → filled) on each trend card. Tap = instant local save. No auth required. Works offline.

**Why it works:** Pocket-style local-first bookmarking sets the gold standard. Users trust saves that work instantly without a loading spinner.

**Implementation approach:**
- Store bookmarks as an array of trend IDs in MMKV (fast synchronous key-value store, faster than AsyncStorage).
- Render saved trends on Profile tab by filtering the bookmark IDs against fetched trend data.
- If the bookmarked trend was evicted from backend (cleaned up), show a "no longer available" placeholder.

**Complexity:** MEDIUM — simple storage, but the UI needs optimistic toggle state that doesn't re-render the whole list.

---

### 5. Filter Chips (Platform / Category / Region)

**Pattern:** A horizontal `ScrollView` of pill-shaped chips below the app header. One chip per option. Tapping a chip toggles selection. Multiple chips can be active simultaneously (AND logic: show trends matching ALL selected filters).

**Implementation approach:**
- Each chip has an `active` boolean driving a color change (platform accent color when active, neutral when inactive).
- Chips are a horizontal `FlatList` (not `ScrollView`) so new chips can be added without re-measuring.
- Active filter state lives in a `useReducer` or Zustand atom so it can be read by the FlashList query params.
- Persisted to MMKV so preferences survive app restarts.

**RTL note:** Arabic locale users expect chips to order from right-to-left. Use `flexDirection: 'row'` with `I18nManager.isRTL` conditional, or rely on the RTL engine if `I18nManager.forceRTL(true)` is set. See the `rtler` skill for details.

---

### 6. Category Grid → Filtered Feed Navigation

**Pattern:** The Categories tab shows a grid (2 columns) of category cards. Tapping a card navigates to a new screen that is the Trending Feed pre-filtered to that category.

**Why it works:** This is the standard "collection → filtered list" pattern used by Apple App Store, YouTube, and Google Play.

**Implementation approach:**
- Use React Navigation stack inside the Categories tab.
- Category card tap: `navigation.navigate('CategoryFeed', { category: 'Gaming', label: '🎮 Gaming' })`.
- The CategoryFeed screen is the same `TrendFeed` component with `initialFilters={{ category: 'Gaming' }}` and with the filter header pre-set and locked.
- Back button returns to the category grid (default stack behavior).

---

## Feature-to-Backend Dependency Map

| Feature | Backend Requirement | Status |
|---------|--------------------|----|
| Trend feed (basic) | `GET /api/trends` | ✅ Exists |
| Platform filter | `platform=` query param | ✅ Exists |
| Category filter | `category=` query param | ✅ Exists |
| Infinite scroll | `limit=` + `offset=` query params | ⚠️ **Unverified — must confirm** |
| Tap to source | `source_url` field in trend object | ⚠️ Verify exact field name |
| Arabic translation on card | `ar_translation` field in trend object | ⚠️ Verify exact field name |
| Trend metric display | `metric` or `view_count` field | ⚠️ Verify exact field name |
| Category browsing grid | `GET /api/categories` | ✅ Exists |
| Trend count per category | `count` in category response | ⚠️ Verify field exists |
| Region filter | `region=` query param | ⚠️ **Unverified — may not exist** |
| Bookmarks | MMKV local storage only | ✅ No backend needed |
| Social sign-in | OAuth flow (no backend auth endpoint) | ✅ Local-only for v1.3 |
| Dark mode | `useColorScheme()` hook | ✅ No backend needed |
| RTL Arabic | `I18nManager` + `ar_translation` field | ⚠️ Field name verification needed |

---

## MVP Definition for v1.3

### Ship With (v1.3 Launch)

Priority order based on user value and dependency chain:

1. **Trending feed** with FlashList, pull-to-refresh, and loading skeleton — this IS the product
2. **Platform + category filter chips** — without filters, all trends are noise for most users
3. **Tap card → open source URL** — the primary CTA; without this, the app has zero utility
4. **Trend card** with title, Arabic translation, platform icon, metric, and category badge
5. **Dark mode** (system-following) — half of users will expect this; missing it reads as unpolished
6. **Category grid** with drill-down to filtered feed
7. **RTL support** for Arabic content rendering
8. **Collapsible filter header** — UX polish that makes the feed feel like a real app
9. **Bookmarks** (local-only, MMKV-backed) — basic stickiness feature
10. **Infinite scroll** — depends on backend `limit`/`offset` support; if not available, load-all + virtual scroll as fallback

### Defer to v1.4+

| Feature | Deferral Reason |
|---------|----------------|
| Social sign-in (Google/Apple) | No backend auth endpoint; local-only bookmarks don't need auth |
| Region filter chip | Needs backend `region=` param verification and backend support |
| Cross-device bookmark sync | Requires auth backend; deferred per PROJECT.md |
| Push notifications | Requires notification infra; out of scope |
| Trend history / analytics | No time-series data in current backend |
| Bulk bookmark export | Power-user feature; not MVP |

---

## Sources

- NNGroup: "Infinite Scrolling: When to Use It, When to Avoid It" (Sep 2022) — HIGH confidence on infinite scroll for entertainment/news feeds
- Shopify FlashList v2 GitHub README (verified Mar 2026, v2.3.0) — HIGH confidence on drop-in FlatList replacement
- Expo Docs: Color Themes / `useColorScheme` (Feb 2026) — HIGH confidence on dark mode API
- Expo Docs: `expo-linking` / `Linking.openURL()` — HIGH confidence on browser URL opening
- React Navigation v7 Bottom Tabs Docs — HIGH confidence on tab navigator patterns
- Training knowledge: Twitter/X, TikTok, YouTube Trending, Apple News UX patterns — MEDIUM confidence (based on known patterns + NNGroup verification)
- PROJECT.md: v1.3 target features, backend API list, deferred auth decisions

---
*Feature research for: Trenfy v1.3 React Native mobile consumer app*
*Researched: 2026-03-21*
