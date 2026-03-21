import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrends } from '@/api/trends';

const FALLBACK_CATEGORIES = ['gaming', 'music', 'entertainment'];

export function CategoriesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['trends-all-categories'],
    queryFn: ({ signal }) => getTrends({ limit: 1000, signal }),
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    if (!data?.items?.length) return null;

    const categoryMap = new Map<string, number>();
    for (const trend of data.items) {
      const cat = trend.category?.trim().toLowerCase();
      if (cat) {
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
      }
    }

    return Array.from(categoryMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [data?.items]);

  const displayCategories =
    categories && categories.length > 0
      ? categories
      : FALLBACK_CATEGORIES.map((name) => ({ name, count: 0 }));

  const isFallback = !categories || categories.length === 0;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Distinct categories from live trend data (read-only in v1.2).
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load trend data.</p>
      )}

      {!isLoading && !isError && isFallback && (
        <p className="text-sm text-muted-foreground italic">
          No trends found — showing default categories.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {displayCategories.map(({ name, count }) => (
            <div
              key={name}
              className="rounded-lg border border-border bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-900 capitalize">
                {name}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-700">
                {count}
              </p>
              <p className="text-xs text-muted-foreground">
                {count === 1 ? 'trend' : 'trends'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
