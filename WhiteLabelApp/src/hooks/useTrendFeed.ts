import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchTrends } from '../api/trends';
import { Trend, TrendFeedFilters } from '../types';

export interface UseTrendFeedResult {
  items: Trend[];
  isLoading: boolean;       // true during initial/search load (replaces list)
  isLoadingMore: boolean;   // true during loadMore() pagination append
  isRefreshing: boolean;    // true during pull-to-refresh (refresh())
  error: string | null;     // null when no error
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => void;      // reset cursor, reload from page 1
  loadMore: () => void;     // load next cursor page, append to items
}

export type { TrendFeedFilters } from '../types';

export default function useTrendFeed(filters: TrendFeedFilters): UseTrendFeedResult {
  const [rawItems, setRawItems] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);      // true on mount
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const isSearchMounted = useRef(false);
  const isFilterMounted = useRef(false);
  const serverFilterKey = `${filters.platform ?? ''}|${filters.regionCode ?? ''}`;
  const selectedCategories = filters.selectedCategories;

  const items = useMemo(() => {
    if (selectedCategories.length === 0) {
      return rawItems;
    }

    return rawItems.filter((item) =>
      item.category ? selectedCategories.includes(item.category) : false
    );
  }, [rawItems, selectedCategories]);

  const loadPage = useCallback(async (opts: {
    q: string;
    cursor: string | null;
    append: boolean;   // true = loadMore, false = replace
    refreshing: boolean;
  }) => {
    if (opts.append) setIsLoadingMore(true);
    else if (opts.refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const result = await fetchTrends({
        platform: filters.platform ?? undefined,
        region_code: filters.regionCode ?? undefined,
        q: opts.q || undefined,
        cursor: opts.cursor || undefined,
        limit: 20,
      });

      if (opts.append) {
        setRawItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const nextItems = result.items.filter((item) => {
            if (seen.has(item.id)) {
              return false;
            }

            seen.add(item.id);
            return true;
          });

          return [...prev, ...nextItems];
        });
      } else {
        setRawItems(result.items);
      }
      setCursor(result.paging.next_cursor);
      setHasMore(result.paging.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [filters.platform, filters.regionCode]);

  // Initial load on mount
  useEffect(() => {
    loadPage({ q: '', cursor: null, append: false, refreshing: false });
  }, [loadPage]);

  // Debounced search — skip on first mount to avoid double-firing with initial load
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setCursor(null);
      loadPage({ q: searchQuery, cursor: null, append: false, refreshing: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadPage]);

  useEffect(() => {
    if (!isFilterMounted.current) {
      isFilterMounted.current = true;
      return;
    }

    setCursor(null);
    loadPage({ q: searchQuery, cursor: null, append: false, refreshing: false });
  }, [serverFilterKey, loadPage]);

  const refresh = useCallback(() => {
    setCursor(null);
    loadPage({ q: searchQuery, cursor: null, append: false, refreshing: true });
  }, [loadPage, searchQuery]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    loadPage({ q: searchQuery, cursor, append: true, refreshing: false });
  }, [cursor, hasMore, isLoading, isLoadingMore, loadPage, searchQuery]);

  return {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    loadMore,
  };
}
