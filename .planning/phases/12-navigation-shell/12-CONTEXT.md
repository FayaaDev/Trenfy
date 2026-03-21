# Phase 12: Navigation Shell - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 3-tab bottom navigation structure with TypeScript-enforced route params, a nested category stack for drill-down navigation, and correct safe area handling on both iOS and Android. This phase creates the structural skeleton that all downstream phases (13–16) plug real screens into. No real feed content ships here — Trending Now reuses the Phase 11 FoundationScreen as a live-data placeholder.

</domain>

<decisions>
## Implementation Decisions

### Tab labels & icons
- **D-01:** Three tabs, exact labels: **Trending Now**, **Categories**, **Profile** (matches NAV-01 spec verbatim — no abbreviation)
- **D-02:** Icon library: **Iconify** (not Ionicons from existing AppNavigator). Specific icons:
  - Trending Now: `streamline-plump:trending-content`
  - Categories: `si:grid-line`
  - Profile: `iconamoon:profile-fill`
- **D-03:** Planner must verify Expo-compatible Iconify package (e.g. `@iconify/react-native` or equivalent) — existing AppNavigator uses `@expo/vector-icons` Ionicons which is not the target.

### Placeholder screen strategy
- **D-04:** **Trending Now tab** reuses the existing `FoundationScreen` (live API data, Refresh button) as its placeholder until Phase 13 ships the full feed. Do not replace it with a blank stub — real data should remain visible after Phase 12.
- **D-05:** **Categories tab** shows a minimal stub: dark background (`colors.background`), centered label "Categories". No data, no skeleton grid.
- **D-06:** **Profile tab** shows a minimal stub: dark background (`colors.background`), centered label "Profile". No data.
- **D-07:** Stub screens for Categories and Profile should be thin placeholder components — they will be replaced entirely in Phases 15 and 16 respectively.

### Category stack params
- **D-08:** The Categories tab hosts a nested native stack with two screens: `CategoryList` (root) and `CategoryFeed` (detail).
- **D-09:** `CategoryFeedScreen` TypeScript params: `{ categoryId: string; categoryName: string }` — minimal contract. Phase 15 (Categories Tab) derives all other data from the API using these params.
- **D-10:** `CategoryFeedScreen` uses the **native stack header** with `categoryName` as the screen title. No custom header inside the screen.
- **D-11:** TypeScript compilation must fail if any `navigate()` call uses an unregistered route name — typed param list is mandatory for the root tab navigator and the category stack.

### Tab bar visual style
- **D-12:** Tab bar height: **88** (carry over from existing AppNavigator — tested value with safe area).
- **D-13:** Tab bar background: `colors.surface` (`#111827`) with `colors.border` top border — consistent with brand tokens from Phase 11.
- **D-14:** Active tint: `colors.primary` (`#14B8A6` teal). Inactive tint: `colors.muted`.
- **D-15:** Tab label font: fontSize 12, fontWeight '600' — carry from existing AppNavigator.

### the agent's Discretion
- Exact `paddingTop` / `paddingBottom` values within the height-88 constraint.
- Whether stub screen labels use `typography.headingSmall` or `typography.bodyLarge` tokens.
- How to structure the TypeScript navigator type files (single file vs separate files per navigator).
- Whether `CategoryListScreen` stub content is blank or shows a "coming in Phase 15" hint.
- Iconify package selection and installation approach (subject to Expo SDK 53 compatibility check).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition and requirements
- `.planning/ROADMAP.md` — Phase 12 goal, success criteria (TypeScript enforcement, safe area, back-stack behavior), and dependency on Phase 11.
- `.planning/REQUIREMENTS.md` — `NAV-01`, `NAV-02`, `NAV-03`: 3-tab nav, nested category stack drill-down, safe area insets on iOS and Android.
- `.planning/PROJECT.md` — v1.3 milestone intent; 3-tab navigation is the consumer app structure.

### Phase 11 foundation (must not regress)
- `.planning/phases/11-foundation/11-CONTEXT.md` — Brand tokens (midnight/teal/amber), FoundationScreen live-data proof, removal of old navigation shell from active path, StyleSheet-only styling convention.

### Design reference (carries forward from Phase 11)
- `https://reactnativereusables.com/docs` — Same UI/component reference as Phase 11. Follow React Native-native patterns; no web-only UI guidance.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WhiteLabelApp/src/navigation/AppNavigator.tsx` — Existing 4-tab navigator (Home, Library, Activity, Profile). Contains the tab bar style, `RootTabParamList`, `navigationTheme`, and Ionicons icon switch pattern. **Replace entirely** — do not extend. Reference for tab bar style values (height: 88, paddingBottom: 10, paddingTop: 10, surface bg, border color, active/inactive tints).
- `WhiteLabelApp/src/screens/FoundationScreen.tsx` — Becomes the Trending Now tab placeholder. Wire it directly into the tab — no changes needed to the screen itself.
- `WhiteLabelApp/src/theme/tokens.ts` — All styling tokens locked: `colors.background`, `colors.surface`, `colors.border`, `colors.primary`, `colors.muted`. No new tokens needed for the shell.
- `WhiteLabelApp/src/types/index.ts` — `Trend`, `TrendFilters`, `TrendsListResponse` types defined; `Trend.id` is the `categoryId` analog pattern to follow for category params.

### Established Patterns
- `App.tsx` — `GestureHandlerRootView` + `SafeAreaProvider` already at root. Phase 12 wraps `AppNavigator` inside these — do not duplicate the providers.
- `StyleSheet`-based styling throughout — no NativeWind, no styled-components.
- `@react-navigation/bottom-tabs` `^7.3.14` and `@react-navigation/native-stack` `^7.3.14` already installed. No new navigation packages needed beyond Iconify.
- `react-native-screens` `~4.11.1` and `react-native-safe-area-context` `5.4.0` installed — safe area hooks (`useSafeAreaInsets`) available.

### Integration Points
- `WhiteLabelApp/App.tsx` — Replace `<FoundationScreen />` with `<AppNavigator />` to activate the tab shell. `SafeAreaProvider` and `GestureHandlerRootView` stay in place.
- `WhiteLabelApp/src/navigation/AppNavigator.tsx` — Full rewrite: rename tabs, swap Ionicons for Iconify, replace 4 old screens with 3 Trenfy screens, add category nested stack.
- Old screens (`HomeScreen`, `LibraryScreen`, `ActivityScreen`) — These can remain in the codebase during Phase 12 but are no longer referenced by the navigator. They will be removed or replaced in Phases 13–16.

</code_context>

<specifics>
## Specific Ideas

- Iconify icons requested: `streamline-plump:trending-content` (Trending Now), `si:grid-line` (Categories), `iconamoon:profile-fill` (Profile). Planner must verify these exist in the Iconify registry and that a React Native-compatible package is available for Expo SDK 53.
- Design direction follows `reactnativereusables.com/docs` — same reference as Phase 11. Agent should use React Native-native component patterns rather than web-translated UI guidance.
- "Trending Now" is the exact label (not "Trending", not "Feed") — this matches the requirements spec copy.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-navigation-shell*
*Context gathered: 2026-03-21*
