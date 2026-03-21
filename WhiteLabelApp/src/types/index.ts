export interface Trend {
  id: string;
  title: string;
  ar_translation?: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  platform?: 'youtube' | 'x' | string;
  category?: string;
  region_code?: string;
  metric_type?: string;
  metric_value?: number;
  status: 'pending' | 'approved' | 'rejected' | string;
  fetched_at?: string;
  published_date?: string;
}

export interface TrendsPaging {
  limit: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface TrendsListResponse {
  items: Trend[];
  paging: TrendsPaging;
}

export type TrendPlatform = 'youtube' | 'x';
export type TrendRegion = 'US' | 'SA' | 'JP';

export interface CategoryOption {
  value: string;
  label: string;
  count?: number;
}

export interface TrendFeedFilters {
  platform: TrendPlatform | null;
  selectedCategories: string[];
  regionCode: TrendRegion | null;
}

export interface TrendFilters {
  platform?: string | null;
  category?: string | null;
  region_code?: string | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
  status?: string;
}
