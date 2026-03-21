// TypeScript interfaces mirroring the FastAPI + Pydantic backend models.
// Derived from: trend_agents/shared/models.py, api/contracts.py

export interface Trend {
  Id: number;                                          // NocoDB row integer PK
  platform: string;                                    // "youtube" | "x"
  category: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string | null;
  published_date: string;                              // "YYYY-MM-DD"
  metric_type: string;                                 // "views" | "streams" | "players"
  metric_value: number;
  region_code: string;                                 // "US" | "SA" | "JP"
  metadata: Record<string, unknown>;
  content_hash: string;
  ar_translation: string | null;
  status: 'pending' | 'approved' | 'rejected' | null;
  fetched_at?: string;                                 // ISO datetime string
}

export interface PagingMeta {
  limit: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaginatedTrends {
  items: Trend[];
  paging: PagingMeta;
}

export interface TrendSource {
  id: string;                                          // stable string ID e.g. "YOUTUBE_TRENDING_US"
  name: string;
  platform: string;
  endpoint: string;
  params: Record<string, unknown>;
  check_interval_minutes: number;
  enabled: boolean;
  last_fetched_at: string | null;
  last_fetch_status: string;                           // "success" | "error" | ""
  min_metric_value: number;
  blocked_keywords: string[];
}

// Mutation payloads — all fields optional except PatchSourcePayload.enabled
export interface PatchTrendPayload {
  status?: 'pending' | 'approved' | 'rejected';
  title?: string;
  category?: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  published_date?: string;
  metric_type?: string;
  metric_value?: number;
  region_code?: string;
  ar_translation?: string;
}

export interface PatchSourcePayload {
  enabled: boolean;                                    // required
}

export interface DeleteTrendResponse {
  id: number;
  deleted: true;
}
