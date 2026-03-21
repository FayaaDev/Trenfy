# Stack Research: React Native Mobile App

**Project:** Trenfy v1.3 — React Native Consumer App  
**Researched:** 2026-03-21  
**Overall confidence:** HIGH (all claims verified via Context7 official docs + npm registry)

---

## Current Foundation

Already present in `WhiteLabelApp/package.json` — keep as-is, do NOT reinstall:

| Package | Version (current) | Role |
|---------|-------------------|------|
| `expo` | `~53.0.27` | Managed workflow host |
| `react-native` | `0.79.6` | Core RN (New Architecture ON by default in SDK 53) |
| `react` | `19.0.0` | React 19 |
| `@react-navigation/native` | `^7.1.10` | Navigation core |
| `@react-navigation/bottom-tabs` | `^7.3.14` | Bottom tab bar |
| `@react-navigation/native-stack` | `^7.3.14` | Stack navigator |
| `react-native-gesture-handler` | `~2.24.0` | Gesture foundation (required by Reanimated) |
| `react-native-screens` | `~4.11.1` | Native screen optimization |
| `react-native-safe-area-context` | `5.4.0` | Safe area insets |
| `expo-linear-gradient` | `^14.1.5` | Gradient UI (keep for trend cards) |
| `@expo/vector-icons` | `^14.1.0` | Platform icons (gaming/music/entertainment badges) |

---

## Required Additions

### Install with `npx expo install` (resolves Expo SDK 53 compatible versions automatically)

| Package | Pinned Version | Purpose | Why This Choice |
|---------|---------------|---------|-----------------|
| `@shopify/flash-list` | `~2.3.0` | High-perf virtualized list for trend feed | Drop-in FlatList replacement; cell recycling dramatically reduces JS-thread pressure on large trend feeds. v2 is stable and requires New Arch (which SDK 53 has ON by default). |
| `react-native-reanimated` | `~3.19.5` | Animated collapsible filter header | **Use v3, NOT v4.** Reanimated v4 requires RN 0.80–0.84; this project is on 0.79.6. v3.19.5 fully supports New Arch/Fabric and is actively maintained. `useAnimatedScrollHandler` + `interpolate` + `useAnimatedStyle` is all that's needed for the collapsible header. |
| `expo-image` | `~55.0.6` | Thumbnail loading with blurhash placeholders | Backed by SDWebImage (iOS) / Glide (Android); disk+memory cache by default; supports AVIF/WebP/blurhash placeholders for smooth loading of trend thumbnails. Preferred over `<Image>` from RN core. |
| `expo-sqlite` | `~15.2.14` | Local bookmark/preferences storage | Expo's recommended AsyncStorage replacement since SDK 53. `expo-sqlite/kv-store` is a drop-in AsyncStorage API backed by SQLite. Already bundled with Expo — adds zero native binary overhead. Prefer over `@react-native-async-storage/async-storage`. |
| `expo-apple-authentication` | `~55.0.9` | Native Sign In with Apple | Apple requires native UI component for App Store submissions on iOS. This is the Expo-official package; requires config plugin in `app.json`. Apple-only (iOS/macOS). |
| `@react-native-google-signin/google-signin` | `^16.1.2` | Google Sign-In | Expo docs explicitly recommends this over `expo-auth-session` for Google. Provides native sign-in button + Google API authorization. Requires custom native code — cannot use with Expo Go; requires dev build. |
| `expo-web-browser` | `~55.0.10` | Open source URLs + OAuth session completion | Required companion to `expo-auth-session` for completing OAuth web sessions. Also used directly for `WebBrowser.openBrowserAsync()` to open trend source URLs in a native in-app browser (not just linking out). |
| `expo-linking` | `~55.0.8` | Deep linking + `Linking.openURL()` | Already included as Expo built-in but must be explicitly installed for `openURL` to external sources. Used to open trend source URLs when WebBrowser is overkill (plain URL tap). |

### Already included in Expo SDK 53 (zero extra install needed)

| Capability | How to Access | Notes |
|-----------|--------------|-------|
| Dark mode | `import { useColorScheme } from 'react-native'` | Built into RN core. Returns `'light'` \| `'dark'` \| `null`. No extra package. |
| RTL support | `import { I18nManager } from 'react-native'` | Built into RN core. `I18nManager.isRTL` + `I18nManager.forceRTL(true)`. No extra package. |
| `expo-status-bar` | Already in package.json | Controls status bar appearance per theme. |

---

## Packages to NOT Add

| Package | Why Not |
|---------|---------|
| `react-native-mmkv` | Requires `react-native-nitro-modules` (v4) or New Arch TurboModule (v3). Adds native binary size (~500KB) and a separate prebuild step. `expo-sqlite/kv-store` handles the bookmarks/preferences use case with zero added complexity. Only justify MMKV if you need synchronous reads in hot paths (not needed here). |
| `@react-native-async-storage/async-storage` | Superseded by `expo-sqlite/kv-store` in SDK 53. Same API, one fewer dependency. |
| `react-native-reanimated@4.x` | Requires RN 0.80–0.84 + `react-native-worklets` peer. We're on 0.79.6. Do not upgrade. |
| `expo-auth-session` (for Google) | Expo's own docs say: *"use @react-native-google-signin/google-signin for Google authentication"*. `expo-auth-session` is a lower-level abstraction; fine for niche OAuth providers but the Google-specific library gives a better UX and handles token refresh. |
| `react-native-paper` / `@shopify/restyle` / `nativewind` | No design system change requested. Project uses pure `StyleSheet`. Adding a theme library is scope creep. Use a simple `ThemeContext` with `useColorScheme()` instead. |
| `@tanstack/react-query` | Not in scope for this milestone. Simple `useState` + `useEffect` fetch pattern (or a thin `useTrends` hook with manual caching) is sufficient for the initial feed. Add if API call complexity grows. |
| `zustand` / `redux-toolkit` | No global state management required yet. Local component state + Context for theme/auth is sufficient. |
| `react-native-fast-image` | Superseded by `expo-image` (backed by same SDWebImage/Glide engines). Don't use both. |
| `lottie-react-native` | No animations in scope beyond the collapsible header. Adds significant bundle weight. |
| `expo-router` | Navigation is already set up with React Navigation 7. Migrating to Expo Router is a full restructure, not an addition. Out of scope for v1.3. |

---

## Integration Notes

### New Architecture (Fabric) — Already ON

Expo SDK 53 enables the New Architecture by default. `app.json` will have `newArchEnabled: true` implicitly. No action needed. All recommended packages above are New Arch compatible.

**Critical gotcha:** Reanimated 4 docs appear prominently in search results and Context7 and recommend themselves — **ignore them**. v4 declares a hard peer dependency of `react-native: 0.80 - 0.84`. This project is on **0.79.6**. Stick to **Reanimated 3.19.x**.

The Reanimated docs themselves note: *"After enabling the New Architecture in your app, you might notice some performance regressions of animations... This can also happen after upgrading to Expo SDK 53 where the New Architecture is enabled by default."* Mitigation: enable `expo-build-properties` `reactNativeReleaseLevel: "experimental"` if frame drops are observed in production.

### Reanimated v3 — Babel Plugin Required

After installing, add to `babel.config.js`:
```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'],  // must be last
};
```
Clear Metro cache after: `npx expo start --clear`.

### FlashList v2 — `estimatedItemSize` is Mandatory

FlashList v2 will warn (and degrade to FlatList behavior) if `estimatedItemSize` is missing. Measure the trend card height and hardcode it. A good starting value is 120–160px for a card with thumbnail + title + badges.

```jsx
<FlashList
  data={trends}
  renderItem={renderTrendCard}
  estimatedItemSize={140}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
/>
```

### expo-apple-authentication — iOS Only + App Store Requirement

Apple Sign-In must be offered whenever any other social sign-in is offered (App Store Review Guideline 4.8). Add the config plugin:
```json
{
  "expo": {
    "plugins": ["expo-apple-authentication"]
  }
}
```
Render the `AppleAuthenticationButton` only on iOS: `Platform.OS === 'ios'`.

### @react-native-google-signin — Cannot Use Expo Go

This package requires a Development Build (not Expo Go). Add the config plugin:
```json
{
  "expo": {
    "plugins": ["@react-native-google-signin/google-signin"]
  }
}
```
Configure `webClientId` (from Google Cloud Console) in the plugin options. Use `npx expo run:ios` / `npx expo run:android` to test.

### expo-sqlite/kv-store — Drop-in AsyncStorage

No setup needed beyond `npx expo install expo-sqlite`. Use as:
```ts
import Storage from 'expo-sqlite/kv-store';

// Bookmarks
await Storage.setItem('bookmarks', JSON.stringify(bookmarkedIds));
const raw = await Storage.getItem('bookmarks');

// Preferences (sync variant available)
Storage.setItemSync('theme', 'dark');
const theme = Storage.getItemSync('theme');
```
Synchronous variants (`getItemSync`/`setItemSync`) are useful for reading preferences at app bootstrap without awaiting an async chain.

### RTL + I18nManager — Requires App Restart

`I18nManager.forceRTL()` takes effect only after a full app restart (or dev reload). Call it early in the app bootstrap before rendering. For Trenfy v1.3, Arabic text in trend cards (title translations) renders correctly with `writingDirection: 'rtl'` on the specific `Text` elements — full app-level RTL force may not be needed unless the entire UI needs mirroring.

### expo-image — No Config Plugin Needed by Default

Default install works without any plugin config. Only add the plugin if you're targeting AVIF and hit a `libdav1d` conflict with another pod:
```bash
npx expo install expo-image
# That's it. No app.json changes needed for standard use.
```

### Dark Mode — ThemeContext Pattern (No Extra Lib)

```ts
// Use RN built-in — no extra package
import { useColorScheme } from 'react-native';

// In a ThemeContext provider:
const scheme = useColorScheme(); // 'light' | 'dark' | null
const isDark = scheme === 'dark';

// Define two token objects and select by isDark
const colors = isDark ? darkPalette : lightPalette;
```

---

## Summary Install Commands

```bash
# From WhiteLabelApp/ directory:
npx expo install @shopify/flash-list
npx expo install react-native-reanimated
npx expo install expo-image
npx expo install expo-sqlite
npx expo install expo-apple-authentication
npx expo install @react-native-google-signin/google-signin
npx expo install expo-web-browser
npx expo install expo-linking
```

> Use `npx expo install` (not `npm install`) — it resolves SDK 53 compatible version pins automatically.

---

## Sources

- FlashList v2 docs: https://github.com/shopify/flash-list/blob/main/documentation/docs/v2-migration.md (Context7, HIGH)
- Reanimated v4 peer deps (RN 0.80-0.84 requirement): npm registry (HIGH)
- Reanimated v3 + New Arch performance: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance (Context7, HIGH)
- Expo New Arch SDK 53 default-on: https://docs.expo.dev/guides/new-architecture (Context7, HIGH)
- expo-apple-authentication: https://docs.expo.dev/versions/latest/sdk/apple-authentication (Context7, HIGH)
- Google Sign-In recommendation (prefer native over expo-auth-session): https://docs.expo.dev/guides/google-authentication (Context7, HIGH)
- expo-sqlite/kv-store as AsyncStorage drop-in: https://docs.expo.dev/versions/latest/sdk/sqlite (Context7, HIGH)
- expo-image features and install: https://docs.expo.dev/versions/latest/sdk/image (Context7, HIGH)
- expo-linking openURL: https://docs.expo.dev/versions/latest/sdk/linking (Context7, HIGH)
- useColorScheme dark mode: https://docs.expo.dev/develop/user-interface/color-themes (Context7, HIGH)
- RTL I18nManager: React Native core built-in (HIGH)
- react-native-mmkv v3/v4 New Arch requirement: https://github.com/mrousavy/react-native-mmkv (Context7, HIGH)

---
*Stack research for: Trenfy v1.3 React Native mobile consumer app*  
*Researched: 2026-03-21*
