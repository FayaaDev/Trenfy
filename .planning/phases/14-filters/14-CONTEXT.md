# Phase 14: Filters - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 adds a collapsible filter header to the Trending Now screen. Users can narrow the live feed by platform (YouTube / X), category (fetched from /api/categories), and region (region_code). The header animates in/out on scroll (translateY + opacity only — never height), active filters are visually indicated, filter count is badged when collapsed, clear-all resets everything, and platform + region preferences persist across app restarts via expo-sqlite kv-store.

</domain>

<decisions>
## Implementation Decisions

### Filter Row Layout
- One horizontal ScrollView row per filter type: platforms row, categories row, region row — clean grouping
- Each row uses horizontal `ScrollView` (no wrapping) — avoids layout height changes with FlashList
- "Clear All" button appears only when ≥1 filter is active — cleaner UI
- Active filter count badge shown on collapsed header bar (top-right badge when filters are active and header is hidden) — per FLTR-05

### Chip Visual Design
- Active chip: `primarySoft` background + `primary` text + `primary` border — matches Trenfy brand teal
- Inactive chip: outlined `border` color with `muted` text — subtle, unobtrusive
- Platform chips show react-native-iconify icons + text — consistent with TrendCard platform icons
- Category list fetched from `/api/categories` on mount — dynamic, never stale

### Collapsible Animation
- 80px scroll threshold before collapse triggers — standard feel
- Starts collapsing immediately once threshold crossed, smooth easing — translateY + opacity (never height, per critical pitfall logged in STATE.md)
- Search bar stays visible — only the filter chips rows collapse
- Category chips row is included in the collapsible filter header (same as platform + region rows)

### Persistence
- Platform + region only persisted (matches ROADMAP SC7: "same platform and region chips")
- Preferences hydrated from expo-sqlite kv-store before first API fetch — no flash of unfiltered content
- Persistence key format: `filter:platform` and `filter:region` in expo-sqlite kv-store
- "Clear All" clears both in-memory state AND stored prefs in one tap

### the agent's Discretion
- Exact animation duration and easing curve for collapse/expand (400ms ease-out is a reasonable default)
- Exact layout dimensions of filter chip rows (height, padding)
- Whether to show a thin separator between search bar and filter rows

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTrendFeed.ts` — existing hook handles API calls; needs `platform`, `category`, `region_code` filter params wired in (TrendFilters interface already typed for all 3)
- `fetchTrends()` in `src/api/trends.ts` — already accepts and sends `platform`, `category`, `region_code` params to the backend
- `TrendingNowScreen.tsx` — has sticky header with search row; filter chips rows slot in below the search bar
- `SearchInput.tsx` — reusable search input component
- `colors.primary`, `colors.primarySoft`, `colors.border`, `colors.muted`, `colors.surface` — all tokens available from `src/theme/tokens.ts`
- `spacing`, `radii`, `typography` — full token set available

### Established Patterns
- All API calls go through `apiFetch<T>` in `src/api/client.ts` via `EXPO_PUBLIC_API_URL` — no direct NocoDB calls
- StyleSheet.create() for all component styles
- `useCallback` for renderItem and event handlers in FlashList screens
- `useSafeAreaInsets()` for top padding on screen headers
- react-native-iconify for all icons — babel.config.js must list every icon string used

### Integration Points
- `useTrendFeed.ts` must be extended to accept filter state (platform, category[], region) and re-fetch when they change
- `TrendingNowScreen.tsx` header section: add collapsible filter rows below the existing search row
- New `useFilterPrefs.ts` hook needed for expo-sqlite kv-store persistence of platform+region
- New `FilterChip.tsx` component (reusable chip UI)
- New `FilterHeader.tsx` component (collapsible header wrapper with Reanimated)
- `/api/categories` endpoint needs to be called — add `fetchCategories()` to `src/api/trends.ts`

</code_context>

<specifics>
## Specific Ideas

- Critical pitfall (from STATE.md): Collapsible header must use `translateY` + `opacity` ONLY — never animate `height` as it causes FlashList layout recalculations
- Critical pitfall (from STATE.md): react-native-iconify babel registry — any new icon strings used in FilterChip or FilterHeader MUST be added to `babel.config.js` icons list
- The collapsible filter rows are driven by the FlashList's `onScroll` event via Reanimated shared values — use `useAnimatedScrollHandler` pattern
- Reanimated is already installed at ~3.17.4 (pinned for Expo SDK 53 compat) — do NOT upgrade

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
