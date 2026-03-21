import { apiRequest } from './client';
import type {
  PaginatedTrends,
  Trend,
  PatchTrendPayload,
  DeleteTrendResponse,
} from './types';

export interface GetTrendsParams {
  platform?: string;
  category?: string;
  region_code?: string;
  status?: 'pending' | 'approved' | 'rejected';
  cursor?: string;
  limit?: number;
  sort_by?: string;
  q?: string;
  signal?: AbortSignal;
}

export function getTrends(params: GetTrendsParams = {}): Promise<PaginatedTrends> {
  const { signal, ...rest } = params;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== '') {
      query.set(k, String(v));
    }
  }
  const qs = query.toString();
  return apiRequest<PaginatedTrends>(`/api/trends${qs ? `?${qs}` : ''}`, { signal });
}

export function getTrend(id: number, signal?: AbortSignal): Promise<Trend> {
  return apiRequest<Trend>(`/api/trends/${id}`, { signal });
}

export function patchTrend(
  id: number,
  data: PatchTrendPayload,
  signal?: AbortSignal
): Promise<Trend> {
  return apiRequest<Trend>(`/api/trends/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    signal,
  });
}

export function deleteTrend(
  id: number,
  signal?: AbortSignal
): Promise<DeleteTrendResponse> {
  return apiRequest<DeleteTrendResponse>(`/api/trends/${id}`, {
    method: 'DELETE',
    signal,
  });
}
