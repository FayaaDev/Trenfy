import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchTrends } from '../api/trends';
import { Trend } from '../types';

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

export default function useTrendFeed(): UseTrendFeedResult {
  const [items, setItems] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);      // true on mount
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(opts: {
    q: string;
    cursor: string | null;
    append: boolean;   // true = loadMore, false = replace
    refreshing: boolean;
  }) {
    if (opts.append) setIsLoadingMore(true);
    else if (opts.refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const result = await fetchTrends({
        q: opts.q || undefined,
        cursor: opts.cursor || undefined,
        limit: 20,
      });
      if (opts.append) {
        setItems(prev => [...prev, ...result.items]);
      } else {
        setItems(result.items);
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
  }

  // Initial load on mount
  useEffect(() => {
    loadPage({ q: '', cursor: null, append: false, refreshing: false });
  }, []);

  // Debounced search — skip on first mount to avoid double-firing with initial load
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setCursor(null);
      loadPage({ q: searchQuery, cursor: null, append: false, refreshing: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const refresh = useCallback(() => {
    setCursor(null);
    loadPage({ q: searchQuery, cursor: null, append: false, refreshing: true });
  }, [searchQuery]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    loadPage({ q: searchQuery, cursor, append: true, refreshing: false });
  }, [hasMore, isLoadingMore, isLoading, searchQuery, cursor]);

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
