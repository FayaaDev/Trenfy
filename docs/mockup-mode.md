# Mockup Mode (Low-Cost Demo Setup)

Use mockup mode when you need realistic trend data for UI demos without hitting X or YouTube APIs.

## What it does

- Disables scheduler polling with `TRENDS_ENABLED=false`
- Reads existing records from NocoDB only
- Serves grouped mock data from `GET /api/trends/mockup`

## Quick start

```bash
TRENDS_ENABLED=false uv run uvicorn app:app --port 8080
```

In another terminal:

```bash
curl "http://localhost:8080/api/trends/mockup?limit=12"
```

Optional shaping filters:

```bash
curl "http://localhost:8080/api/trends/mockup?limit=12&platform=youtube&category=music"
```

Expected top-level response keys:

- `hero`
- `highlights`
- `latest`

The mockup endpoint is read-only and does not run refresh workflows.
