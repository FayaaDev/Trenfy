import { useCallback, useState } from 'react';

import { getFilterPref, removeFilterPref, setFilterPref } from '../storage/filterPrefs';
import type { TrendPlatform, TrendRegion } from '../types';

const PLATFORM_KEY = 'filter:platform';
const REGION_KEY = 'filter:region';

function readPlatform(): TrendPlatform | null {
  const value = getFilterPref(PLATFORM_KEY);

  if (value === 'youtube' || value === 'x') {
    return value;
  }

  return null;
}

function readRegion(): TrendRegion | null {
  const value = getFilterPref(REGION_KEY);

  if (
    value === 'US'
    || value === 'SA'
    || value === 'JP'
    || value === 'KR'
    || value === 'GLOBAL'
  ) {
    return value;
  }

  if (value === 'Global') {
    return 'GLOBAL';
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
      setFilterPref(PLATFORM_KEY, next);
      return;
    }

    removeFilterPref(PLATFORM_KEY);
  }, []);

  const setRegion = useCallback((next: TrendRegion | null) => {
    setRegionState(next);

    if (next) {
      setFilterPref(REGION_KEY, next);
      return;
    }

    removeFilterPref(REGION_KEY);
  }, []);

  const clearPersistedFilters = useCallback(() => {
    setPlatformState(null);
    setRegionState(null);
    removeFilterPref(PLATFORM_KEY);
    removeFilterPref(REGION_KEY);
  }, []);

  return {
    platform,
    region,
    setPlatform,
    setRegion,
    clearPersistedFilters,
  };
}
