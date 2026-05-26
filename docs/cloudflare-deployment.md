# Cloudflare Deployment

Trenfy serves the Expo web app and mobile API from one Cloudflare Worker at `https://trenfy.fayaa92.sa`.

## Build Checks

Run these before deploying:

```bash
uv run pytest tests/test_infra_config.py tests/test_api_trends_read.py
cd app && npm run typecheck
cd app && npm test -- --runInBand
cd app && npx expo-doctor
```

`expo-doctor` may still report local CocoaPods availability and the checked-in `ios/` folder. Those are not blockers for EAS remote builds, but native config changes must be mirrored into `app/ios/` while that folder exists.

## Build Assets

```bash
cd app && npm run build:web:cloudflare
```

This bakes `EXPO_PUBLIC_API_URL=https://trenfy.fayaa92.sa` into the Expo web bundle and writes assets to `app/dist-web`.

## Deploy

```bash
npx wrangler deploy --dry-run
npx wrangler deploy
```

Required non-secret Worker vars are in `wrangler.jsonc`. Required secrets must be set with Wrangler:

```bash
npx wrangler secret put NOCODB_API_TOKEN
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put X_BEARER_TOKEN
```

`NOCODB_API_TOKEN` is required for live trend/category data. Without it, the API returns valid empty read contracts so the app still launches.

## Smoke Tests

```bash
curl "https://trenfy.fayaa92.sa/health"
curl "https://trenfy.fayaa92.sa/health/integrations"
curl "https://trenfy.fayaa92.sa/api/trends?status=approved&limit=1"
curl "https://trenfy.fayaa92.sa/api/categories"
curl "https://trenfy.fayaa92.sa/"
```

Expected API shapes:

```json
{"status":"ok"}
```

```json
{"items":[],"paging":{"limit":1,"next_cursor":null,"has_more":false}}
```
