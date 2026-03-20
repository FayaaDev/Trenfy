# Phase 3: Platform Clients - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement real platform clients for YouTube and X that fetch trend data, normalize into `TrendItem`, deduplicate by `content_hash`, and persist via NocoDB with source-level failure isolation. This discussion clarified behavior inside that fixed boundary; adding X/Twitter integration is out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Scope handling within fixed boundary
- Phase 3 boundary remains the roadmap-defined four-platform set (YouTube and X).
- Request to switch to YouTube + X only is deferred as a future roadmap item and does not change this phase's planning inputs.

### Regional coverage and fetch volume
- Keep existing source-region behavior from `config/trend_sources.json` for this phase (YouTube US/JP/SA, X US, X as currently configured).
- Persist up to 20 items per source per fetch cycle.

### Category mapping policy
- YouTube category is mapped from `categoryId` into app categories.
- If YouTube category mapping fails, fallback category is `entertainment`.
- Normalize stored categories strictly to `gaming`, `music`, or `entertainment`.
- Allow an optional secondary category hint in `metadata` for ambiguous content.
- Support source-level category override capability in config for future tuning.

### Metric normalization policy
- YouTube primary metric: `view_count`.
- X primary metric: `popularity`.
- X primary metric: `current_players`.
- X primary metric: `view_count`.

### Degraded data behavior
- If required fields are missing (for example title or URL), skip the item.
- For mixed-validity batches, persist valid items and skip invalid items.
- On full source failure for a cycle, set error status and continue normal scheduling.
- X circuit-breaker recovery is manual re-enable after auto-disable.

### Claude's Discretion
- Exact lookup table from YouTube `categoryId` values into the three app categories.
- Exact metadata key names for secondary-category hints.
- Exact status string naming for partial-success runs (while preserving clear success/error semantics).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria (four-platform clients, dedup, failure isolation).
- `.planning/REQUIREMENTS.md` — PLAT-01 through PLAT-08 acceptance requirements.

### Product and data specification
- `Trenfy.md` — Canonical Trenfy spec for platform client behavior, normalization, and NocoDB schema.
- `config/trend_sources.json` — Active source definitions, platform endpoints, intervals, and configured region parameters.

### Existing prior decisions
- `.planning/phases/01-clean-slate/01-CONTEXT.md` — Primary spec precedence (`Trenfy.md`) and retained reusable assets.
- `.planning/phases/02-data-foundation/02-CONTEXT.md` — Additive source sync, scheduler isolation expectations, and Phase 2 integration constraints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `trend_agents/shared/models.py`: `TrendItem`, metadata models, `TrendSource`, and `generate_trend_hash` are ready for direct use in client normalization.
- `tools/nocodb_trends_client.py`: provides dedup checks, create/batch create, and source-status update methods used by workflow/scheduler.
- `trend_agents/shared/source_registry.py`: loads enabled sources and parameters used to drive per-source fetch behavior.

### Established Patterns
- `workflows/trends_scheduler.py`: per-source `asyncio.create_task()` isolation and status updates are already in place.
- `workflows/trends_workflow.py`: `scan_source()` is the swap point where platform-client fetch/normalize/store logic replaces Phase 2 stub behavior.
- `app.py`: lifespan startup already syncs sources then starts scheduler; platform clients should fit this startup/runtime flow without changing the boundary.

### Integration Points
- Implement concrete platform clients and wire them into `workflows/trends_workflow.py` dispatch by `source.platform` and/or `source.id`.
- Keep dedup flow through `generate_trend_hash` + `NocoDBTrendsClient` duplicate checks before persistence.
- Continue using `NocoDBTrendsClient.update_source_status(...)` for success/error/circuit-breaker status visibility.

</code_context>

<specifics>
## Specific Ideas

- User referenced YouTube Data API v3 API-key flow as preferred for YouTube source execution.
- User explicitly named X Recent Search endpoint (`/2/tweets/search/recent`) as a desired future addition.

</specifics>

<deferred>
## Deferred Ideas

- Replace current four-platform Phase 3 scope with a two-platform scope (YouTube + X) — requires roadmap change, not a context-only decision.
- Add X/Twitter client via Recent Search API (`/2/tweets/search/recent`) as a new capability in a future phase/milestone.
- Move X implementation to a later stage despite current Phase 3 requirement mapping.
- Remove X from current phase scope.
- Remove X from current phase scope due public API accessibility concerns.

</deferred>

---

*Phase: 03-platform-clients*
*Context gathered: 2026-03-19*
