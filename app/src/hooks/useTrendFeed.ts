import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchTrends } from '../api/trends';
import { Trend, TrendFeedFilters, TrendsListResponse } from '../types';
import { cacheGet, cacheGetStale, cacheSet } from '../utils/cache';

/** Cache TTL: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Build a stable cache key from filters and query */
function buildCacheKey(q: string, platform?: string, category?: string, regionCode?: string): string {
  return `trends:${platform ?? ''}|${category ?? ''}|${regionCode ?? ''}|${q}`;
}

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
  lastUpdatedAt: Date | null; // timestamp of the last successful load
}

export type { TrendFeedFilters } from '../types';

export default function useTrendFeed(filters: TrendFeedFilters): UseTrendFeedResult {
  const [rawItems, setRawItems] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);      // true on mount
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const sanitizeQuery = (q: string) => q.trim().slice(0, 200);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const isSearchMounted = useRef(false);
  const isFilterMounted = useRef(false);
  const latestRequestId = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Only cache the first page (no cursor) of non-appending loads
    const isCacheable = !opts.append && !opts.cursor;
    const cacheKey = isCacheable
      ? buildCacheKey(opts.q, currentFilters.platform, currentFilters.category, currentFilters.regionCode)
      : null;

    if (opts.append) setIsLoadingMore(true);
    else if (opts.refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    // Stale-while-revalidate: serve fresh cache immediately, then update in background
    if (cacheKey && !opts.refreshing) {
      const cached = await cacheGet<TrendsListResponse>(cacheKey, CACHE_TTL_MS);
      if (cached && requestId === latestRequestId.current) {
        setRawItems(cached.items);
        setCursor(cached.paging.next_cursor);
        setHasMore(cached.paging.has_more);
        setLastUpdatedAt(new Date());
        // Keep isLoading true so the background fetch still runs
      }
    }

    try {
      const result = await fetchTrends({
        platform: currentFilters.platform,
        category: currentFilters.category,
        region_code: currentFilters.regionCode,
        q: opts.q || undefined,
        cursor: opts.cursor || undefined,
        limit: 20,
      }, abortController.signal);

      if (requestId !== latestRequestId.current) {
        return;
      }

      // Persist first-page results to cache
      if (cacheKey) {
        cacheSet(cacheKey, result);
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
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      if (requestId !== latestRequestId.current) {
        return;
      }

      // Network error: attempt to fall back to stale cache data
      if (cacheKey) {
        const stale = await cacheGetStale<TrendsListResponse>(cacheKey);
        if (stale && requestId === latestRequestId.current) {
          setRawItems(stale.items);
          setCursor(stale.paging.next_cursor);
          setHasMore(stale.paging.has_more);
          setLastUpdatedAt(new Date());
          // Don't set error when we successfully served stale data
          return;
        }
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

  // Initial load (first mount only — no debounce)
  useEffect(() => {
    loadPage({ q: sanitizeQuery(searchQuery), cursor: null, append: false, refreshing: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage]);

  // Debounced filter reload — skip first mount to avoid double-firing with initial load
  useEffect(() => {
    if (!isFilterMounted.current) {
      isFilterMounted.current = true;
      return;
    }

    if (searchDebounceTimeout.current) {
      clearTimeout(searchDebounceTimeout.current);
      searchDebounceTimeout.current = null;
    }

    filterDebounceTimeout.current = setTimeout(() => {
      setCursor(null);
      loadPage({ q: sanitizeQuery(searchQuery), cursor: null, append: false, refreshing: false });
    }, 200);

    return () => {
      if (filterDebounceTimeout.current) {
        clearTimeout(filterDebounceTimeout.current);
        filterDebounceTimeout.current = null;
      }
    };
  }, [loadPage, serverFilterKey]);

  // Debounced search — skip on first mount to avoid double-firing with initial load
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    searchDebounceTimeout.current = setTimeout(() => {
      setCursor(null);
      loadPage({ q: sanitizeQuery(searchQuery), cursor: null, append: false, refreshing: false });
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
    loadPage({ q: sanitizeQuery(searchQuery), cursor: null, append: false, refreshing: true });
  }, [loadPage, searchQuery]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    loadPage({ q: sanitizeQuery(searchQuery), cursor, append: true, refreshing: false });
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
    lastUpdatedAt,
  };
}
