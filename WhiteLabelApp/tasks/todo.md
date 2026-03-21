# Todo

- [x] Inspect the current Expo, Reanimated, and Iconify setup to confirm the runtime mismatch.
- [x] Pin `react-native-reanimated` to the iOS native runtime version used by Expo.
- [x] Add every currently used Iconify icon to the Babel plugin config.
- [x] Verify dependency health and type safety after the changes.

# Review

- `react-native-reanimated` is now pinned and installed at `3.17.4`, matching the iOS native runtime.
- `babel.config.js` now includes the X and YouTube Iconify glyphs used by the app.
- `npm run typecheck` passes.
- `npx expo install --check` still reports unrelated Expo SDK version drift in other packages.
