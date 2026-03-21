# Roadmap: Trenfy

## Milestones

- ✅ `v1.0 MVP` - Phases 1-5 (shipped 2015-03-20) - `.planning/milestones/v1.0-ROADMAP.md`
- ✅ `v1.1 Verification and Mobile Delivery` - Phase 6 (shipped 2015-03-20) - `.planning/milestones/v1.1-ROADMAP.md`
- ✅ `v1.2 Web Admin + Demo Feed` - Phases 7-10 (shipped 2015-03-21) - `.planning/milestones/v1.2-ROADMAP.md`
- 🚧 `v1.3 React Native Mobile App` - Phases 11-15 (active)

---

# Roadmap: Trenfy v1.3 React Native Mobile App

**Milestone:** v1.3
**Phases:** 11–15
**Requirements:** 44
**Coverage:** 100%

## Phases

- [x] **Phase 11: Foundation** — Rename scaffold to Trenfy, install packages, wire API client, purge mock data (completed 2015-03-21)
- [x] **Phase 12: Navigation Shell** — 3-tab bottom nav, nested stacks, safe area insets (completed 2015-03-21)
- [x] **Phase 13: Trending Feed + Cards** — FlashList feed, TrendCard component, pull-to-refresh, infinite scroll, search, skeletons, error/empty states (completed 2015-03-21)
- [x] **Phase 14: Filters** — Platform/category/region chips, collapsible animated header, active filter indicators, clear-all, persisted prefs (completed 2015-03-21)
- [ ] **Phase 15: Theming & Accessibility** — Dark mode, theme context, RTL Arabic text handling

## Phase Summary

| # | Phase | Goal | Requirements | Plans |
|---|-------|------|--------------|-------|
| 11 | Foundation | 4/4 | Complete    | 2015-03-21 |
| 12 | Navigation Shell | 3-tab nav with typed route params and safe area handling | NAV-01..03 | TBD |
| 13 | Trending Feed + Cards | Live FlashList feed with complete TrendCard and full feed lifecycle | FEED-01..07, CARD-01..07 | TBD |
| 14 | Filters | Platform/category/region filter chips with collapsible animated header and persistence | FLTR-01..07 | 3 plans (2015-03-21) |
| 15 | Theming & Accessibility | Dark mode on all screens, theme token context, RTL Arabic text in cards | THME-01..04 | 2 plans |

## Phase Details

### Phase 11: Foundation
**Goal:** Developer can build and run a Trenfy-branded app that fetches live data from the FastAPI backend with no mock data contamination.
**Depends on:** Nothing (first phase of milestone)
**Requirements:** MOBL-01, MOBL-02, MOBL-03, MOBL-04, MOBL-05
**Success Criteria** (what must be TRUE):
  1. Running `npx expo start` shows "Trenfy" as the app name with correct icon/splash — no "WhiteLabel" or "SehaRadar" branding visible
  2. A console log from the first screen render shows real backend JSON from the FastAPI `/api/trends` endpoint, not mock objects
  3. `grep -r mockData` and `grep -r starterCopy` across `src/` return zero results — both files deleted
  4. `npx tsc --noEmit` passes clean with all 8 new packages present in `package.json`
  5. Changing `EXPO_PUBLIC_API_URL` in `.env.local` redirects all API traffic — no NocoDB direct calls remain anywhere in the codebase
**Plans:** 4/4 plans complete
Plans:
- [x] 11-01-PLAN.md — Rebrand + purge mock data + install 8 packages
- [x] 11-02-PLAN.md — Retune theme tokens to Trenfy brand
- [x] 11-03-PLAN.md — API client layer (src/api/client.ts, trends.ts, .env.local)
- [x] 11-04-PLAN.md — FoundationScreen with live API preview + final App.tsx wiring

### Phase 12: Navigation Shell
**Goal:** App has a stable 3-tab navigation structure with TypeScript-enforced route params and correct safe area handling on both platforms.
**Depends on:** Phase 11
**Requirements:** NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Tapping the bottom tab bar cycles correctly between Trending Now, Categories, and Profile screens on both iOS and Android
  2. Tapping a category card from the Categories tab pushes a CategoryFeed screen onto the stack — the back button returns to the grid without losing scroll position
  3. No content is obscured by the device notch, status bar, or home indicator on iPhone and Android — tab bar sits above the home indicator
  4. TypeScript compilation fails with a type error if any `navigate()` call uses an unregistered route name
**Plans:** 2 plans
Plans:
- [x] 12-01-PLAN.md — Install Iconify packages + navigator types + stub screens
- [x] 12-02-PLAN.md — Rewrite AppNavigator (3-tab + category stack) + wire App.tsx

### Phase 13: Trending Feed + Cards
**Goal:** User can open the app and immediately see a live, scrollable feed of approved trends with complete card information and correct feed lifecycle handling.
**Depends on:** Phase 12
**Requirements:** FEED-01, FEED-02, FEED-03, FEED-04, FEED-05, FEED-06, FEED-07, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07
**Success Criteria** (what must be TRUE):
  1. Feed loads on first open showing real approved trends in a FlashList — each card displays title, Arabic translation (if available), thumbnail with placeholder, platform icon, metric value, and category badge
  2. Pulling down on the feed triggers a fresh API fetch and the list updates with any new trends within ~2 seconds
  3. Scrolling to the bottom of the feed automatically loads the next page of trends — no "load more" button required
  4. Typing in the search bar filters the visible trends to keyword matches in near-real-time
  5. First open shows a skeleton shimmer before real data appears — a blank white screen is never shown to the user
  6. If the API fetch fails, a descriptive error message and a "Retry" button are shown — tapping Retry re-fires the fetch
  7. Tapping any trend card opens the trend's source URL in the native browser (Safari/Chrome), not an in-app WebView
**Plans:** 3 plans
Plans:
- [x] 13-01-PLAN.md — TrendCard + SkeletonCard components (Wave 1)
- [x] 13-02-PLAN.md — useTrendFeed hook: pagination + search + refresh (Wave 1)
- [x] 13-03-PLAN.md — TrendingNowScreen rewrite: FlashList wiring + visual checkpoint (Wave 2)

### Phase 14: Filters
**Goal:** User can narrow the feed by platform, category, and region with a collapsible header that animates smoothly and remembers their preferences across restarts.
**Depends on:** Phase 13
**Requirements:** FLTR-01, FLTR-02, FLTR-03, FLTR-04, FLTR-05, FLTR-06, FLTR-07
**Success Criteria** (what must be TRUE):
  1. Tapping a platform chip (YouTube / X) re-fetches the feed filtered to that platform — tapping again deselects and shows all platforms
  2. Tapping a category chip filters the feed to that category — multiple category chips can be active simultaneously
  3. Tapping the region chip filters by region (e.g. Global vs SA) via the `region_code` backend parameter
  4. Scrolling down collapses the filter header via a translateY + opacity animation with no FlashList layout jump — scrolling up reveals it again at 60fps
  5. When filters are active and the header is collapsed, a badge on the feed header bar shows the count of active filters
  6. Tapping "Clear all" resets all chips to unselected state and reverts the feed to unfiltered results in one tap
  7. Closing and re-opening the app pre-selects the same platform and region chips the user last used
**Plans:** 3/3 plans complete
Plans:
- [x] 14-01-PLAN.md — Shared filter types, `fetchCategories()`, `useFilterPrefs()`, and filter-aware `useTrendFeed()`
- [x] 14-02-PLAN.md — `FilterChip` + `FilterHeader` reusable UI primitives and icon registry verification
- [x] 14-03-PLAN.md — `TrendingNowScreen` integration, collapsible header wiring, and verification closure with one deferred category-completeness gap

### Phase 15: Theming & Accessibility
**Goal:** The app renders correctly in dark mode on every screen and Arabic text displays with proper RTL direction without breaking the LTR card layout.
**Depends on:** Phase 13
**Requirements:** THME-01, THME-02, THME-03, THME-04
**Success Criteria** (what must be TRUE):
  1. Switching the device to dark mode in system settings causes every screen to re-render with dark backgrounds and light text — no hardcoded white or black colors remain visible
  2. Changing any color token in the theme context file propagates to all components referencing that token — no screen requires a separate hardcoded color override
  3. Arabic trend titles and `ar_translation` fields render with right-to-left text direction within the card — Arabic text does not overflow or clip the card bounds
  4. Cards containing Arabic text do not reposition the thumbnail, platform icon, or metric value — only the text elements use RTL direction; the overall card layout remains LTR
**Plans:** 2 plans
Plans:
- [ ] 15-01-PLAN.md — ThemeContext (dark/light palettes) + migrate all screens/components to useTheme()
- [ ] 15-02-PLAN.md — RTL Arabic text audit in TrendCard + visual verification checkpoint

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Foundation | 4/4 | ✅ Complete | 2015-03-21 |
| 12. Navigation Shell | 2/2 | ✅ Complete | 2015-03-21 |
| 13. Trending Feed + Cards | 3/3 | ✅ Complete | 2015-03-21 |
| 14. Filters | 3/3 | ✅ Complete | 2015-03-21 |
| 15. Theming & Accessibility | 0/2 | Not started | — |

---
*Roadmap created: 2015-03-21*
*Last updated: 2015-03-21 — Phase 14 verified complete; Phase 15 (Bookmarks + Profile) removed*
