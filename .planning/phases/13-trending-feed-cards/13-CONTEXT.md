# Phase 13: Trending Feed + Cards - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the FoundationScreen placeholder in the Trending Now tab with a fully functional live feed: FlashList-powered, pull-to-refresh, infinite scroll via cursor pagination, keyword search, loading skeleton, error/retry state, and tap-to-URL. Every card displays title, Arabic translation (if available), thumbnail with placeholder, platform icon, metric value, and category badge. Phase 14 adds the collapsible filter header — platform/category/region chips are out of scope here.

</domain>

<decisions>
## Implementation Decisions

### Card Visual Anatomy
- Thumbnail: top 16:9 banner image (~140px height) rendered with `expo-image` — `contentFit="cover"`, teal placeholder color while loading, graceful fallback for missing thumbnails
- Information hierarchy: platform icon + category badge row → title (2 lines max, clamps with ellipsis) → Arabic translation if present (RTL text direction, `arabicBody` typography) → metric + date footer
- Platform icon: small Iconify brand icon (YouTube red, X mono) in top-right corner of thumbnail as an overlay badge
- Metric display: abbreviated number + type label ("1.2M views", "45K engagements") in `colors.muted` — use `Intl.NumberFormat` abbreviation or manual threshold-based formatting

### Loading & Empty States
- Loading skeleton: 4 card-shaped shimmer placeholders mirroring the exact TrendCard proportions — thumbnail block + 2 text line blocks; shimmer via Reanimated 3 animated opacity loop
- Error state: centered `colors.error` icon + 1-line descriptive message + teal "Retry" button below; tapping Retry re-fires the fetch
- Empty state (no results): centered muted icon + "No trends found" primary text + "Try different filters" sub-text in `colors.muted` — no CTA button

### Search & Infinite Scroll Behavior
- Search bar placement: sticky header bar between tab bar and FlashList — always visible, not inside FlashList data; uses existing `SearchInput` component or equivalent
- Search filter mode: client-side filter on loaded data for immediate feedback; debounced API re-fetch (300ms) when search text changes, replacing loaded data with server results
- Search clear affordance: X icon at right of search input when text is present; single tap clears text and resets feed to unfiltered state
- Infinite scroll config: `onEndReachedThreshold={0.3}`, footer spinner (`ActivityIndicator`) rendered while loading next page, "You're all caught up" text at true end (`paging.has_more === false` after at least one page)

### the Agent's Discretion
- Exact card padding, border radius, and shadow values (follow `radii`, `spacing`, `shadows` tokens)
- Whether to extract TrendCard into `src/components/TrendCard.tsx` or keep inline in the screen — extraction preferred for Phase 16 reuse
- Exact shimmer animation easing curve
- Whether "You're all caught up" uses an icon or text-only

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/api/trends.ts` — `fetchTrends(filters)` with cursor pagination already implemented; `TrendFilters` includes `q`, `cursor`, `limit`, `platform`, `category`, `region_code`; always enforces `status=approved`
- `src/types/index.ts` — `Trend`, `TrendFilters`, `TrendsListResponse`, `TrendsPaging` types all defined; `paging.has_more` and `paging.next_cursor` available for infinite scroll
- `src/theme/tokens.ts` — full token set: `colors`, `typography`, `spacing`, `radii`, `shadows`, `gradients`; `colors.muted`, `arabicBody` typography for Arabic content
- `src/components/SearchInput.tsx` — existing generic search input component; review for reuse in the sticky header
- `src/screens/TrendingNowScreen.tsx` — thin wrapper over `FoundationScreen`; Phase 13 replaces the `FoundationScreen` usage entirely
- `src/screens/FoundationScreen.tsx` — reference for how `fetchTrendsPreview` is called; can be deleted or archived after Phase 13

### Established Patterns
- StyleSheet-only styling (no NativeWind, no styled-components) — follow throughout
- `expo-image` installed for thumbnail rendering with placeholder support
- `@shopify/flash-list` installed — use `FlashList` not `FlatList`; never add `key` prop inside `renderItem`, only `keyExtractor` on the element
- Reanimated 3 (`~3.19.5`) installed — use for skeleton shimmer animation; v4 API is incompatible
- `GestureHandlerRootView` + `SafeAreaProvider` already at root in `App.tsx`

### Integration Points
- `src/screens/TrendingNowScreen.tsx` — replace `<FoundationScreen />` with the new `<TrendingFeedScreen />` (or build directly in TrendingNowScreen)
- `src/navigation/AppNavigator.tsx` — no changes needed; TrendingNow tab already points to TrendingNowScreen
- `expo-linking` installed — use `Linking.openURL(trend.url)` for tap-to-source; already in package.json

</code_context>

<specifics>
## Specific Ideas

- TrendCard should be extracted to `src/components/TrendCard.tsx` — Phase 16 bookmarks will need to render the same card in the Profile tab
- Arabic translation text (`ar_translation`) uses `writingDirection: 'rtl'` and `textAlign: 'right'` within the card — only the text element, not the entire card layout
- `paging.next_cursor` drives infinite scroll cursor handoff; when `null`, infinite scroll is disabled

</specifics>

<deferred>
## Deferred Ideas

- Collapsible filter header (platform/category/region chips) — Phase 14
- Bookmark icon on each card — Phase 16
- Category drill-down navigation from feed — Phase 15

</deferred>

---

*Phase: 13-trending-feed-cards*
*Context gathered: 2026-03-21*
