# Phase 6: data-filtering — Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 hardens the data pipeline in two distinct layers:

**C — Ingestion filtering** (pipeline-level, runs before data enters NocoDB):
- Minimum metric threshold — configurable per source, items below floor are dropped
- Keyword blocklist — configurable per source, items whose title matches a blocked keyword are dropped
- Arabic translation enrichment — non-Arabic titles/descriptions are translated to Arabic via OpenRouter and stored in a new `ar_translation` column

**A — API filter hardening** (API layer, affects `GET /api/trends`):
- Multi-value platform filter with OR semantics (`?platform=youtube,x`)
- Full-text search on title/description (`?q=`)
- Configurable sort order (`?sort_by=fetched_at|metric_value|published_date`)
- Metric floor filter at query time (`?min_metric_value=`)

What this phase does NOT do: cross-platform same-story dedup, language detection/rejection, NLP classification, or any changes to how dedup hashing works.

</domain>

<decisions>
## Implementation Decisions

### C1 — Minimum Metric Threshold

- Each source in `config/trend_sources.json` gains an optional `min_metric_value` integer field (default: `0` — no floor)
- `TrendSource` model gains `min_metric_value: int = 0`
- `TrendsWorkflow.scan_source()` drops items where `item.metric_value < source.min_metric_value` before the dedup check — items never reach NocoDB
- Threshold is per-source, not per-platform — a source can set `0` to opt out
- Dropped items are counted and added to the `result` dict as `"below_threshold"` for observability

**Example source config:**
```json
{
  "id": "YOUTUBE_TRENDING_US",
  "min_metric_value": 100000
}
```
```json
{
  "id": "X_RECENT_SA_AR",
  "min_metric_value": 500
}
```

### C2 — Keyword Blocklist

- Each source in `trend_sources.json` gains an optional `blocked_keywords: list[str]` field (default: `[]`)
- `TrendSource` model gains `blocked_keywords: list[str] = []`
- Items are dropped if any blocked keyword appears as a **case-insensitive substring** in `item.title`
- Filtering runs inside `scan_source()`, after metric threshold filtering, before dedup
- Dropped items are counted as `"blocked"` in the result dict

**Example source config:**
```json
{
  "id": "X_RECENT_SA_AR",
  "blocked_keywords": ["massage", "escort"]
}
```

### C3 — Arabic Translation Enrichment

- NocoDB `trends` table gets a new `ar_translation` column (`LongText`, nullable)
- `TrendItem` model gains `ar_translation: Optional[str] = None`
- After ingestion filtering (threshold + blocklist), surviving items are translated **before** being stored:
  - If the item language is Arabic (X: `metadata["lang"] == "ar"`; YouTube: `region_code == "SA"` heuristic), set `ar_translation = None` — no translation needed
  - Otherwise, call OpenRouter to translate `title + "\n\n" + description` to Arabic and store the result in `ar_translation`
- Translation is **best-effort** — if OpenRouter call fails or `OPENROUTER_API_KEY` is not set, `ar_translation` remains `None` and ingestion proceeds normally (non-fatal)
- Translation uses the existing `get_openai_client()` from `tools/openai_client.py` with model from `OPENROUTER_MODEL` env var (default: `openai/gpt-4o-mini`)
- Translation is done in a single batch call per `scan_source()` run where possible — not one call per item — to reduce latency and API cost
- A new `tools/translation.py` module owns the translation logic, keeping workflow code clean

**Arabic detection heuristic (in priority order):**
1. X items: check `item.metadata["lang"] == "ar"`
2. YouTube SA items: treat as Arabic if `item.region_code == "SA"`
3. Everything else: translate

### A1 — Multi-Value Platform Filter

- `GET /api/trends?platform=youtube,x` returns trends from any of the listed platforms (OR semantics)
- Single value `?platform=youtube` continues to work as before
- In `nocodb_trends_client.query_trends()`: when `platform` contains a comma, use NocoDB `anyof` operator instead of `eq`; single value continues to use `eq`
- `api/routes/trends.py` `list_trends()` passes `platform` through unchanged — the client handles multi-value detection

### A2 — Full-Text Search

- New `?q=` query param on `GET /api/trends`
- Case-insensitive substring search across both `title` and `description`
- Implemented as two NocoDB `like` filter conditions joined with `~or`:
  `(title,like,%{q}%)~or(description,like,%{q}%)`
- Combined with other filters using `~and` wrapping
- Empty or whitespace-only `?q=` is ignored (no filter applied)
- No fuzzy matching — exact substring only

### A3 — Sort Options

- New `?sort_by=` query param on `GET /api/trends`
- Accepted values: `fetched_at` (default), `metric_value`, `published_date`
- Direction is always **descending** — no `asc` option exposed
- Invalid `sort_by` values fall back to `fetched_at` (no 400 error — silent default)
- The sort string passed to NocoDB becomes `-{field}` (e.g. `-metric_value`)
- Cursor pagination preserves the active sort — `encode_cursor` already stores `sort` in the cursor payload; this works without changes to the cursor format

### A4 — Metric Floor Filter at Query Time

- New `?min_metric_value=` integer query param on `GET /api/trends`
- Adds NocoDB filter: `(metric_value,gte,{value})`
- Combined with other filters using `~and`
- Non-integer values return a `400` with `{"error": "invalid_min_metric_value"}`
- This is independent of the per-source ingestion threshold — it filters what's already stored

### Claude's Discretion

- Exact prompt wording for the Arabic translation LLM call
- Whether to batch translate in parallel (asyncio.gather) or sequentially within a scan_source() run
- How to handle partial batch translation failures (translate what succeeds, set `None` for failures)
- Whether `translation.py` exposes a `translate_items(items)` batch function or item-by-item

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema and Architecture
- `Trenfy.md` — NocoDB schema (trends + trend_sources tables), pipeline architecture, env var reference. The `ar_translation` column is a new addition to the `trends` table beyond what's currently in this doc.
- `trend_agents/shared/models.py` — `TrendItem` and `TrendSource` Pydantic models; both need new fields (`ar_translation`, `min_metric_value`, `blocked_keywords`)
- `config/trend_sources.json` — Source config file that gains `min_metric_value` and `blocked_keywords` fields per source

### Pipeline
- `workflows/trends_workflow.py` — `scan_source()` method where ingestion filters (threshold, blocklist, translation) are inserted
- `tools/trend_clients/common.py` — `compute_content_hash()` — dedup logic is unchanged; filters run before this in workflow

### API Layer
- `api/routes/trends.py` — `list_trends()` function gains `q`, `sort_by`, `min_metric_value` params; `platform` param gains multi-value handling
- `api/contracts.py` — `encode_cursor`/`decode_cursor` (sort already in cursor — no format change needed); `normalize_limit`
- `tools/nocodb_trends_client.py` — `query_trends()` method that builds NocoDB `where` params; gains multi-value `anyof`, `like`, `gte` filter logic

### LLM Client
- `tools/openai_client.py` — Existing OpenRouter client (`get_openai_client()`, `has_openrouter_api_key()`, `get_default_llm_model()`); translation module re-uses this
- `.env.example` — `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL` (currently commented out — Phase 6 activates them)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `tools/openai_client.py:get_openai_client()` — Returns a lazy-initialized `AsyncOpenAI` client pointing at OpenRouter. Translation module uses this directly; no new client setup needed.
- `tools/openai_client.py:has_openrouter_api_key()` — Guards translation calls; if key is absent, skip silently.
- `tools/openai_client.py:get_default_llm_model()` — Returns `OPENROUTER_MODEL` env var (default `openai/gpt-4o-mini`). Translation should use this same model.
- `tools/trend_clients/common.py:retry_with_backoff()` — Available for wrapping OpenRouter translation calls if retry is desired.
- `api/contracts.py:encode_cursor` / `decode_cursor` — Already stores `sort` string inside the cursor. No cursor format changes needed for sort_by feature.

### Established Patterns

- **Ingestion filtering in workflow**: The existing `scan_source()` already filters `invalid` items (missing title/url) and counts them in `result`. Threshold and blocklist filtering follow the same pattern — filter early, count in result dict.
- **NocoDB where clause construction**: `query_trends()` builds `where_parts` as a list of `(field,op,value)` strings joined with `~and`. New filters (like, gte, anyof) extend this list using the same pattern.
- **Non-fatal failures**: OpenRouter translation follows the same non-fatal pattern as `_update_source_status()` — log warning, don't raise, continue.
- **TrendSource model extensibility**: `params: Dict[str, Any]` already exists on `TrendSource` — however `min_metric_value` and `blocked_keywords` should be first-class fields on the model (not buried in `params`) for type safety and discoverability.

### Integration Points

- `workflows/trends_workflow.py:scan_source()` lines 45–65 — Insert threshold filter after `valid_items` is built, insert blocklist filter after that, insert translation call before `batch_create_trends()`
- `tools/nocodb_trends_client.py:query_trends()` lines 177–190 — Extend `where_parts` list with `q`, `min_metric_value`, and handle multi-value `platform`
- `api/routes/trends.py:list_trends()` lines 22–30 — Add `q: Optional[str]`, `sort_by: Optional[str]`, `min_metric_value: Optional[int]` Query params; pass through to `query_trends()`; map `sort_by` to NocoDB sort string
- `tools/nocodb_trends_client.py:_item_to_record()` lines 96–112 — Add `"ar_translation": item.ar_translation` to the record dict
- NocoDB `trends` table — needs `ar_translation` column added (LongText, nullable) before any data is written with that field

</code_context>

<specifics>
## Specific Ideas

- **Arabic heuristic precedence**: Use `metadata["lang"] == "ar"` for X items first, then fall back to `region_code == "SA"` for YouTube. This matches the existing `lang` field already stored in X metadata (see `x_client.py` line 128).
- **Translation prompt**: Keep it minimal — instruct the model to translate to Modern Standard Arabic, no explanation, output only the translated text. Input is `title + "\n\n" + description`.
- **Blocked keywords are title-only**: Only check `item.title` for blocked keywords, not `description`. Titles are short and predictable; description matching would cause too many false positives.
- **Sort_by fallback is silent**: Invalid `sort_by` values silently fall back to `fetched_at` — don't 400 the caller. The mobile app should never send invalid values, and a silent fallback is less fragile than an error.
- **`min_metric_value` query param does 400 on non-integer**: This is stricter than `sort_by` because a silently ignored metric floor would be confusing (caller thinks they're filtering, they're not).
- **`ar_translation` column migration**: The NocoDB `trends` table needs the new column before any pipeline runs. This is a one-time manual step (or a startup migration) — planner should include it as a task.

</specifics>

<deferred>
## Deferred Ideas

- **Cross-platform same-story dedup** — detecting the same story on YouTube + X via title similarity. Explicitly out of scope for Phase 6 at user's decision. Exists as v2 requirement `INTEL-02`.
- **Language detection/rejection** — using `langdetect` or similar to drop items that don't match expected source languages. Not needed; X handles it at query level, YouTube is region-scoped.
- **Translation ascending sort** — exposing ascending sort direction via API. Not requested; all sorts are descending for now.
- **Separate `/api/trends/search` endpoint** — a dedicated search endpoint was not requested; `?q=` on the existing list endpoint is sufficient.
- **Spam ratio heuristic** (impression_count vs engagement ratio) — considered and rejected in favor of simpler keyword blocklist.
- **OPENROUTER_MODEL per-phase configurability** — currently one global model; per-source translation model config is out of scope.

</deferred>

---

## Requirements (testable)

### Ingestion — Metric Threshold (FILT-01 to FILT-03)

- **FILT-01**: `TrendSource` has a `min_metric_value: int = 0` field; `config/trend_sources.json` sources may specify it; sources without it default to `0` (no floor)
- **FILT-02**: `scan_source()` drops items where `item.metric_value < source.min_metric_value` before dedup; dropped count returned as `"below_threshold"` in result dict
- **FILT-03**: A source with `min_metric_value: 0` stores all items (existing behavior unchanged)

### Ingestion — Keyword Blocklist (FILT-04 to FILT-06)

- **FILT-04**: `TrendSource` has a `blocked_keywords: list[str] = []` field; sources may specify a list in `trend_sources.json`
- **FILT-05**: `scan_source()` drops items where any blocked keyword appears as a case-insensitive substring of `item.title`; dropped count returned as `"blocked"` in result dict
- **FILT-06**: A source with `blocked_keywords: []` stores all items (existing behavior unchanged)

### Ingestion — Arabic Translation (FILT-07 to FILT-12)

- **FILT-07**: NocoDB `trends` table has an `ar_translation` column (LongText, nullable)
- **FILT-08**: `TrendItem` has `ar_translation: Optional[str] = None`; `_item_to_record()` includes it in the NocoDB payload
- **FILT-09**: Items where `metadata["lang"] == "ar"` (X) or `region_code == "SA"` (YouTube) are stored with `ar_translation = None` — no translation call made
- **FILT-10**: All other items (English, Japanese, etc.) have `ar_translation` populated with an Arabic translation of `title + "\n\n" + description` via OpenRouter before being stored
- **FILT-11**: If `OPENROUTER_API_KEY` is absent or the translation call fails, `ar_translation` is set to `None` and ingestion proceeds without error
- **FILT-12**: A new `tools/translation.py` module owns translation logic and is called from `scan_source()`; `trends_workflow.py` does not contain OpenRouter call logic directly

### API — Multi-Value Platform Filter (API-08)

- **API-08**: `GET /api/trends?platform=youtube,x` returns trends from both platforms; `?platform=youtube` continues to return only YouTube trends; omitting `platform` returns all platforms

### API — Full-Text Search (API-09)

- **API-09**: `GET /api/trends?q=taylor` returns trends where `title` or `description` contains "taylor" (case-insensitive); empty `?q=` applies no filter

### API — Sort Options (API-10 to API-11)

- **API-10**: `GET /api/trends?sort_by=metric_value` returns trends sorted by `metric_value` descending; `sort_by=published_date` sorts by `published_date` descending; default (no param or `sort_by=fetched_at`) sorts by `fetched_at` descending
- **API-11**: An invalid `sort_by` value silently falls back to `fetched_at` — no 400 error returned; cursor pagination preserves the active sort across pages

### API — Metric Floor at Query Time (API-12)

- **API-12**: `GET /api/trends?min_metric_value=1000000` returns only trends with `metric_value >= 1000000`; a non-integer value returns `400 {"error": "invalid_min_metric_value"}`

---

*Phase: 05-data-filtering*
*Context gathered: 2026-03-20*
