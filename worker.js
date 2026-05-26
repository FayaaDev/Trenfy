const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);
const VALID_SORT_FIELDS = new Set(['fetched_at', 'metric_value', 'published_date']);
const CATEGORY_PAGE_SIZE = 200;
const MOCKUP_PAGE_SIZE = 200;
const YOUTUBE_VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
const X_RECENT_SEARCH_ENDPOINT = 'https://api.x.com/2/tweets/search/recent';

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

const TREND_SOURCES = [
  {
    id: 'YOUTUBE_TRENDING_US',
    name: 'YouTube Trending - United States',
    platform: 'youtube',
    endpoint: 'videos.list',
    params: { chart: 'mostPopular', regionCode: 'US', part: 'snippet,contentDetails,statistics' },
    check_interval_minutes: 15,
    enabled: true,
    min_metric_value: 100000,
    blocked_keywords: [],
  },
  {
    id: 'YOUTUBE_TRENDING_JP',
    name: 'YouTube Trending - Japan',
    platform: 'youtube',
    endpoint: 'videos.list',
    params: { chart: 'mostPopular', regionCode: 'JP', part: 'snippet,contentDetails,statistics' },
    check_interval_minutes: 15,
    enabled: true,
    min_metric_value: 0,
    blocked_keywords: [],
  },
  {
    id: 'YOUTUBE_TRENDING_SA',
    name: 'YouTube Trending - Saudi Arabia',
    platform: 'youtube',
    endpoint: 'videos.list',
    params: { chart: 'mostPopular', regionCode: 'SA', part: 'snippet,contentDetails,statistics' },
    check_interval_minutes: 15,
    enabled: true,
    min_metric_value: 0,
    blocked_keywords: [],
  },
  {
    id: 'X_RECENT_GLOBAL_EN',
    name: 'X Recent Search - Global English',
    platform: 'x',
    endpoint: 'tweets.search.recent',
    params: { query: '(breaking OR viral OR "just announced") lang:en -is:retweet', region_code: 'GLOBAL', category: 'news', sort_order: 'recency', max_results: 20 },
    check_interval_minutes: 10,
    enabled: true,
    min_metric_value: 0,
    blocked_keywords: [],
  },
  {
    id: 'X_RECENT_SA_AR',
    name: 'X Recent Search - Saudi Arabia Arabic',
    platform: 'x',
    endpoint: 'tweets.search.recent',
    params: { query: '(saudi OR riyadh OR ksa) lang:ar -is:retweet', region_code: 'SA', category: 'news', sort_order: 'recency', max_results: 20 },
    check_interval_minutes: 10,
    enabled: true,
    min_metric_value: 500,
    blocked_keywords: ['massage', 'مساج'],
  },
];

const YOUTUBE_CATEGORY_BY_ID = {
  '10': 'Music',
  '20': 'Gaming',
  '17': 'Sports',
  '1': 'Movies',
  '18': 'Movies',
  '30': 'Movies',
  '31': 'Movies',
  '32': 'Movies',
  '33': 'Movies',
  '34': 'Movies',
  '35': 'Movies',
  '36': 'Movies',
  '37': 'Movies',
  '38': 'Movies',
  '39': 'Movies',
  '40': 'Movies',
  '41': 'Movies',
  '42': 'Movies',
  '43': 'Movies',
  '44': 'Movies',
  '25': 'News',
};

const CATEGORY_MAP = {
  game: 'gaming',
  games: 'gaming',
  gaming: 'gaming',
  music: 'music',
  sport: 'sports',
  sports: 'sports',
  movie: 'movies',
  movies: 'movies',
  film: 'movies',
  films: 'movies',
  cinema: 'movies',
  news: 'news',
  politics: 'news',
  breaking: 'news',
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
            x_bearer_token_configured: configured(xBearerToken(env)),
            nocodb_api_token_configured: configured(env.NOCODB_API_TOKEN),
            refresh_token_configured: configured(env.REFRESH_TOKEN),
          },
          platform_source_counts: platformSourceCounts(),
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
        await requireRefreshAuth(request, env);
        return jsonResponse(await refreshTrends(env, await readJsonBody(request)), env);
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

function platformSourceCounts() {
  const counts = {};
  for (const source of TREND_SOURCES) {
    const platform = String(source.platform || '').trim().toLowerCase();
    if (!platform) continue;
    counts[platform] = (counts[platform] || 0) + 1;
  }
  return counts;
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireRefreshAuth(request, env) {
  if (!configured(env.REFRESH_TOKEN)) {
    throw new ApiError(503, { error: 'refresh_token_not_configured' });
  }

  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const provided = match ? match[1].trim() : '';
  if (!provided || !(await safeEqual(provided, env.REFRESH_TOKEN))) {
    throw new ApiError(401, { error: 'unauthorized' });
  }
}

async function safeEqual(left, right) {
  const [leftHash, rightHash] = await Promise.all([sha256Bytes(String(left)), sha256Bytes(String(right))]);
  let diff = leftHash.length ^ rightHash.length;
  for (let index = 0; index < leftHash.length && index < rightHash.length; index += 1) {
    diff |= leftHash[index] ^ rightHash[index];
  }
  return diff === 0;
}

async function sha256Bytes(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(digest);
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

async function refreshTrends(env, body) {
  const payload = body && typeof body === 'object' ? body : {};
  const sourceId = String(payload.source_id || '').trim();
  const platform = String(payload.platform || '').trim().toLowerCase();

  if ((sourceId && platform) || (!sourceId && !platform)) {
    throw new ApiError(422, { error: 'invalid_refresh_selector' });
  }

  let selectedSources;
  if (sourceId) {
    const source = TREND_SOURCES.find((candidate) => candidate.id === sourceId);
    if (!source) throw new ApiError(404, { error: 'source_not_found', id: sourceId });
    selectedSources = [source];
  } else if (platform === 'all') {
    selectedSources = TREND_SOURCES.filter((source) => source.enabled);
  } else {
    selectedSources = TREND_SOURCES.filter((source) => source.enabled && source.platform === platform);
  }

  const results = [];
  for (const source of selectedSources) {
    results.push(await scanSource(env, source));
  }

  return {
    sources_run: results.length,
    fetched: sumResults(results, 'fetched'),
    stored: sumResults(results, 'stored'),
    duplicates: sumResults(results, 'duplicates'),
    results,
  };
}

function sumResults(results, key) {
  return results.reduce((total, result) => total + (Number(result[key]) || 0), 0);
}

async function scanSource(env, source) {
  const result = {
    source_id: source.id,
    fetched: 0,
    stored: 0,
    duplicates: 0,
    invalid: 0,
    below_threshold: 0,
    blocked: 0,
    status: 'success',
  };

  try {
    const fetchedItems = await fetchSourceItems(env, source, 20);
    result.fetched = fetchedItems.length;

    let validItems = [];
    for (const item of fetchedItems) {
      if (!String(item.title || '').trim() || !String(item.url || '').trim()) {
        result.invalid += 1;
        continue;
      }
      item.content_hash = await computeContentHash(item);
      validItems.push(item);
    }

    const minMetricValue = Number(source.min_metric_value || 0);
    if (minMetricValue > 0) {
      const before = validItems.length;
      validItems = validItems.filter((item) => Number(item.metric_value || 0) >= minMetricValue);
      result.below_threshold = before - validItems.length;
    }

    const blockedKeywords = Array.isArray(source.blocked_keywords) ? source.blocked_keywords : [];
    if (blockedKeywords.length > 0) {
      const blockedLower = blockedKeywords.map((keyword) => String(keyword).toLowerCase());
      const before = validItems.length;
      validItems = validItems.filter((item) => !blockedLower.some((keyword) => String(item.title || '').toLowerCase().includes(keyword)));
      result.blocked = before - validItems.length;
    }

    const existingHashes = await batchCheckDuplicates(env, validItems.map((item) => item.content_hash).filter(Boolean));
    const newItems = validItems.filter((item) => !existingHashes.has(item.content_hash));
    result.duplicates = validItems.length - newItems.length;

    if (newItems.length > 0) {
      const created = await batchCreateTrends(env, newItems);
      result.stored = created.length;
    }

    result.status = result.invalid > 0 ? 'partial_success' : 'success';
  } catch (error) {
    console.error(JSON.stringify({ event: 'refresh_source_failed', source_id: source.id, error: String(error) }));
    result.status = 'error';
    result.error = String(error);
  }

  await updateSourceStatus(env, source.id, result.status);
  return result;
}

async function fetchSourceItems(env, source, maxItems) {
  if (source.platform === 'youtube') return fetchYouTubeItems(env, source, maxItems);
  if (source.platform === 'x') return fetchXItems(env, source, maxItems);
  throw new Error(`Unsupported platform: ${source.platform}`);
}

async function fetchYouTubeItems(env, source, maxItems) {
  if (!configured(env.YOUTUBE_API_KEY)) throw new Error('YOUTUBE_API_KEY is required');

  const sourceParams = source.params || {};
  const queryMax = Math.min(clampInt(maxItems, 1, 20, 20), 20);
  const regionCode = String(sourceParams.regionCode || 'US');
  const params = new URLSearchParams({
    chart: String(sourceParams.chart || 'mostPopular'),
    regionCode,
    part: String(sourceParams.part || 'snippet,contentDetails,statistics'),
    maxResults: String(queryMax),
    key: env.YOUTUBE_API_KEY,
  });

  const response = await fetch(`${YOUTUBE_VIDEOS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error(`YouTube HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();

  const results = [];
  for (const rawItem of Array.isArray(payload.items) ? payload.items : []) {
    const item = normalizeYouTubeItem(rawItem, regionCode);
    if (!item) continue;
    results.push(item);
    if (results.length >= queryMax) break;
  }
  return results;
}

function normalizeYouTubeItem(rawItem, regionCode) {
  const snippet = rawItem?.snippet || {};
  const stats = rawItem?.statistics || {};
  const contentDetails = rawItem?.contentDetails || {};
  const title = String(snippet.title || '').trim();
  const videoId = String(rawItem?.id || '').trim();
  if (!title || !videoId) return null;

  const categoryId = String(snippet.categoryId || '');
  return {
    platform: 'youtube',
    category: normalizeCategory(YOUTUBE_CATEGORY_BY_ID[categoryId] || ''),
    title,
    description: String(snippet.description || ''),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail_url: snippet.thumbnails?.high?.url || null,
    published_date: String(snippet.publishedAt || '').slice(0, 10),
    metric_type: 'view_count',
    metric_value: clampInt(stats.viewCount, 0, 10 ** 12, 0),
    region_code: regionCode,
    metadata: {
      video_id: videoId,
      channel_title: String(snippet.channelTitle || ''),
      channel_id: String(snippet.channelId || ''),
      duration: String(contentDetails.duration || ''),
      view_count: clampInt(stats.viewCount, 0, 10 ** 12, 0),
      like_count: clampInt(stats.likeCount, 0, 10 ** 12, 0),
      comment_count: clampInt(stats.commentCount, 0, 10 ** 12, 0),
      category_id: categoryId,
      secondary_category_hint: String(snippet.defaultLanguage || ''),
    },
  };
}

async function fetchXItems(env, source, maxItems) {
  const bearerToken = xBearerToken(env);
  if (!configured(bearerToken)) throw new Error('X_BEARER_TOKEN is required');

  const sourceParams = source.params || {};
  const query = String(sourceParams.query || '').trim();
  if (!query) throw new Error(`X source '${source.id}' is missing params.query`);

  const fetchLimit = Math.min(
    clampInt(maxItems, 1, 100, 20),
    clampInt(sourceParams.max_results, 1, 100, 20),
  );
  const apiLimit = Math.max(10, fetchLimit);
  const regionCode = String(sourceParams.region_code || sourceParams.regionCode || 'GLOBAL');
  const category = normalizeCategory(String(sourceParams.category || ''));

  const params = new URLSearchParams({
    query,
    max_results: String(apiLimit),
    sort_order: String(sourceParams.sort_order || 'recency'),
    'tweet.fields': 'created_at,public_metrics,lang,author_id',
    expansions: 'author_id',
    'user.fields': 'username,name',
  });

  const response = await fetch(`${X_RECENT_SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`X HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const users = payload?.includes?.users || [];
  const usernameByAuthorId = new Map(users.filter((user) => user && typeof user === 'object').map((user) => [String(user.id || ''), String(user.username || '')]));

  const results = [];
  for (const raw of Array.isArray(payload.data) ? payload.data : []) {
    if (!raw || typeof raw !== 'object') continue;
    const tweetId = String(raw.id || '').trim();
    const text = String(raw.text || '').trim();
    if (!tweetId || !text) continue;

    const authorId = String(raw.author_id || '');
    const username = usernameByAuthorId.get(authorId) || '';
    const createdAt = String(raw.created_at || '');
    const publicMetrics = raw.public_metrics || {};
    results.push({
      platform: 'x',
      category,
      title: text,
      description: text,
      url: username ? `https://x.com/${username}/status/${tweetId}` : `https://x.com/i/web/status/${tweetId}`,
      thumbnail_url: null,
      published_date: createdAt.length >= 10 ? createdAt.slice(0, 10) : '',
      metric_type: 'engagement',
      metric_value: engagementScore(publicMetrics),
      region_code: regionCode,
      metadata: {
        tweet_id: tweetId,
        author_id: authorId,
        author_username: username,
        lang: String(raw.lang || ''),
        created_at: createdAt,
        public_metrics: publicMetrics,
        query,
      },
    });
    if (results.length >= fetchLimit) break;
  }
  return results;
}

function engagementScore(publicMetrics) {
  if (!publicMetrics || typeof publicMetrics !== 'object') return 0;
  return ['retweet_count', 'reply_count', 'like_count', 'quote_count', 'bookmark_count', 'impression_count']
    .reduce((score, key) => score + clampInt(publicMetrics[key], 0, 10 ** 12, 0), 0);
}

function xBearerToken(env) {
  return env.X_BEARER_TOKEN || env.X_API_KEY || '';
}

function normalizeCategory(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return CATEGORY_MAP[key] || 'news';
}

async function computeContentHash(item) {
  const content = `${item.platform}|${String(item.title || '').toLowerCase()}|${item.published_date || ''}|${item.region_code || ''}`;
  const digest = await sha256Bytes(content);
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function batchCheckDuplicates(env, hashes) {
  const existing = new Set();
  const uniqueHashes = [...new Set(hashes)].filter(Boolean);
  for (const chunk of chunks(uniqueHashes, 50)) {
    const payload = await nocoList(env, env.NOCODB_TRENDS_TABLE_ID, {
      where: `(content_hash,anyof,${chunk.join(',')})`,
      limit: 1000,
      pageSize: 1000,
    });
    for (const row of rowsFromPayload(payload)) {
      if (row.content_hash) existing.add(row.content_hash);
    }
  }
  return existing;
}

async function batchCreateTrends(env, items) {
  if (!items.length) return [];
  const created = [];
  for (const itemChunk of chunks(items, 10)) {
    const payload = await nocoRequest(env, recordsPath(env, env.NOCODB_TRENDS_TABLE_ID), {
      method: 'POST',
      body: JSON.stringify(nocoMutationRecords(env, itemChunk.map(itemToNocoRecord))),
    });
    created.push(...rowsFromPayload(payload));
  }
  return created;
}

function itemToNocoRecord(item) {
  return {
    platform: item.platform,
    category: item.category,
    title: item.title,
    description: item.description,
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    published_date: item.published_date,
    metric_type: item.metric_type,
    metric_value: item.metric_value,
    region_code: item.region_code,
    metadata: JSON.stringify(item.metadata || {}),
    content_hash: item.content_hash,
    fetched_at: new Date().toISOString(),
    notification_sent: false,
    ar_translation: item.ar_translation || null,
    title_ar: item.title_ar || null,
    status: item.status || 'approved',
  };
}

async function updateSourceStatus(env, sourceId, status) {
  if (!env.NOCODB_SOURCES_TABLE_ID) return false;
  try {
    const lookup = await nocoList(env, env.NOCODB_SOURCES_TABLE_ID, {
      where: `(id,eq,${sourceId})`,
      limit: 1,
      pageSize: 1,
    });
    const row = rowsFromPayload(lookup)[0];
    const rowId = row?.Id || row?.id;
    if (!rowId) return false;

    await nocoRequest(env, recordsPath(env, env.NOCODB_SOURCES_TABLE_ID), {
      method: 'PATCH',
      body: JSON.stringify(nocoMutationRecords(env, [{ Id: rowId, last_fetched_at: new Date().toISOString(), last_fetch_status: status }])),
    });
    return true;
  } catch (error) {
    console.error(JSON.stringify({ event: 'source_status_update_failed', source_id: sourceId, error: String(error) }));
    return false;
  }
}

function clampInt(value, minimum, maximum, fallback) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, numeric));
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function nocoMutationRecords(env, records) {
  if (!env.NOCODB_BASE_ID) return records;
  return records.map((record) => {
    const { Id, id, ...fields } = record;
    const rowId = id || Id;
    return rowId ? { id: rowId, fields } : { fields };
  });
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
  await nocoRequest(env, recordsPath(env, env.NOCODB_TRENDS_TABLE_ID), {
    method: 'PATCH',
    body: JSON.stringify(nocoMutationRecords(env, [{ Id: recordId, ...updates }])),
  });
  return getTrend(env, recordId);
}

async function deleteTrend(env, recordId) {
  const existing = await getTrend(env, recordId);
  if (!existing) return false;
  await nocoRequest(env, recordsPath(env, env.NOCODB_TRENDS_TABLE_ID), {
    method: 'DELETE',
    body: JSON.stringify(nocoMutationRecords(env, [{ Id: recordId }])),
  });
  return true;
}

async function patchSource(env, sourceId, enabled) {
  if (!env.NOCODB_SOURCES_TABLE_ID) return null;
  await nocoRequest(env, recordsPath(env, env.NOCODB_SOURCES_TABLE_ID), {
    method: 'PATCH',
    body: JSON.stringify(nocoMutationRecords(env, [{ Id: sourceId, enabled: Boolean(enabled) }])),
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
  if (payload.data && typeof payload.data === 'object') return [normalizeNocoRow(payload.data)];
  if (payload.Id != null || payload.id != null) return [normalizeNocoRow(payload)];
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
