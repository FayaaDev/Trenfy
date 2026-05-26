const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);
const VALID_SORT_FIELDS = new Set(['fetched_at', 'metric_value', 'published_date']);
const CATEGORY_PAGE_SIZE = 200;
const MOCKUP_PAGE_SIZE = 200;

const MOCKUP_SCOPE_FILTERS = {
  yt: { platform: 'youtube' },
  x: { platform: 'x' },
  'yt-us': { platform: 'youtube', region_code: 'US' },
  'yt-sa': { platform: 'youtube', region_code: 'SA' },
  'yt-jp': { platform: 'youtube', region_code: 'JP' },
  'x-us': { platform: 'x', region_code: 'US' },
  'x-sa': { platform: 'x', region_code: 'SA' },
  'x-jp': { platform: 'x', region_code: 'JP' },
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health') {
        return jsonResponse({
          status: 'ok',
          scheduler_running: false,
          runtime: 'cloudflare-workers',
          timestamp: new Date().toISOString(),
        }, env);
      }

      if (url.pathname === '/health/integrations') {
        return jsonResponse({
          status: 'ok',
          credentials: {
            youtube_api_key_configured: configured(env.YOUTUBE_API_KEY),
            x_bearer_token_configured: configured(env.X_BEARER_TOKEN),
            nocodb_api_token_configured: configured(env.NOCODB_API_TOKEN),
          },
          platform_source_counts: {},
          timestamp: new Date().toISOString(),
        }, env);
      }

      if (url.pathname === '/api/trends' && request.method === 'GET') {
        return jsonResponse(await listTrends(env, url.searchParams), env);
      }

      if (url.pathname === '/api/trends/mockup' && request.method === 'GET') {
        return jsonResponse(await trendsMockup(env, url.searchParams), env);
      }

      const mockupScope = url.pathname.match(/^\/api\/trends\/mockup\/([^/]+)$/);
      if (mockupScope && request.method === 'GET') {
        return jsonResponse(await trendsMockupScope(env, mockupScope[1]), env);
      }

      if (url.pathname === '/api/trends/stats' && request.method === 'GET') {
        return jsonResponse(await trendStats(env), env);
      }

      if (url.pathname === '/api/categories' && request.method === 'GET') {
        return jsonResponse(await listCategories(env), env);
      }

      if ((url.pathname === '/api/sources' || url.pathname === '/api/trends/sources') && request.method === 'GET') {
        return jsonResponse(await listSources(env, url.searchParams), env);
      }

      if (url.pathname === '/api/trends/refresh' && request.method === 'POST') {
        return jsonResponse({ error: 'refresh_unavailable_on_edge' }, env, 503);
      }

      const trendMatch = url.pathname.match(/^\/api\/trends\/([^/]+)$/);
      if (trendMatch) {
        const recordId = decodeURIComponent(trendMatch[1]);
        if (request.method === 'GET') {
          const row = await getTrend(env, recordId);
          return row
            ? jsonResponse(row, env)
            : jsonResponse({ error: 'trend_not_found', id: recordId }, env, 404);
        }
        if (request.method === 'PATCH') {
          const row = await patchTrend(env, recordId, await request.json());
          return row
            ? jsonResponse(row, env)
            : jsonResponse({ error: 'trend_not_found', id: recordId }, env, 404);
        }
        if (request.method === 'DELETE') {
          const deleted = await deleteTrend(env, recordId);
          return deleted
            ? jsonResponse({ id: recordId, deleted: true }, env)
            : jsonResponse({ error: 'trend_not_found', id: recordId }, env, 404);
        }
      }

      const sourceMatch = url.pathname.match(/^\/api\/(?:trends\/)?sources\/([^/]+)$/);
      if (sourceMatch && request.method === 'PATCH') {
        const sourceId = decodeURIComponent(sourceMatch[1]);
        const body = await request.json();
        const row = await patchSource(env, sourceId, body.enabled);
        return row
          ? jsonResponse(row, env)
          : jsonResponse({ error: 'source_not_found', id: sourceId }, env, 404);
      }

      if (url.pathname.startsWith('/api/')) {
        return jsonResponse({ error: 'not_found' }, env, 404);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonResponse(error.payload, env, error.status);
      }

      console.error(JSON.stringify({ event: 'request_failed', path: url.pathname, error: String(error) }));
      return jsonResponse({ error: 'internal_error' }, env, 500);
    }
  },
};

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function jsonResponse(payload, env, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(env),
  });
}

function normalizeLimit(raw) {
  const value = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(value, 1), MAX_LIMIT);
}

function validateStatus(value) {
  if (value == null || String(value).trim() === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!VALID_STATUSES.has(normalized)) throw new ApiError(400, { error: 'invalid_status' });
  return normalized;
}

function decodeCursor(cursor) {
  if (!cursor) return { offset: 0, sort: undefined };
  try {
    const payload = JSON.parse(atob(cursor.replace(/-/g, '+').replace(/_/g, '/')));
    const offset = Number.parseInt(payload.offset || 0, 10);
    if (!Number.isFinite(offset) || offset < 0) throw new Error('bad offset');
    return { offset, sort: payload.sort || undefined };
  } catch {
    throw new ApiError(400, { error: 'invalid_cursor' });
  }
}

function encodeCursor(offset, sort) {
  return btoa(JSON.stringify({ offset, sort })).replace(/\+/g, '-').replace(/\//g, '_');
}

async function listTrends(env, searchParams) {
  const limit = normalizeLimit(searchParams.get('limit'));
  const status = validateStatus(searchParams.get('status'));
  const minMetricValue = searchParams.get('min_metric_value');
  const parsedMinMetric = minMetricValue == null ? undefined : Number.parseInt(minMetricValue, 10);
  if (minMetricValue != null && !Number.isFinite(parsedMinMetric)) {
    throw new ApiError(400, { error: 'invalid_min_metric_value' });
  }

  let sort = '-fetched_at';
  const sortBy = searchParams.get('sort_by');
  if (sortBy && VALID_SORT_FIELDS.has(sortBy)) sort = `-${sortBy}`;

  const cursor = decodeCursor(searchParams.get('cursor'));
  if (cursor.sort) sort = cursor.sort;

  const items = await queryTrends(env, {
    platform: searchParams.get('platform'),
    category: searchParams.get('category'),
    region_code: searchParams.get('region_code'),
    q: searchParams.get('q'),
    start_date: searchParams.get('start_date'),
    end_date: searchParams.get('end_date'),
    min_metric_value: parsedMinMetric,
    status,
    limit,
    offset: cursor.offset,
    sort,
  });

  const hasMore = items.length === limit;
  return {
    items,
    paging: {
      limit,
      next_cursor: hasMore ? encodeCursor(cursor.offset + limit, sort) : null,
      has_more: hasMore,
    },
  };
}

async function trendsMockup(env, searchParams) {
  const limit = normalizeLimit(searchParams.get('limit') || '12');
  const rows = await queryTrends(env, {
    platform: searchParams.get('platform'),
    category: searchParams.get('category'),
    limit,
    offset: 0,
    sort: '-fetched_at',
  });

  return {
    hero: rows[0] || null,
    highlights: rows.slice(1, 2),
    latest: rows,
  };
}

async function trendsMockupScope(env, rawScope) {
  const scope = String(rawScope || '').trim().toLowerCase();
  const target = MOCKUP_SCOPE_FILTERS[scope];
  if (!target) throw new ApiError(404, { error: 'mockup_scope_not_found', scope: rawScope });

  const items = [];
  let offset = 0;
  while (true) {
    const rows = await queryTrends(env, {
      platform: target.platform,
      region_code: target.region_code,
      limit: MOCKUP_PAGE_SIZE,
      offset,
      sort: '-fetched_at',
    });
    items.push(...rows);
    if (rows.length < MOCKUP_PAGE_SIZE) break;
    offset += MOCKUP_PAGE_SIZE;
  }

  return { scope, platform: target.platform, region_code: target.region_code || null, count: items.length, items };
}

async function listCategories(env) {
  const seen = new Set();
  const categories = [];
  let offset = 0;

  while (true) {
    const rows = await queryTrends(env, {
      status: 'approved',
      limit: CATEGORY_PAGE_SIZE,
      offset,
      sort: '-fetched_at',
    });

    for (const row of rows) {
      const value = String(row.category || '').trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      categories.push({ value, label: titleCaseCategory(value) });
    }

    if (rows.length < CATEGORY_PAGE_SIZE) break;
    offset += CATEGORY_PAGE_SIZE;
  }

  return categories.sort((a, b) => a.label.localeCompare(b.label));
}

async function trendStats(env) {
  const platforms = ['youtube', 'x'];
  const by_platform = [];
  let total_trends = 0;

  for (const platform of platforms) {
    const payload = await nocoList(env, env.NOCODB_TRENDS_TABLE_ID, {
      where: `(platform,eq,${platform})`,
      pageSize: 1,
      limit: 1,
    });
    const total = countFromPayload(payload);
    total_trends += total;
    const first = rowsFromPayload(payload)[0] || {};
    by_platform.push({ platform, total_trends: total, newest_fetched_at: first.fetched_at || null });
  }

  return { total_trends, by_platform };
}

async function listSources(env, searchParams) {
  if (!env.NOCODB_SOURCES_TABLE_ID) return [];
  const where = searchParams.get('platform') ? `(platform,eq,${searchParams.get('platform')})` : undefined;
  const payload = await nocoList(env, env.NOCODB_SOURCES_TABLE_ID, { limit: 100, pageSize: 100, where });
  return rowsFromPayload(payload).map((row) => ({
    id: row.id || row.Id || '',
    name: row.name || '',
    platform: row.platform || '',
    last_fetched_at: row.last_fetched_at || null,
    last_fetch_status: row.last_fetch_status || '',
    enabled: Boolean(row.enabled),
  }));
}

async function getTrend(env, recordId) {
  return nocoRecord(env, env.NOCODB_TRENDS_TABLE_ID, recordId);
}

async function patchTrend(env, recordId, body) {
  const existing = await getTrend(env, recordId);
  if (!existing) return null;
  const updates = pick(body, [
    'status',
    'title',
    'category',
    'description',
    'url',
    'thumbnail_url',
    'published_date',
    'metric_type',
    'metric_value',
    'region_code',
    'ar_translation',
    'title_ar',
  ]);
  await nocoRequest(env, recordsPath(env, env.NOCODB_TRENDS_TABLE_ID), { method: 'PATCH', body: JSON.stringify([{ Id: recordId, ...updates }]) });
  return getTrend(env, recordId);
}

async function deleteTrend(env, recordId) {
  const existing = await getTrend(env, recordId);
  if (!existing) return false;
  await nocoRequest(env, recordsPath(env, env.NOCODB_TRENDS_TABLE_ID), { method: 'DELETE', body: JSON.stringify([{ Id: recordId }]) });
  return true;
}

async function patchSource(env, sourceId, enabled) {
  if (!env.NOCODB_SOURCES_TABLE_ID) return null;
  await nocoRequest(env, recordsPath(env, env.NOCODB_SOURCES_TABLE_ID), {
    method: 'PATCH',
    body: JSON.stringify([{ Id: sourceId, enabled: Boolean(enabled) }]),
  });
  return nocoRecord(env, env.NOCODB_SOURCES_TABLE_ID, sourceId);
}

async function queryTrends(env, filters) {
  const whereParts = [];
  if (filters.platform) {
    whereParts.push(filters.platform.includes(',') ? `(platform,anyof,${filters.platform})` : `(platform,eq,${filters.platform})`);
  }
  if (filters.category) {
    const values = filters.category.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (values.length > 1) whereParts.push(`(category,anyof,${values.join(',')})`);
    else if (values.length === 1) whereParts.push(`(category,eq,${values[0]})`);
  }
  if (filters.region_code) whereParts.push(`(region_code,eq,${filters.region_code})`);
  if (filters.start_date) whereParts.push(`(published_date,gte,${filters.start_date})`);
  if (filters.end_date) whereParts.push(`(published_date,lte,${filters.end_date})`);
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    whereParts.push(`(title,like,%${q}%)~or(description,like,%${q}%)`);
  }
  if (filters.min_metric_value != null) whereParts.push(`(metric_value,gte,${filters.min_metric_value})`);
  if (filters.status === 'approved' || filters.status === 'rejected') whereParts.push(`(status,eq,${filters.status})`);

  const payload = await nocoList(env, env.NOCODB_TRENDS_TABLE_ID, {
    limit: filters.limit,
    pageSize: filters.limit,
    offset: filters.offset,
    sort: filters.sort,
    where: whereParts.length ? whereParts.join('~and') : undefined,
    viewId: env.NOCODB_TRENDS_VIEW_ID || undefined,
  });

  let rows = rowsFromPayload(payload);
  if (filters.status === 'pending') {
    rows = rows.filter((row) => normalizeStatus(row.status) === 'pending');
  }
  if (filters.status) {
    rows = rows.map((row) => ({ ...row, status: normalizeStatus(row.status) }));
  }
  return rows;
}

async function nocoList(env, tableId, params) {
  if (!configured(env.NOCODB_API_TOKEN)) return {};
  try {
    const cleanParams = Object.fromEntries(Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    if (env.NOCODB_BASE_ID) {
      if (cleanParams.limit != null && cleanParams.pageSize == null) {
        cleanParams.pageSize = cleanParams.limit;
      }
      delete cleanParams.limit;
      // NocoDB v3 expects sort as field-id JSON. Omit it until field IDs are configured.
      delete cleanParams.sort;
    }
    return await nocoRequest(env, recordsPath(env, tableId), { params: cleanParams });
  } catch (error) {
    console.error(JSON.stringify({ event: 'nocodb_list_failed', table: tableId, error: String(error) }));
    return {};
  }
}

async function nocoRecord(env, tableId, recordId) {
  if (!configured(env.NOCODB_API_TOKEN)) return null;
  try {
    const row = await nocoRequest(env, recordsPath(env, tableId, recordId), { allow404: true });
    return row ? normalizeNocoRow(row) : null;
  } catch (error) {
    console.error(JSON.stringify({ event: 'nocodb_record_failed', table: tableId, error: String(error) }));
    return null;
  }
}

async function nocoRequest(env, path, options = {}) {
  const baseUrl = String(env.NOCODB_API_URL || '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('NOCODB_API_URL is not configured');
  if (!configured(env.NOCODB_API_TOKEN)) throw new Error('NOCODB_API_TOKEN is not configured');

  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(options.params || {})) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'xc-token': env.NOCODB_API_TOKEN,
    },
    body: options.body,
  });

  if (options.allow404 && response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NocoDB HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

function recordsPath(env, tableId, recordId) {
  const baseId = env.NOCODB_BASE_ID;
  const path = baseId
    ? `/api/v3/data/${baseId}/${tableId}/records`
    : `/api/v2/tables/${tableId}/records`;
  return recordId == null ? path : `${path}/${recordId}`;
}

function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload.filter((row) => row && typeof row === 'object').map(normalizeNocoRow);
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['list', 'records', 'data']) {
    if (Array.isArray(payload[key])) return payload[key].filter((row) => row && typeof row === 'object').map(normalizeNocoRow);
  }
  return [];
}

function normalizeNocoRow(row) {
  if (!row || typeof row !== 'object') return row;
  if (row.fields && typeof row.fields === 'object') {
    const id = row.id ?? row.Id ?? row.id_fields?.Id ?? row.fields.id ?? row.fields.Id ?? '';
    return { ...row.fields, id: String(id) };
  }
  const id = row.id ?? row.Id;
  return id == null ? row : { ...row, id: String(id) };
}

function countFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return 0;
  for (const key of ['count', 'totalRows', 'total']) {
    if (payload[key] != null) return Number(payload[key]) || 0;
  }
  if (payload.pageInfo && typeof payload.pageInfo === 'object') {
    return Number(payload.pageInfo.totalRows || payload.pageInfo.total || 0) || 0;
  }
  return rowsFromPayload(payload).length;
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || 'pending';
}

function titleCaseCategory(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function pick(source, keys) {
  const result = {};
  if (!source || typeof source !== 'object') return result;
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

class ApiError extends Error {
  constructor(status, payload) {
    super(payload.error || 'api_error');
    this.status = status;
    this.payload = payload;
  }
}
