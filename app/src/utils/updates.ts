/**
 * OTA Update utilities using expo-updates.
 * Checks for and fetches available updates when the app comes to foreground.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Check for an available OTA update and reload if one is found.
 * Silently swallows errors so the app never crashes due to update logic.
 */
export async function checkForUpdates(): Promise<void> {
  // Updates are only available in non-development builds
  if (__DEV__) {
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (err) {
    // Silently ignore update errors to avoid crashing the app
    void err;
  }
}

/**
 * Hook that triggers an OTA update check whenever the app transitions
 * from background/inactive to the active (foreground) state.
 */
export function useOTAUpdate(): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive) {
        checkForUpdates();
      }

      appState.current = nextState;
    });

    // Also check on initial mount (cold start)
    checkForUpdates();

    return () => {
      subscription.remove();
    };
  }, []);
}
