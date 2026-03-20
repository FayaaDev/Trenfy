---
phase: quick-260320-bpk-calling-x-and-youtube-apis-is-expensive
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - api/routes/trends.py
  - tests/test_api_trends_mockup.py
  - .env.example
  - docs/mockup-mode.md
autonomous: true
requirements:
  - MOCK-01
  - MOCK-02
  - MOCK-03
must_haves:
  truths:
    - "Team can load a realistic trend mockup without triggering X or YouTube API calls"
    - "Mockup data is sourced from existing NocoDB trends records"
    - "Mockup endpoint remains read-only and does not trigger refresh/scan workflows"
  artifacts:
    - path: "api/routes/trends.py"
      provides: "Read-only /api/trends/mockup endpoint built on existing NocoDB data"
      contains: "@trends_router.get(\"/mockup\")"
    - path: "tests/test_api_trends_mockup.py"
      provides: "Automated coverage that mockup endpoint is read-only and workflow-free"
    - path: ".env.example"
      provides: "Documented mockup-safe runtime mode (scheduler disabled)"
    - path: "docs/mockup-mode.md"
      provides: "How to run backend in cheap mockup mode and consume endpoint"
  key_links:
    - from: "api/routes/trends.py:/api/trends/mockup"
      to: "tools.nocodb_trends_client.nocodb_trends.query_trends"
      via: "NocoDB read query with limit/sort only"
      pattern: "query_trends"
    - from: "api/routes/trends.py:/api/trends/mockup"
      to: "workflows.trends_scheduler.workflow"
      via: "No call path allowed"
      pattern: "refresh_trends is not referenced"
---

<objective>
Create a cheap, demo-ready trends mockup path that uses existing NocoDB records instead of live X/YouTube polling.

Purpose: unblock UI/product mockups while avoiding ongoing third-party API costs.
Output: new read-only mockup endpoint, tests, and a short runbook for mockup mode.
</objective>

<execution_context>
@/Users/fayaa/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/fayaa/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@app.py
@api/routes/trends.py
@tests/test_api_trends_read.py

<interfaces>
From `api/routes/trends.py`:
```python
@trends_router.get("")
async def list_trends(...):
    items = await nocodb_trends.query_trends(...)

@trends_router.post("/refresh")
async def refresh_trends(...):
    result = await workflow.scan_source(source)
```

From `app.py`:
```python
if _env_enabled("TRENDS_ENABLED", default=True):
    await scheduler.start()
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add read-only NocoDB-backed mockup endpoint</name>
  <files>api/routes/trends.py, tests/test_api_trends_mockup.py</files>
  <behavior>
    - GET /api/trends/mockup returns a compact payload built from NocoDB rows only.
    - Endpoint supports small mockup controls (`limit`, optional `platform`/`category`) to shape demo screens.
    - Endpoint never triggers `workflow.scan_source`, scheduler actions, or any external platform client calls.
    - Response includes deterministic sections useful for mock UI cards (e.g., `hero`, `highlights`, `latest`).
  </behavior>
  <action>
    Write tests first in `tests/test_api_trends_mockup.py` (RED), mocking `nocodb_trends.query_trends` to return fixture rows and asserting endpoint shape.

    Then add `@trends_router.get("/mockup")` in `api/routes/trends.py`:
    - Query from NocoDB via existing `nocodb_trends.query_trends`.
    - Build grouped mockup payload from returned rows (no writes, no refresh path).
    - Keep defaults small and fast for mockup usage.
    - Do not import or call `workflow` in this endpoint.
  </action>
  <verify>
    <automated>python -m pytest tests/test_api_trends_mockup.py -x -q</automated>
  </verify>
  <done>
    - `/api/trends/mockup` exists and returns stable grouped payload from existing NocoDB data.
    - Tests prove read-only behavior and absence of refresh/workflow calls.
  </done>
</task>

<task type="auto">
  <name>Task 2: Document and harden mockup-safe runtime mode</name>
  <files>.env.example, docs/mockup-mode.md</files>
  <action>
    Add explicit mockup mode guidance:
    - Set `TRENDS_ENABLED=false` to disable scheduler polling.
    - Use `/api/trends/mockup` for UI mock data from NocoDB.
    - Include a minimal run + curl example and expected response keys.

    Keep this documentation scoped to cost-saving mockups only; do not change production defaults.
  </action>
  <verify>
    <automated>python -m pytest tests/test_api_trends_read.py -x -q</automated>
  </verify>
  <done>
    - `.env.example` clearly shows scheduler-off option for mockup sessions.
    - `docs/mockup-mode.md` gives copy-paste commands to run and validate mockup endpoint.
  </done>
</task>

</tasks>

<verification>
- `python -m pytest tests/test_api_trends_mockup.py tests/test_api_trends_read.py -x -q`
- `TRENDS_ENABLED=false uvicorn app:app --port 8080` then `curl "http://localhost:8080/api/trends/mockup?limit=12"`
- Confirm response contains grouped sections and no refresh side effects.
</verification>

<success_criteria>
- Mockup consumers can build UI using existing NocoDB data only.
- Mockup flow requires zero X/YouTube API traffic when `TRENDS_ENABLED=false`.
- Endpoint behavior is covered by automated tests and documented for repeatable use.
</success_criteria>

<output>
After completion, create `.planning/quick/260320-bpk-calling-x-and-youtube-apis-is-expensive-/260320-bpk-SUMMARY.md`
</output>
