# Mockup Mode (Low-Cost Demo Setup)

Use mockup mode when you need realistic trend data for UI demos without hitting X or YouTube APIs.

## What it does

- Disables scheduler polling with `TRENDS_ENABLED=false`
- Reads existing records from NocoDB only
- Serves scoped mock data from dedicated platform/region endpoints

## Quick start

```bash
TRENDS_ENABLED=false uv run uvicorn app:app --port 8080
```

In another terminal, call one of the scoped endpoints:

```bash
curl "http://localhost:8080/api/trends/mockup/yt"
```

Available scopes:

- `GET /api/trends/mockup/yt` - all YouTube rows
- `GET /api/trends/mockup/x` - all X rows
- `GET /api/trends/mockup/yt-us` - YouTube rows with `region_code=US`
- `GET /api/trends/mockup/yt-sa` - YouTube rows with `region_code=SA`
- `GET /api/trends/mockup/yt-jp` - YouTube rows with `region_code=JP`
- `GET /api/trends/mockup/x-us` - X rows with `region_code=US`
- `GET /api/trends/mockup/x-sa` - X rows with `region_code=SA`
- `GET /api/trends/mockup/x-jp` - X rows with `region_code=JP`

Example:

```bash
curl "http://localhost:8080/api/trends/mockup/x-sa"
```

Expected top-level response keys:

- `scope`
- `platform`
- `region_code`
- `count`
- `items`

The mockup endpoint is read-only and does not run refresh workflows.
