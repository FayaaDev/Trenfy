import { useCallback, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';

import type { TrendPlatform, TrendRegion } from '../types';

const PLATFORM_KEY = 'filter:platform';
const REGION_KEY = 'filter:region';

function readPlatform(): TrendPlatform | null {
  const value = Storage.getItemSync(PLATFORM_KEY);

  if (value === 'youtube' || value === 'x') {
    return value;
  }

  return null;
}

function readRegion(): TrendRegion | null {
  const value = Storage.getItemSync(REGION_KEY);

  if (value === 'US' || value === 'SA' || value === 'JP') {
    return value;
  }

  return null;
}

export interface UseFilterPrefsResult {
  platform: TrendPlatform | null;
  region: TrendRegion | null;
  setPlatform: (platform: TrendPlatform | null) => void;
  setRegion: (region: TrendRegion | null) => void;
  clearPersistedFilters: () => void;
}

export default function useFilterPrefs(): UseFilterPrefsResult {
  const [platform, setPlatformState] = useState<TrendPlatform | null>(() => readPlatform());
  const [region, setRegionState] = useState<TrendRegion | null>(() => readRegion());

  const setPlatform = useCallback((next: TrendPlatform | null) => {
    setPlatformState(next);

    if (next) {
      Storage.setItemSync(PLATFORM_KEY, next);
      return;
    }

    Storage.removeItemSync(PLATFORM_KEY);
  }, []);

  const setRegion = useCallback((next: TrendRegion | null) => {
    setRegionState(next);

    if (next) {
      Storage.setItemSync(REGION_KEY, next);
      return;
    }

    Storage.removeItemSync(REGION_KEY);
  }, []);

  const clearPersistedFilters = useCallback(() => {
    setPlatformState(null);
    setRegionState(null);
    Storage.removeItemSync(PLATFORM_KEY);
    Storage.removeItemSync(REGION_KEY);
  }, []);

  return {
    platform,
    region,
    setPlatform,
    setRegion,
    clearPersistedFilters,
  };
}
