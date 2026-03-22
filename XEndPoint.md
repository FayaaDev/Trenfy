# Plan: X API Trending Endpoint Upgrade

## Context
- Both `X_RECENT_GLOBAL_EN` and `X_RECENT_SA_AR` sources are affected
- Root cause: `sort_order: recency` returns chronological tweets regardless of engagement
- Goal: surface genuinely high-engagement, trending content

---

## Phase 1 — Quick Win: Switch to `relevancy` sort (both sources)

**Files changed**: `config/trend_sources.json` only.

Change `"sort_order": "recency"` → `"sort_order": "relevancy"` in both source configs. This is a zero-risk, no-code change that instructs X's ranking algorithm to prioritize engagement-weighted results.

For `X_RECENT_SA_AR`, also consider lowering `min_metric_value` from 500 → 100 since `relevancy` sort already pre-filters for higher engagement — the hard 500 floor becomes less necessary and may over-filter legitimate trending content.

---

## Phase 2 — New Client: `GET /2/trends/by/woeid/:id`

**New file**: `tools/trend_clients/x_trends_client.py`

```
GET https://api.x.com/2/trends/by/woeid/{woeid}?max_trends=20&trend.fields=trend_name,tweet_count
Authorization: Bearer $X_BEARER_TOKEN
```

WOEIDs:
- Saudi Arabia: `23424938`
- Worldwide: `1`

Response shape:
```json
{ "data": [{ "trend_name": "#SomeTrend", "tweet_count": 120000 }] }
```

The client maps each trend to a `TrendItem` where:
- `title` = `trend_name`
- `metric_value` = `tweet_count` (velocity, not engagement sum)
- `metric_type` = `"tweet_count"`
- `url` = `https://x.com/search?q={encoded_trend_name}`

Register with `CLIENT_CLASS = XTrendsClient` and add two new source entries to `trend_sources.json`:
```json
{ "id": "X_TRENDS_GLOBAL", "platform": "x_trends", "params": { "woeid": 1 }, ... }
{ "id": "X_TRENDS_SA", "platform": "x_trends", "params": { "woeid": 23424938 }, ... }
```

---

## Phase 3 — Two-Phase Pipeline: Trends → Search (optional, highest quality)

Implement a composite client `x_trending_search_client.py`:

1. Call `GET /2/trends/by/woeid/:id` → extract top N trend names
2. For each trend name, call `GET /2/tweets/search/recent` with `sort_order: relevancy` and the trend name as query
3. Merge results, deduplicate by `tweet_id`, rank by engagement score

This surfaces actual tweet content about confirmed trending topics — the best signal for a trending-style app. Trade-off: `N+1` API calls per poll cycle.

---

## Test coverage required per phase

| Phase | Tests to add/update |
|---|---|
| 1 | Update `test_x_client.py` to assert default `sort_order` is `relevancy` after config change |
| 2 | New `test_x_trends_client.py`: mock endpoint, verify `trend_name`/`tweet_count` mapping, WOEID passthrough |
| 3 | New `test_x_trending_search_client.py`: verify two-phase call sequence, dedup logic |

---

## Recommended execution order

Phase 1 → Phase 2 → Phase 3 (optional based on API quota). Phase 1 can ship immediately as a config-only change.
