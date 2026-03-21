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
  const latestRequestId = useRef(0);
  const searchDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCategories = useMemo(
    () => [...filters.selectedCategories].sort(),
    [filters.selectedCategories]
  );
  const categoryFilter = useMemo(
    () => (selectedCategories.length > 0 ? selectedCategories.join(',') : undefined),
    [selectedCategories]
  );
  const serverFilterKey = `${filters.platform ?? ''}|${categoryFilter ?? ''}|${filters.regionCode ?? ''}`;
  const latestFiltersRef = useRef({
    platform: filters.platform ?? undefined,
    category: categoryFilter,
    regionCode: filters.regionCode ?? undefined,
  });

  useEffect(() => {
    latestFiltersRef.current = {
      platform: filters.platform ?? undefined,
      category: categoryFilter,
      regionCode: filters.regionCode ?? undefined,
    };
  }, [categoryFilter, filters.platform, filters.regionCode]);

  const items = rawItems;

  const loadPage = useCallback(async (opts: {
    q: string;
    cursor: string | null;
    append: boolean;   // true = loadMore, false = replace
    refreshing: boolean;
  }) => {
    const requestId = latestRequestId.current + 1;
    const currentFilters = latestFiltersRef.current;

    latestRequestId.current = requestId;

    if (opts.append) setIsLoadingMore(true);
    else if (opts.refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const result = await fetchTrends({
        platform: currentFilters.platform,
        category: currentFilters.category,
        region_code: currentFilters.regionCode,
        q: opts.q || undefined,
        cursor: opts.cursor || undefined,
        limit: 20,
      });

      if (requestId !== latestRequestId.current) {
        return;
      }

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
      if (requestId !== latestRequestId.current) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to load trends');
    } finally {
      if (requestId !== latestRequestId.current) {
        return;
      }

      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (searchDebounceTimeout.current) {
      clearTimeout(searchDebounceTimeout.current);
      searchDebounceTimeout.current = null;
    }

    setCursor(null);
    loadPage({ q: searchQuery, cursor: null, append: false, refreshing: false });
  }, [loadPage, serverFilterKey]);

  // Debounced search — skip on first mount to avoid double-firing with initial load
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    searchDebounceTimeout.current = setTimeout(() => {
      setCursor(null);
      loadPage({ q: searchQuery, cursor: null, append: false, refreshing: false });
    }, 300);

    return () => {
      if (searchDebounceTimeout.current) {
        clearTimeout(searchDebounceTimeout.current);
        searchDebounceTimeout.current = null;
      }
    };
  }, [loadPage, searchQuery]);

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
