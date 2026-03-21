import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, SearchX } from 'lucide-react';
import { getTrends } from '@/api/trends';
import type { PaginatedTrends, Trend } from '@/api/types';
import { TrendCard } from '@/components/demo/TrendCard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FilterState = {
  platform?: string;
  category?: string;
  region_code?: string;
};

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
];

const CATEGORY_OPTIONS = [
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'entertainment', label: 'Entertainment' },
];

const REGION_OPTIONS = [
  { value: 'US', label: 'US' },
  { value: 'SA', label: 'SA' },
  { value: 'JP', label: 'JP' },
];

const DEFAULT_FILTERS: FilterState = {};

export function DemoPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [allTrends, setAllTrends] = useState<Trend[]>([]);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const queryKey = ['demo-trends', filters, cursor] as const;

  const { data, isLoading, isError, isFetching, refetch } = useQuery<PaginatedTrends>({
    queryKey,
    queryFn: ({ signal }) =>
      getTrends({
        ...filters,
        status: 'approved',
        cursor,
        limit: 20,
        signal,
      }),
  });

  // onSuccess was removed in TanStack Query v5; sync data into allTrends via useEffect.
  useEffect(() => {
    if (!data) return;
    setAllTrends((prev) => {
      // If cursor is at start (new filter or initial load), replace instead of append
      if (cursor === undefined && cursorStack.length === 0) {
        return data.items;
      }
      // Load more: append, deduplicating by Id
      const existingIds = new Set(prev.map((t) => t.Id));
      const newItems = data.items.filter((t) => !existingIds.has(t.Id));
      return [...prev, ...newItems];
    });
  }, [data, cursor, cursorStack.length]);

  function handleFilterChange(key: keyof FilterState, value: string) {
    const newFilters = value
      ? { ...filters, [key]: value }
      : { ...filters, [key]: undefined };
    // Remove undefined keys
    const cleanFilters: FilterState = Object.fromEntries(
      Object.entries(newFilters).filter(([, v]) => v !== undefined)
    ) as FilterState;
    setFilters(cleanFilters);
    setAllTrends([]);
    setCursor(undefined);
    setCursorStack([]);
  }

  function handleLoadMore() {
    if (!data?.paging.next_cursor) return;
    setCursorStack((prev) => [...prev, cursor ?? '']);
    setCursor(data.paging.next_cursor);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Trending Now</h1>
          <p className="text-slate-500">
            Discover what&apos;s popular across gaming, music, and entertainment
          </p>
        </header>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          {/* Platform filter */}
          <Select
            value={filters.platform ?? ''}
            onValueChange={(v) => handleFilterChange('platform', v ?? '')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Platforms</SelectItem>
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={filters.category ?? ''}
            onValueChange={(v) => handleFilterChange('category', v ?? '')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Region filter */}
          <Select
            value={filters.region_code ?? ''}
            onValueChange={(v) => handleFilterChange('region_code', v ?? '')}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Regions</SelectItem>
              {REGION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error state */}
        {isError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="mb-2 text-red-700">Failed to load trends.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading state (initial load) */}
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && allTrends.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            <SearchX
              className="mx-auto mb-4 h-12 w-12 text-slate-300"
              aria-hidden="true"
            />
            <h2 className="mb-1 text-lg font-medium text-slate-700">No trends found</h2>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        )}

        {/* Trend grid */}
        {!isLoading && allTrends.length > 0 && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allTrends.map((trend) => (
                <TrendCard key={trend.Id} trend={trend} />
              ))}
            </div>

            {/* Load more */}
            {data?.paging.has_more && (
              <div className="flex justify-center pb-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
