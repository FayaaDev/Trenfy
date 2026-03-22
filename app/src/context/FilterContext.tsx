import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { fetchCategories } from '../api/trends';
import useFilterPrefs from '../hooks/useFilterPrefs';
import type { CategoryOption, TrendRegion } from '../types';

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Music',  label: 'Music' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Movies', label: 'Movies' },
  { value: 'News',   label: 'News' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterContextValue {
  // Data
  availableCategories: CategoryOption[];
  isLoadingCategories: boolean;
  // Filter state
  selectedCategories: string[];
  region: TrendRegion | null;
  activeFilterCount: number;
  // Actions
  toggleCategory: (id: string) => void;
  setRegion: (r: TrendRegion | null) => void;
  clearAll: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FilterContext = createContext<FilterContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { region, setRegion, clearPersistedFilters } = useFilterPrefs();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch category options once on mount
  useEffect(() => {
    let active = true;
    setIsLoadingCategories(true);

    fetchCategories()
      .then((result) => {
        if (active) setAvailableCategories(result.length > 0 ? result : FALLBACK_CATEGORIES);
      })
      .catch(() => {
        if (active) setAvailableCategories(FALLBACK_CATEGORIES);
      })
      .finally(() => {
        if (active) setIsLoadingCategories(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const clearAll = useCallback(() => {
    setSelectedCategories([]);
    clearPersistedFilters();
  }, [clearPersistedFilters]);

  const activeFilterCount = useMemo(
    () => selectedCategories.length + (region ? 1 : 0),
    [selectedCategories.length, region]
  );

  const value = useMemo<FilterContextValue>(
    () => ({
      availableCategories,
      isLoadingCategories,
      selectedCategories,
      region,
      activeFilterCount,
      toggleCategory,
      setRegion,
      clearAll,
    }),
    [
      availableCategories,
      isLoadingCategories,
      selectedCategories,
      region,
      activeFilterCount,
      toggleCategory,
      setRegion,
      clearAll,
    ]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within <FilterProvider>');
  return ctx;
}
