# Requirements: Trenfy v1.3 React Native Mobile App

**Defined:** 2026-03-21
**Core Value:** Users can open the app and immediately see what's trending right now across gaming, music, and entertainment — filtered to what they care about, tappable to the source.

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Scaffold (MOBL)

- [ ] **MOBL-01**: Developer can run the app under the Trenfy brand (app.json name, bundle ID, icon, splash updated; WhiteLabelApp renamed/restructured)
- [ ] **MOBL-02**: App connects to the Trenfy FastAPI backend via a configurable base URL (`EXPO_PUBLIC_API_URL`)
- [ ] **MOBL-03**: App does not call NocoDB directly; all data flows through FastAPI endpoints only
- [ ] **MOBL-04**: Required packages are installed and the app builds cleanly (FlashList ~2.3, Reanimated ~3.19.5, expo-image, expo-sqlite kv-store, expo-linking, expo-web-browser)
- [ ] **MOBL-05**: All white-label mock data and placeholder copy are removed; no `mockData.ts` or `starterCopy.ts` imports remain in any screen

### Navigation (NAV)

- [ ] **NAV-01**: App has 3-tab bottom navigation: Trending Now, Categories, Profile
- [ ] **NAV-02**: Categories tab supports drill-down: tapping a category card navigates to a category-filtered feed (nested stack)
- [ ] **NAV-03**: All screens handle safe area insets correctly on iOS and Android

### Trending Feed (FEED)

- [ ] **FEED-01**: User can see a FlashList feed of approved trends on the Trending Now tab
- [ ] **FEED-02**: User can pull-to-refresh the feed to trigger a fresh fetch from the backend
- [ ] **FEED-03**: User can scroll to the bottom to automatically load more trends (infinite scroll / cursor pagination)
- [ ] **FEED-04**: User can search trends by keyword using a search bar in the feed header
- [ ] **FEED-05**: User sees a loading skeleton while the feed is initially fetching
- [ ] **FEED-06**: User sees a meaningful error state with a retry button if the fetch fails
- [ ] **FEED-07**: User sees an empty state message when no trends match the current filters

### Trend Card (CARD)

- [ ] **CARD-01**: Trend card displays the trend title
- [ ] **CARD-02**: Trend card displays the Arabic translation when available
- [ ] **CARD-03**: Trend card displays a thumbnail image via expo-image with a placeholder for missing images
- [ ] **CARD-04**: Trend card displays the platform icon (YouTube / X)
- [ ] **CARD-05**: Trend card displays the metric value (view count / engagement count)
- [ ] **CARD-06**: Trend card displays a category badge
- [ ] **CARD-07**: Tapping a trend card opens the source URL in the native browser via `Linking.openURL`

### Filters (FLTR)

- [ ] **FLTR-01**: User can filter trends by platform (YouTube / X) using chips in the feed header
- [ ] **FLTR-02**: User can filter trends by category using chips in the feed header
- [ ] **FLTR-03**: User can filter trends by region using a region chip (maps to `region_code` backend param)
- [ ] **FLTR-04**: The filter header collapses on scroll-down and reappears on scroll-up (Reanimated 3 animation, translates Y+opacity, does NOT animate height)
- [ ] **FLTR-05**: Active filter state is visually indicated (highlighted chip color, active filter count badge)
- [ ] **FLTR-06**: User can clear all active filters with a single tap
- [ ] **FLTR-07**: Selected platform and region filter preferences persist across app restarts (expo-sqlite kv-store)

### Categories (CATS)

- [ ] **CATS-01**: User can see a grid of rich category cards showing name, trend count, and a top trend preview
- [ ] **CATS-02**: Tapping a category card navigates to a filtered feed showing only that category's trends
- [ ] **CATS-03**: Category-filtered feed supports pull-to-refresh and infinite scroll

### Bookmarks (BKMK)

- [ ] **BKMK-01**: User can bookmark a trend from the trend card
- [ ] **BKMK-02**: Bookmarked trends are visible in the Profile tab as a saved list
- [ ] **BKMK-03**: Bookmarks persist across app restarts (stored locally via expo-sqlite kv-store)
- [ ] **BKMK-04**: User can remove a bookmark from the saved list

### Profile & Preferences (PROF)

- [ ] **PROF-01**: User can set a default region preference that pre-selects the region filter on app launch
- [ ] **PROF-02**: User can set default platform preferences that pre-select platform chips on app launch
- [ ] **PROF-03**: User preferences persist across app restarts (expo-sqlite kv-store)
- [ ] **PROF-04**: Profile tab shows the user's saved trends (bookmarks) list

### Theming & Accessibility (THME)

- [ ] **THME-01**: App follows the system dark/light mode setting (`useColorScheme`) — all screens render correctly in both modes
- [ ] **THME-02**: A theme context provides typed color tokens for all components; no hardcoded color values remain in UI code
- [ ] **THME-03**: Arabic trend titles and translations render with correct RTL text direction within cards
- [ ] **THME-04**: Arabic RTL text content does not break the LTR card layout (mixed-direction handled correctly per-element, not app-level flip)

## Future Requirements (v1.4+)

### Authentication

- **AUTH-01**: User can sign in with Google (Google Sign-In via `@react-native-google-signin/google-signin`)
- **AUTH-02**: User can sign in with Apple (required by App Store if any social login exists)
- **AUTH-03**: Signed-in user's bookmarks and preferences sync to the backend
- **AUTH-04**: User can sign out and bookmarks/preferences revert to local-only mode

### Sync & Notifications

- **SYNC-01**: Cross-device bookmark sync for authenticated users
- **NOTF-01**: Push notifications for breaking trends

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social sign-in in v1.3 | No backend auth endpoint; requires dev build; deferred to v1.4 |
| Cross-device bookmark sync | Depends on auth backend (v1.4) |
| Push notifications | Out of scope until post-auth infrastructure exists |
| Trend history / charts | Not a v1 consumer value; high complexity |
| Admin features on mobile | Already in web admin panel |
| In-app WebView for sources | Anti-pattern; native browser provides share/translate/reading mode |
| Video playback in-app | Storage/bandwidth; opens source instead |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOBL-01 | Phase 11 | Pending |
| MOBL-02 | Phase 11 | Pending |
| MOBL-03 | Phase 11 | Pending |
| MOBL-04 | Phase 11 | Pending |
| MOBL-05 | Phase 11 | Pending |
| NAV-01 | Phase 12 | Pending |
| NAV-02 | Phase 12 | Pending |
| NAV-03 | Phase 12 | Pending |
| FEED-01 | Phase 13 | Pending |
| FEED-02 | Phase 13 | Pending |
| FEED-03 | Phase 13 | Pending |
| FEED-04 | Phase 13 | Pending |
| FEED-05 | Phase 13 | Pending |
| FEED-06 | Phase 13 | Pending |
| FEED-07 | Phase 13 | Pending |
| CARD-01 | Phase 13 | Pending |
| CARD-02 | Phase 13 | Pending |
| CARD-03 | Phase 13 | Pending |
| CARD-04 | Phase 13 | Pending |
| CARD-05 | Phase 13 | Pending |
| CARD-06 | Phase 13 | Pending |
| CARD-07 | Phase 13 | Pending |
| FLTR-01 | Phase 14 | Pending |
| FLTR-02 | Phase 14 | Pending |
| FLTR-03 | Phase 14 | Pending |
| FLTR-04 | Phase 14 | Pending |
| FLTR-05 | Phase 14 | Pending |
| FLTR-06 | Phase 14 | Pending |
| FLTR-07 | Phase 14 | Pending |
| CATS-01 | Phase 15 | Pending |
| CATS-02 | Phase 15 | Pending |
| CATS-03 | Phase 15 | Pending |
| BKMK-01 | Phase 16 | Pending |
| BKMK-02 | Phase 16 | Pending |
| BKMK-03 | Phase 16 | Pending |
| BKMK-04 | Phase 16 | Pending |
| PROF-01 | Phase 16 | Pending |
| PROF-02 | Phase 16 | Pending |
| PROF-03 | Phase 16 | Pending |
| PROF-04 | Phase 16 | Pending |
| THME-01 | Phase 17 | Pending |
| THME-02 | Phase 17 | Pending |
| THME-03 | Phase 17 | Pending |
| THME-04 | Phase 17 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
