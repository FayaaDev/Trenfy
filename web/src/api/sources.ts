import { apiRequest } from './client';
import type { TrendSource, PatchSourcePayload } from './types';

export function getSources(signal?: AbortSignal): Promise<TrendSource[]> {
  return apiRequest<TrendSource[]>('/api/sources', { signal });
}

export function patchSource(
  id: string,
  data: PatchSourcePayload,
  signal?: AbortSignal
): Promise<TrendSource> {
  return apiRequest<TrendSource>(`/api/sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    signal,
  });
}
