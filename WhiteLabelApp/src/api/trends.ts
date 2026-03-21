import { apiFetch } from './client';
import { Trend, TrendFilters, TrendsListResponse } from '../types';

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

  return apiFetch<TrendsListResponse>(`/api/trends?${params.toString()}`);
}

/**
 * Fetch a small preview set of approved trends for the foundation screen.
 * Uses /api/trends/mockup which returns a compact list without pagination.
 * Falls back to fetchTrends with limit=6 if /api/trends/mockup is unavailable.
 */
export async function fetchTrendsPreview(limit = 6): Promise<Trend[]> {
  try {
    // /api/trends/mockup returns items directly (not wrapped in paging)
    const data = await apiFetch<Trend[] | TrendsListResponse>(
      `/api/trends/mockup?limit=${limit}`
    );
    // Handle both array response and wrapped response
    if (Array.isArray(data)) return data;
    if ('items' in data) return data.items;
    return [];
  } catch {
    // Fallback: use regular trends endpoint with limit
    const fallback = await fetchTrends({ limit });
    return fallback.items;
  }
}
