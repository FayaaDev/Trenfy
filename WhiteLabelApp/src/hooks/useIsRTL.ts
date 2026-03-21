import { I18nManager } from 'react-native';

/**
 * Returns true when the system language is RTL (e.g. Arabic, Hebrew).
 * Uses React Native's I18nManager which reads the OS locale at app launch.
 * No extra packages required.
 */
export function useIsRTL(): boolean {
  return I18nManager.isRTL;
}
