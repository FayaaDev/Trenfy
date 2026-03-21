# Pitfalls Research: React Native Mobile App

**Domain:** Adding React Native mobile consumer app to existing Expo white-label scaffold
**Milestone:** Trenfy v1.3
**Researched:** 2026-03-21
**Overall Confidence:** HIGH (FlashList, RN I18nManager, Reanimated, Expo Auth from official docs; FastAPI CORS from official docs; scaffold analysis from codebase inspection)

---

## Scaffold Refactor Pitfalls

*Evolving the WhiteLabelApp scaffold (4 tabs, mock data, generic copy) into the real Trenfy consumer app.*

### Pitfall 1: Stale Mock Data Imported Alongside Real API Data

**What goes wrong:**
`starterFeed`, `heroMetrics`, `activityEntries`, `workspaceCards`, `brandPresets`, and `starterProfile` from `src/data/mockData.ts` remain imported in screens that have been partially wired to the live API. The real feed appears to work but sections still render generic placeholder content (e.g. "Avery Quinn, Product Lead, Northwind Studio" in the Profile screen, or "Active boards: 12" metric cards). These are invisible in isolation but embarrassing in production.

**Why it happens:**
Screens are large components with many sub-sections. The developer wires the main feed list but forgets to audit every `import` at the top of the file. WhiteLabelApp currently has **two separate data sources**: `mockData.ts` (structural data) and `starterCopy.ts` (UI copy strings). Both must be purged.

**Specific imports to hunt in this codebase:**
- `HomeScreen.tsx` imports `{ heroMetrics, starterFeed }` from `../data/mockData` — `heroMetrics` populates the stat cards row
- `HomeScreen.tsx` imports `{ homeCopy }` from `../data/starterCopy` — copy strings like "White-label starter", "Home", "Starter overview"
- `ProfileScreen.tsx` likely imports `starterProfile` (name/role/company), `brandPresets`, and `profileCopy`
- `ActivityScreen.tsx` likely imports `activityEntries` and `activityCopy`
- `LibraryScreen.tsx` likely imports `workspaceCards` and `libraryCopy`

**Warning signs:**
- Hardcoded name "Avery Quinn" or role "Product Lead" appears anywhere in the app
- "White-label starter" eyebrow text survives in the Home header
- "Starter feed" section header appears instead of "Trending Now"
- Metric cards show static numbers (12, 28, 43) not derived from API
- `starterCopy.ts` and `mockData.ts` files still exist and have any imports pointing to them

**Prevention:**
1. At the start of refactor, grep the codebase for every import of `mockData` and `starterCopy` — remove all references before adding API calls, not after
2. Delete `starterCopy.ts` and `mockData.ts` only once every screen has been fully ported — deletion forces TS errors on any missed reference
3. Run TypeScript strict check (`tsc --noEmit`) after deletion to surface any lingering references

**Phase to address:** Phase 1 (scaffold restructure) — first task before any feature work

---

### Pitfall 2: Broken Imports After Renaming Screens and Components

**What goes wrong:**
Renaming `HomeScreen` → `TrendingNowScreen`, `LibraryScreen` → `CategoriesScreen`, `ActivityScreen` → `(deleted)` causes cascading import failures in `AppNavigator.tsx` and any component referencing screen names directly via `navigation.navigate('Library')`. TypeScript catches the component imports but not the string-based route names.

**Why it happens:**
React Navigation uses string route names (e.g. `'Library'`) in `navigation.navigate()` calls and `route.name` comparisons. Renaming the tab definition doesn't auto-update all `navigate()` callsites.

**Specific danger in this codebase:**
`AppNavigator.tsx` line 79 has `Tab.Screen name="Library"` and line 78 has `name="Activity"` — these string names propagate throughout the app anywhere `navigation.navigate('Library')` is called. The `RootTabParamList` type (`type RootTabParamList`) must be updated simultaneously.

**Warning signs:**
- Runtime error: "The action 'NAVIGATE' with payload {"name":"Library"} was not handled by any navigator"
- TypeScript error on `navigate()` calls if `RootTabParamList` is updated first (good — catch these)
- Tab icons pointing to old route names via `route.name` switch/case in `AppNavigator.tsx`

**Prevention:**
1. Update `RootTabParamList` type first — this causes TS errors everywhere old names are used, turning them into a checklist
2. Update `AppNavigator.tsx` tab names and screen registrations simultaneously
3. Global search for all string literals matching old screen names: `'Home'`, `'Library'`, `'Activity'`

**Phase to address:** Phase 1 (scaffold restructure)

---

### Pitfall 3: `app.json` / `app.config.js` Still Has White-Label Branding

**What goes wrong:**
The app builds with `name: "WhiteLabelApp"`, `slug: "whitelabelapp"`, and possibly a generic bundle ID. Expo push notifications, deep links, and EAS build profiles all use the slug and bundle ID. Changing these after an initial EAS build requires re-registration.

**Why it happens:**
`app.json` feels like a "configuration file, not code" and gets overlooked during a feature-first refactor.

**Warning signs:**
- App icon still shows "WL" initials instead of Trenfy branding
- App store submission rejects due to wrong bundle ID
- Deep link scheme is `whitelabelapp://` instead of `trenfy://`

**Prevention:**
Update `app.json` in the very first commit of the milestone:
- `name`, `slug`, `scheme` (for deep links used by Google/Apple auth)
- `ios.bundleIdentifier`, `android.package`
- `icon`, `splash` assets

**Phase to address:** Phase 1 (scaffold restructure) — day one

---

### Pitfall 4: Navigation Tab Height Hardcoded for One Device Family

**What goes wrong:**
`AppNavigator.tsx` line 48 hardcodes `height: 88` for the tab bar. This is tuned for iPhone with home indicator. On Android or older iPhones without a home indicator, the tab bar renders with excessive or insufficient bottom padding.

**Why it happens:**
Scaffold was built for iOS preview only. The hardcoded value works on the target device but breaks elsewhere.

**Prevention:**
Use `useSafeAreaInsets()` from `react-native-safe-area-context` to calculate tab bar height dynamically: `height: 60 + insets.bottom`. This is already a dependency in the scaffold.

**Phase to address:** Phase 1 (scaffold restructure)

---

## FlashList Pitfalls

*Replacing `ScrollView`+`.map()` (current scaffold pattern in `HomeScreen.tsx`) with FlashList for the trend feed.*

### Pitfall 5: Leaving `key` Props on Item Components (Critical Performance Bug)

**What goes wrong:**
FlashList's entire performance advantage is **cell recycling** — when an item scrolls off screen, the component is reused with a new `item` prop instead of being unmounted and remounted. Adding a `key` prop that changes between items (e.g. `key={item.id}`) forces React to treat each recycled component as a completely different component, destroying and recreating the entire render tree. FlashList effectively degrades to worse-than-FlatList performance.

**Why it happens:**
The current scaffold uses `.map()` with `key={item.id}` (standard React pattern). When migrating to FlashList, developers carry over the mental model of "always provide keys" without understanding that FlashList manages identity differently.

**Direct evidence from FlashList docs:**
> "Using `key` prop inside your item and item's nested components will highly degrade performance. Make sure your item components and their nested components don't have a `key` prop."

**Specific risk in this codebase:**
`HomeScreen.tsx` currently uses `filteredItems.map((item) => (<FeedCard key={item.id} .../>))`. When migrating to FlashList, the `key` on `FeedCard` must be removed. Any `.map()` **inside** a `renderItem` component also needs `key` replaced with `useMappingHelper`.

**Warning signs:**
- `onBlankArea` reports consistently high blank area values (items not being recycled)
- Performance in dev mode looks acceptable but release mode feels like FlatList
- Memory usage grows linearly as you scroll (items not being freed from the pool)

**Prevention:**
```tsx
// WRONG — kills recycling
<FlashList renderItem={({ item }) => <TrendCard key={item.id} item={item} />} />

// CORRECT — keyExtractor is separate from key prop
<FlashList
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <TrendCard item={item} />}
/>
```
For `.map()` inside renderItem, use `useMappingHelper` from `@shopify/flash-list`.

**Phase to address:** Phase 2 (trend feed)

---

### Pitfall 6: State Bugs from Cell Recycling (useState Stale Data)

**What goes wrong:**
A `TrendCard` component has local state — e.g. `const [isBookmarked, setIsBookmarked] = useState(false)`. When FlashList recycles this component for a different trend item, the `item` prop updates but `isBookmarked` retains its previous value. The bookmark icon shows as active for the wrong item.

**Why it happens:**
`useState` initial value only runs once per component instance. When a recycled component receives a new `item` prop, the state doesn't reset.

**Prevention — two approaches:**

1. **Use `useRecyclingState` from FlashList** (recommended):
```tsx
import { useRecyclingState } from "@shopify/flash-list";
const [isBookmarked, setIsBookmarked] = useRecyclingState(
  false,
  [item.id],   // resets when item.id changes
);
```

2. **Derive state from item data** (preferred for Trenfy):
Store bookmarks in a parent-level Set/Map (or AsyncStorage), not in the card component. The card receives `isBookmarked={savedIds.has(item.id)}` as a prop. No local state to get stale.

**Phase to address:** Phase 2 (trend feed) + Phase 5 (profile/bookmarks)

---

### Pitfall 7: Incorrect `estimatedItemSize` Causing Initial Layout Jank

**What goes wrong:**
FlashList v1 used `estimatedItemSize` as a critical rendering hint. **FlashList v2 no longer uses `estimatedItemSize` for size estimates** — this prop is now deprecated for layout sizing purposes. However, if you're running v1 and provide a wildly wrong estimate (e.g. `estimatedItemSize={50}` for cards that render at 180px), FlashList allocates an incorrect initial recycle pool size and the first render shows blank cells or layout jumps.

**Current state (v2.x as of March 2026):**
FlashList v2 removed `estimatedItemSize` from layout calculations. `overrideItemLayout` (v1's prop) no longer accepts a size parameter in v2 — only `span` is supported. Do not attempt to set size estimates via `overrideItemLayout` in v2.

**Prevention for Trenfy (v2):**
- Use `getItemType` to provide separate recycling pools for different card types (trend card vs. section header vs. load-more footer)
- Measure actual rendered card height during development via `onLayout` and use `useLayoutState` for expandable cards

**Phase to address:** Phase 2 (trend feed)

---

### Pitfall 8: FlashList Requires Explicit Dimensions — Cannot Be in a `ScrollView`

**What goes wrong:**
Placing `FlashList` inside a `ScrollView` causes a layout error: FlashList cannot determine its own height when inside a scroll container. The list renders with zero height or a flash of blank content.

**Why it happens:**
Coming from the scaffold's `HomeScreen.tsx` pattern where the entire screen is wrapped in a `ScrollView` (line 101). Developers attempt to keep this wrapper and embed FlashList inside it.

**Prevention:**
The Trending Now screen must be restructured so FlashList **is** the scroll container. Use `ListHeaderComponent` and `ListFooterComponent` props for the collapsible filter header and load-more spinner — do NOT nest these in a ScrollView above the list.

```tsx
// WRONG
<ScrollView>
  <FilterHeader />
  <FlashList data={trends} renderItem={renderTrend} />
</ScrollView>

// CORRECT
<FlashList
  data={trends}
  renderItem={renderTrend}
  ListHeaderComponent={<FilterHeader />}
  onScroll={scrollHandler}
/>
```

**Phase to address:** Phase 2 (trend feed) — screen architecture decision

---

### Pitfall 9: `onEndReached` Fires Multiple Times (Infinite Scroll Loop)

**What goes wrong:**
`onEndReached` triggers during the initial render and on every scroll near the end, causing multiple simultaneous page fetches. The pagination state becomes corrupted.

**Why it happens:**
`onEndReachedThreshold` defaults to 0.5 (fire when 50% of remaining content is visible). On short lists or slow networks, the threshold is immediately hit on first render.

**Prevention:**
```tsx
const isLoadingMore = useRef(false);

const handleEndReached = useCallback(() => {
  if (isLoadingMore.current || !hasNextPage) return;
  isLoadingMore.current = true;
  fetchNextPage().finally(() => { isLoadingMore.current = false; });
}, [hasNextPage, fetchNextPage]);

<FlashList
  onEndReached={handleEndReached}
  onEndReachedThreshold={0.2}  // more conservative than default
/>
```

**Phase to address:** Phase 2 (trend feed) — infinite scroll implementation

---

## Social Auth Pitfalls

*Implementing Expo Google and Apple sign-in for the Profile tab's optional auth.*

### Pitfall 10: Google Sign-In Broken in Expo Go — Requires Development Build

**What goes wrong:**
`@react-native-google-signin/google-signin` uses native code and **cannot run in Expo Go**. Developers test in Expo Go, everything appears to work in non-auth flows, then the auth button silently fails or throws a "Native module not found" error.

**Authoritative source:** Expo docs (January 2026): "The `@react-native-google-signin/google-signin` library can't be used in the Expo Go app because it requires custom native code."

**Prevention:**
- Wire up Google auth only after creating a development build via EAS or local `npx expo run:ios` / `npx expo run:android`
- `expo-apple-authentication` **can** be tested in Expo Go on iOS — but values received in Expo Go will differ from standalone app values
- Add clear TODO comments in the Profile screen noting that auth only works in development builds, not Expo Go

**Phase to address:** Phase 4 (profile/auth)

---

### Pitfall 11: Wrong SHA-1 Fingerprint for Android Google Sign-In

**What goes wrong:**
Google Sign-In works on iOS but fails on Android with "DEVELOPER_ERROR" or "10: DEVELOPER_ERROR". The Android app cannot authenticate because the SHA-1 certificate fingerprint registered in Firebase/Google Cloud Console doesn't match the certificate actually used to sign the APK.

**Why it happens:**
There are multiple SHA-1 values:
1. **Debug keystore** — used when running `npx expo run:android`
2. **EAS Build upload key** — used when building with EAS
3. **Google Play App Signing key** — used by Google when distributing via Play Store

Each environment needs its own OAuth client ID registered in Google Cloud Console.

**Prevention:**
For Trenfy v1.3 (development/testing phase):
1. Register the debug SHA-1: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
2. If using EAS Build, get the upload key SHA-1 from EAS: `eas credentials`
3. Create separate OAuth 2.0 client IDs for each fingerprint

**Phase to address:** Phase 4 (profile/auth)

---

### Pitfall 12: Apple Sign-In — User Name and Email Only Provided Once (Ever)

**What goes wrong:**
`AppleAuthentication.signInAsync()` returns `fullName` and `email` on the very first sign-in. On all subsequent sign-ins from the same device, these fields return `null`. If the app doesn't persist this data immediately after the first sign-in, it's lost permanently.

**Authoritative source:** Expo Apple Authentication docs: "You will only receive Apple Authentication Credentials the first time users sign into your app, so you must store it for later use."

**What this means for Trenfy:**
The Profile screen must save the user's name/email to persistent local storage (AsyncStorage or expo-secure-store) on the **first** successful sign-in response before doing anything else.

**Prevention:**
```tsx
const credential = await AppleAuthentication.signInAsync({ ... });

// Save immediately — this data won't come back
if (credential.fullName || credential.email) {
  await AsyncStorage.setItem('userProfile', JSON.stringify({
    name: formatFullName(credential.fullName),
    email: credential.email,
    userId: credential.user,
  }));
}
```

**Phase to address:** Phase 4 (profile/auth)

---

### Pitfall 13: Apple Sign-In iOS-Only — No Android/Web Fallback Handled

**What goes wrong:**
`expo-apple-authentication` is iOS and tvOS only. Calling `AppleAuthentication.isAvailableAsync()` on Android returns `false`, but developers often skip this check and render the Apple button unconditionally, causing the button to be invisible without explanation, or worse, calling `signInAsync()` on Android throws an error.

**Authoritative source:** Expo docs: "`expo-apple-authentication` provides Apple authentication for iOS. It does not yet support Android or web."

**Prevention:**
```tsx
const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

useEffect(() => {
  AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
}, []);

// Only render Apple button if available
{appleAuthAvailable && <AppleAuthenticationButton ... />}
```

**Phase to address:** Phase 4 (profile/auth)

---

### Pitfall 14: Google Auth Redirect URI / Scheme Not Configured in `app.json`

**What goes wrong:**
Google OAuth flow redirects back to the app using a custom URL scheme (e.g. `com.trenfy.app://`). If `scheme` is not set in `app.json`, or set incorrectly, the OAuth redirect lands in the browser instead of returning to the app. The user is left on a blank browser tab with an access token that the app never receives.

**Prevention:**
In `app.json`:
```json
{
  "expo": {
    "scheme": "trenfy",
    "ios": { "bundleIdentifier": "com.trenfy.app" },
    "android": { "package": "com.trenfy.app" }
  }
}
```
The scheme must match the redirect URI registered in Google Cloud Console exactly (e.g. `trenfy://`).

**Phase to address:** Phase 1 (scaffold restructure — set scheme) + Phase 4 (auth)

---

## Dark Mode Pitfalls

*Adding dark mode to the existing scaffold, which uses a hardcoded light-only color token file (`tokens.ts`).*

### Pitfall 15: Hardcoded Colors Surviving the Theming Pass (Most Common Mistake)

**What goes wrong:**
The `tokens.ts` file exports a `colors` object with hardcoded light-mode values (e.g. `background: '#F5F7FB'`, `text: '#111827'`). When dark mode is added, a new `darkColors` object is created and `useColorScheme()` is used to pick the right set. But **hundreds of inline style references** remain scattered across component files as raw hex strings: `color: '#111827'`, `backgroundColor: '#FFFFFF'`, `shadowColor: '#0F172A'`. These do not respond to theme changes.

**Specific risk in this codebase:**
`HomeScreen.tsx` (and other screens) extensively uses `colors.text`, `colors.surface`, etc. — these **will** update correctly. But `StyleSheet.create()` at the bottom of each file is called **once at module load time**, not on re-render. Any `StyleSheet.create()` that references `colors.X` will be static — dark mode won't update it.

**Why `StyleSheet.create()` with imported `colors` doesn't work for dark mode:**
```tsx
// BAD — styles computed once at import time
const styles = StyleSheet.create({
  title: { color: colors.text }  // always light mode color
});

// CORRECT — compute styles dynamically per render
function MyComponent() {
  const { colors } = useTheme(); // or useColorScheme() + local lookup
  return <Text style={{ color: colors.text }}>...</Text>;
}
// OR use StyleSheet but recreate on theme change:
const styles = createStyles(colors); // call in component body or useMemo
```

**Prevention strategy for Trenfy:**
1. Replace static `tokens.ts` `colors` export with a `useThemeColors()` hook that returns the right palette based on `useColorScheme()`
2. Move `StyleSheet.create()` calls inside a `createStyles(colors)` function called within each component
3. Search for every hex color literal in component files after the theme pass — any remaining `#XXXXXX` outside of `tokens.ts` is a bug

**Warning signs:**
- Background switches between light/dark but text colors and borders remain light-mode values
- `StyleSheet.create()` called at module level with `colors.X` references

**Phase to address:** Phase 3 (dark mode theming)

---

### Pitfall 16: `expo-system-ui` Missing on Android Causes Dark Mode to Be Ignored

**What goes wrong:**
`userInterfaceStyle: "automatic"` is set in `app.json` but on Android the app always renders in light mode. No error is shown; dark mode silently doesn't work.

**Authoritative source:** Expo docs (February 2026): "When you are creating a development build, you have to install `expo-system-ui` to support the appearance styles for Android. Otherwise, the `userInterfaceStyle` property is ignored."

**Prevention:**
```bash
npx expo install expo-system-ui
```
Also verify with: `npx expo config --type introspect` — if misconfigured, Expo warns: "» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature."

**Phase to address:** Phase 3 (dark mode theming) — install before testing Android dark mode

---

### Pitfall 17: Navigation Theme Not Updated for Dark Mode

**What goes wrong:**
The app's `NavigationContainer` in `AppNavigator.tsx` uses a `navigationTheme` object (lines 21-31) with hardcoded `colors.background`, `colors.surface` etc. When dark mode is enabled, the navigation chrome (header backgrounds, tab bar, cards) remains light because the navigation theme was computed once at module load time.

**Prevention:**
Pass the navigation theme dynamically, derived from `useColorScheme()`:
```tsx
export default function AppNavigator() {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? darkColors : lightColors;

  const navigationTheme = {
    ...DefaultTheme,
    dark: colorScheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: themeColors.background,
      card: themeColors.surface,
      // ...
    },
  };

  return <NavigationContainer theme={navigationTheme}>...</NavigationContainer>;
}
```

**Phase to address:** Phase 3 (dark mode theming)

---

### Pitfall 18: `useColorScheme` Returns `null` Before First Render

**What goes wrong:**
On first render before the system theme is determined, `useColorScheme()` returns `null`. Code that does `colorScheme === 'dark' ? darkColors : lightColors` defaults to light mode correctly, but code that does `if (colorScheme === 'dark') { ... }` without a null check can behave unexpectedly on initial load.

**Prevention:**
```tsx
const colorScheme = useColorScheme() ?? 'light'; // default to light
```

**Phase to address:** Phase 3 (dark mode theming)

---

## RTL Pitfalls

*Adding RTL layout support for Arabic content in the Trenfy feed.*

### Pitfall 19: `I18nManager` Changes Require App Restart — Cannot Be Toggled at Runtime

**What goes wrong:**
Developers call `I18nManager.forceRTL(true)` in a runtime toggle (e.g. a settings switch) expecting the layout to flip immediately. The layout does NOT change until the app is fully restarted. The toggle appears to have no effect, leading to the mistaken conclusion that RTL support is broken.

**Authoritative source:** React Native I18nManager docs (February 2026): "`forceRTL`: Changes take full effect on the next application start, not immediately. The setting is persisted across app restarts. Only meant for development and testing."

**Warning signs:**
- RTL toggle switches visually but layout doesn't change
- Layout changes after app restart but not before

**Prevention:**
After toggling RTL, always show a prompt: "Restart the app to apply RTL layout." Use `RNRestart` or `Updates.reloadAsync()` from `expo-updates` to programmatically restart if needed.

**Phase to address:** Phase 6 (RTL support)

---

### Pitfall 20: `left`/`right` Style Properties Don't Respect RTL

**What goes wrong:**
Components styled with absolute positioning (`position: 'absolute', left: 16`) or specific margin/padding (`paddingLeft`, `marginRight`) do NOT automatically flip in RTL. The layout is hardcoded to LTR regardless of `I18nManager.isRTL`.

**Why it happens:**
React Native's Flexbox default direction (`flexDirection: 'row'`) does reverse in RTL automatically. But explicit `left`, `right`, `paddingLeft`, `paddingRight`, `marginLeft`, `marginRight` values remain as written in code.

**Prevention — use logical properties:**
```tsx
// BAD — won't flip in RTL
paddingLeft: 16, paddingRight: 8, left: 16

// GOOD — automatically flips in RTL
paddingStart: 16, paddingEnd: 8, start: 16
```
Use `paddingStart`/`paddingEnd`, `marginStart`/`marginEnd`, `start`/`end` (Yoga logical properties) throughout. Optionally enable `I18nManager.swapLeftAndRightInRTL(true)` to auto-swap `left`/`right` style properties, but be aware this only swaps the style properties themselves — any absolute `left: X` calculations in gesture handlers or animations still need manual RTL handling.

**Phase to address:** Phase 6 (RTL support)

---

### Pitfall 21: Icons with Directional Meaning Don't Auto-Mirror

**What goes wrong:**
Back chevrons, forward arrows, "next" icons (e.g. `chevron-forward-outline` from Ionicons) render pointing right in both LTR and RTL. In RTL Arabic, a "back" gesture goes right-to-left — these icons should point left in RTL.

**Authoritative source:** React Native RTL blog: "RN will not flip your source image. Therefore, you should flip them according to the layout style."

**Trenfy-specific risk:**
The scaffold uses `@expo/vector-icons` (Ionicons) throughout. Any chevron, arrow, or directional icon used in the Trending Now feed (e.g. "tap to source URL" forward arrow) needs to be conditionally mirrored.

**Prevention:**
```tsx
import { I18nManager } from 'react-native';

// Flip directional icons
<Ionicons
  name="chevron-forward-outline"
  style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
/>
```

**Phase to address:** Phase 6 (RTL support)

---

### Pitfall 22: FlashList Horizontal Lists Have RTL Padding Limitation

**What goes wrong:**
For horizontal FlashLists (e.g. the platform/category chip filter row), `contentContainerStyle` padding is not readable in RTL layout. If you apply `paddingLeft`/`paddingRight` (or `padding`) to a horizontal FlashList's `contentContainerStyle` and then use `scrollToIndex` or `initialScrollIndex` in RTL, the scroll position calculations will be off.

**Authoritative source:** FlashList known issues (March 2026): "Horizontal lists + RTL Layout: we're not able to read the padding applied on the list using `contentContainerStyle`. If you require precise `scrollTo` or `initialScrollIndex`, apply padding or margin to the header instead."

**Prevention:**
For the Trenfy filter chip row, apply padding to the first chip or a header component rather than to `contentContainerStyle` when RTL is active.

**Phase to address:** Phase 2 (trend feed) + Phase 6 (RTL support)

---

### Pitfall 23: Arabic Text Rendering — `textAlign` Inconsistency Across Platforms

**What goes wrong:**
On iOS, default text alignment follows the active language bundle direction. On Android, default text alignment follows the **content** direction — English text aligns left, Arabic text aligns right, even within the same component. This causes mixed-language UI (Arabic trend titles with English metadata) to align differently on iOS vs Android.

**Authoritative source:** React Native RTL blog: "In iOS, the default text alignment depends on the active language bundle. In Android, the default text alignment depends on the language of the text content."

**Prevention:**
For Trenfy trend cards that display both an English title and an Arabic translation:
- Explicitly set `textAlign: 'right'` for Arabic text fields
- Explicitly set `textAlign: 'left'` (or `'auto'`) for English text fields
- Do not rely on default text alignment behavior for mixed-language content

**Phase to address:** Phase 6 (RTL support)

---

## Animated Header Pitfalls

*Implementing the collapsible filter header (platform chips, category chips, region) that animates in/out as the user scrolls the FlashList.*

### Pitfall 24: Using Animated API with `onScroll` Instead of Reanimated (JS Thread Jank)

**What goes wrong:**
Using React Native's built-in `Animated.event` with `onScroll` to drive header collapse creates visible jank — the header lags behind the scroll position by several frames, especially on mid-range Android devices. The header animation runs on the JS thread and is throttled by other JS work (API calls, re-renders).

**Why it happens:**
The core `Animated` API with `useNativeDriver: false` (required for layout properties like `height`) executes on the JS thread. React Native's bridge latency means scroll events arrive on the JS thread asynchronously after they happen natively.

**Prevention — use Reanimated's `useAnimatedScrollHandler`:**
```tsx
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate } from 'react-native-reanimated';

const scrollY = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler((event) => {
  scrollY.value = event.contentOffset.y;
});

const headerStyle = useAnimatedStyle(() => ({
  height: interpolate(scrollY.value, [0, 100], [HEADER_HEIGHT, 0], 'clamp'),
  opacity: interpolate(scrollY.value, [0, 60], [1, 0], 'clamp'),
}));

// Pass scrollHandler to FlashList
<Animated.FlashList
  onScroll={scrollHandler}
  scrollEventThrottle={16}
/>
```

Reanimated worklets run on the UI thread, completely bypassing the JS bridge. Header collapse is buttery smooth even when the JS thread is busy.

**Phase to address:** Phase 2 (trend feed) — use Reanimated from the start, not retrofit later

---

### Pitfall 25: `scrollEventThrottle` Not Set — Scroll Events Throttled by Default

**What goes wrong:**
On iOS, `onScroll` fires at the native 60Hz refresh rate by default only when `scrollEventThrottle={16}` is set. Without it, the default is `scrollEventThrottle={0}` (fire on every frame) which iOS ignores for performance — on iOS the default is actually 1 event every 200ms. The header collapses in large jumps instead of smoothly.

**Note:** When using Reanimated's `useAnimatedScrollHandler`, this is handled natively. Still, always set `scrollEventThrottle={16}` as a safety net.

**Prevention:**
Always pair `onScroll` with `scrollEventThrottle={16}` on any scroll container driving animations.

**Phase to address:** Phase 2 (trend feed)

---

### Pitfall 26: Animated Header Breaks FlashList's `ListHeaderComponent`

**What goes wrong:**
When the collapsible header is implemented as `ListHeaderComponent`, animating its height causes FlashList to recalculate item layouts on every animation frame. This can cause a cascade of layout recalculations that drops the scroll to 20-30fps.

**Why it happens:**
FlashList's layout engine tracks the header height to position items. When the header height changes via animation, FlashList detects a layout change and recalculates item positions.

**Prevention — two approaches:**
1. **Absolute position the header above FlashList** and use `contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}` on the FlashList. Animate the header by translating it upward (`translateY`) rather than changing `height`. `translateY` doesn't affect layout, so FlashList never recalculates item positions.

2. **Use `opacity` + `translateY` instead of `height`**: Never animate `height` directly. Animate `transform: [{ translateY }]` and `opacity` which are both compositable on the native thread.

```tsx
const headerTranslateY = useAnimatedStyle(() => ({
  transform: [{ translateY: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -HEADER_HEIGHT], 'clamp') }],
  opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT * 0.6], [1, 0], 'clamp'),
}));
```

**Phase to address:** Phase 2 (trend feed)

---

### Pitfall 27: Animating Non-Native-Driver Properties Causes Bridge Overhead

**What goes wrong:**
Properties like `height`, `backgroundColor`, `borderRadius` cannot be driven by `useNativeDriver: true` in the core `Animated` API. Developers fall back to JS-driven animation, which runs on the JS thread and causes jank under load.

**Prevention:**
With Reanimated (recommended for Trenfy), this limitation does not apply — Reanimated can animate any style property via worklets on the UI thread, including `height` and `backgroundColor`. This is a key advantage of Reanimated over the core `Animated` API for the collapsible header use case.

**Phase to address:** Phase 2 (trend feed)

---

## Backend Integration Pitfalls

*Connecting the React Native mobile app to the Trenfy FastAPI backend from a mobile device/simulator.*

### Pitfall 28: `localhost` Doesn't Resolve on Android Emulator or Physical Devices

**What goes wrong:**
The React web app connects to the FastAPI backend via a relative `/api` path (proxied by Vite). The React Native app has no proxy — it must use an absolute URL. Hardcoding `http://localhost:8000` works on iOS Simulator (which shares the host's network stack) but fails on:
- Android Emulator — `localhost` on the emulator refers to the emulator itself, not the host machine
- Physical Android devices — `localhost` refers to the device itself
- Physical iOS devices — `localhost` is the device itself, not the Mac

**Why it happens:**
The existing backend decision log notes: "Keep frontend on relative `/api` requests by default. Vite proxy handles local dev; `VITE_API_URL` stays an explicit override." The mobile app cannot use this Vite proxy pattern.

**Prevention:**
```typescript
// src/api/config.ts
import Constants from 'expo-constants';

const getApiBaseUrl = (): string => {
  // Production
  if (!__DEV__) return 'https://api.trenfy.com';

  // Android emulator needs 10.0.2.2 to reach host machine
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';

  // iOS simulator / physical device on same WiFi
  return 'http://192.168.X.X:8000'; // use actual LAN IP
};

export const API_BASE_URL = getApiBaseUrl();
```

For physical device testing, the device must be on the same WiFi network as the dev machine. Use the Mac's LAN IP (from `ifconfig | grep "inet " | grep -v 127`).

**Phase to address:** Phase 2 (trend feed) — first API call

---

### Pitfall 29: CORS Is Already Configured for Browser Origins — Mobile Has No Origin Header

**What goes wrong:**
A developer reads the existing CORS setup (which lists explicit browser origins for the web admin) and assumes the mobile app will be blocked. In reality, **native mobile apps do not send an `Origin` header** in their HTTP requests. CORS is a browser security mechanism — it does not apply to native app HTTP requests.

**What this means for Trenfy:**
The existing FastAPI `CORSMiddleware` configuration is irrelevant to the React Native mobile app. Any `fetch()` call from the React Native app will succeed as long as the URL is correct and the server is reachable — regardless of CORS settings.

**However, there IS a genuine backend concern:**
The FastAPI backend currently requires no authentication (public trends are public). But the API may need to distinguish mobile-app requests from direct browser requests for rate limiting or future auth purposes. Consider adding an `X-Client-Type: mobile` header to all mobile requests.

**Phase to address:** Phase 2 (trend feed) — understand this early to avoid wasted debugging

---

### Pitfall 30: Network Requests Fail Silently in React Native Without Proper Error Handling

**What goes wrong:**
On a poor network connection or when the dev backend is not running, `fetch()` throws a `TypeError: Network request failed`. If this is not caught and displayed to the user, the screen renders an empty list with no explanation. The developer spends 30 minutes checking CORS and API responses before realizing the dev server is simply not running.

**Prevention:**
```typescript
const fetchTrends = async (): Promise<Trend[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trends?status=approved`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Cannot reach Trenfy server. Check your connection or dev server.');
    }
    throw error;
  }
};
```

Always implement a visible error state in the feed list (`ListEmptyComponent` with an error message) rather than silently showing an empty list.

**Phase to address:** Phase 2 (trend feed)

---

### Pitfall 31: HTTP Cleartext Blocked on Android (API 28+) by Default

**What goes wrong:**
React Native apps targeting Android API 28+ block all `http://` (cleartext) network requests by default. Connecting to a local dev server via `http://10.0.2.2:8000` fails with a network error on Android even when the URL is correct.

**Prevention:**
For development only, add `android:usesCleartextTraffic="true"` in `AndroidManifest.xml`, or use Expo's `android.usesCleartextTraffic: true` in `app.json`. **Remove this for production builds** — production should use HTTPS.

For Expo managed workflow:
```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

**Warning:** This change requires a new development build — it cannot be applied with Expo Go or via OTA update.

**Phase to address:** Phase 2 (trend feed) — Android network setup

---

### Pitfall 32: Infinite Scroll + Pull-to-Refresh Race Condition with Shared `page` State

**What goes wrong:**
User pulls to refresh (reset to page 1) while an infinite scroll `onEndReached` is in progress (fetching page 3). The `page` state gets reset mid-fetch. The page 3 response arrives after the reset and appends page 3 data to the freshly cleared list, causing duplicated or out-of-order items.

**Prevention:**
Use a request cancellation mechanism. With React Query (`@tanstack/react-query`), `refetch()` automatically cancels in-flight queries. If using manual `fetch()`:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const onRefresh = () => {
  // Cancel any in-flight fetch
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  setPage(1);
  setTrends([]);
  fetchPage(1, abortControllerRef.current.signal);
};
```

**Phase to address:** Phase 2 (trend feed) — React Query use is strongly recommended to handle this automatically

---

## Phase-Specific Warning Summary

| Phase Topic | Most Dangerous Pitfall | Mitigation |
|-------------|------------------------|------------|
| Scaffold restructure | Stale mock data imports surviving | Delete `mockData.ts`/`starterCopy.ts` after full audit; use `tsc --noEmit` to catch stragglers |
| FlashList migration | `key` prop on item components destroying recycling | Remove all `key` props inside `renderItem`; use `keyExtractor` only |
| FlashList + scroll | Nesting FlashList inside ScrollView | FlashList must be the root scroll container; use `ListHeaderComponent` |
| Dark mode theming | `StyleSheet.create()` with static `colors` reference | Move `StyleSheet.create()` into component body or use `useMemo` |
| Dark mode Android | Missing `expo-system-ui` | Install before any Android dark mode testing |
| Social auth | Testing Google sign-in in Expo Go | Create dev build first; Google auth requires native module |
| Apple auth | Not persisting name/email on first sign-in | Save to storage immediately — Apple only sends it once |
| RTL | `I18nManager.forceRTL()` not taking effect | Requires app restart; show "restart required" prompt |
| RTL icons | Directional icons not mirroring | Manual `scaleX: isRTL ? -1 : 1` transform for each directional icon |
| Animated header | Core `Animated` API jank | Use Reanimated `useAnimatedScrollHandler` from day one |
| Animated header | Animating `height` causing FlashList layout recalc | Use `translateY`+`opacity` instead of `height` animation |
| Android networking | `localhost` not resolving | Use `10.0.2.2` for Android emulator, LAN IP for physical devices |
| Android networking | HTTP cleartext blocked | Add `usesCleartextTraffic: true` in `app.json` for dev builds |
| Infinite scroll | `onEndReached` firing on load | Gate with `isLoading` ref; use `onEndReachedThreshold={0.2}` |

---

*Pitfalls research for: Trenfy v1.3 React Native mobile consumer app*
*Researched: 2026-03-21*
*Sources: FlashList v2 docs (shopify.github.io/flash-list, March 2026), Reanimated v4 docs (swmansion.com, 2026), Expo Apple Authentication docs (expo.dev, 2026), Expo Google Authentication docs (expo.dev, January 2026), Expo Color Themes docs (expo.dev, February 2026), React Native I18nManager docs (reactnative.dev, February 2026), React Native RTL blog (reactnative.dev, 2016 — patterns still current), FastAPI CORS docs (fastapi.tiangolo.com), codebase inspection of WhiteLabelApp scaffold*
