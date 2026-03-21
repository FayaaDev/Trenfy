import { apiFetch } from './client';
import { Trend, TrendFilters, TrendsListResponse } from '../types';

type RawTrend = Omit<Trend, 'id'> & {
  id?: string | number;
  Id?: string | number;
};

type RawTrendsListResponse = {
  items: RawTrend[];
  paging: TrendsListResponse['paging'];
};

function normalizeTrend(item: RawTrend): Trend {
  const { id, Id, ...rest } = item;

  return {
    ...rest,
    id: String(id ?? Id ?? ''),
  };
}

/**
 * Fetch a page of approved trends.
 * Always enforces status=approved — consumers must never see pending/rejected.
 */
export async function fetchTrends(
  filters: TrendFilters = {}
): Promise<TrendsListResponse> {
  const params = new URLSearchParams();

  // Always filter to approved only — MOBL-03: no direct NocoDB calls, no raw status
  params.set('status', 'approved');

  if (filters.platform) params.set('platform', filters.platform);
  if (filters.category) params.set('category', filters.category);
  if (filters.region_code) params.set('region_code', filters.region_code);
  if (filters.q) params.set('q', filters.q);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));

  const result = await apiFetch<RawTrendsListResponse>(`/api/trends?${params.toString()}`);

  return {
    ...result,
    items: result.items.map(normalizeTrend),
  };
}

/**
 * Fetch a small preview set of approved trends for the foundation screen.
 * Calls the approved-only endpoint directly — no mockup intermediary.
 */
export async function fetchTrendsPreview(limit = 6): Promise<Trend[]> {
  const result = await fetchTrends({ limit });
  return result.items;
}
