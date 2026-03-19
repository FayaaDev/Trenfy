# STACK.md — Technology Stack

## Project Identity

- **Name**: Trenfy (directory) / SehaRadar (running system)
- **Status**: Two systems coexist — SehaRadar (production-ready) + Trenfy (new build in progress)
- **Primary language**: Python 3.11+
- **Secondary language**: Node.js (bridge service)

---

## Python Stack

| Component | Library | Version (pyproject.toml) |
|---|---|---|
| Web framework | FastAPI | latest |
| ASGI server | uvicorn[standard] | latest |
| Data validation | pydantic + pydantic-settings | latest |
| HTTP client | httpx | latest (async) |
| LLM SDK | openai-agents (OpenAI Agents SDK) | latest |
| OpenAI compat | openai | latest |
| Env vars | python-dotenv | latest |
| SQLite (queue) | aiosqlite | latest |
| HTML parsing | beautifulsoup4 + lxml | latest |
| PDF parsing | pdfplumber | latest |
| Config | pyproject.toml + hatchling build backend | — |
| Runtime | Python 3.11 (FROM python:3.11-slim in Dockerfile) | 3.11 |

---

## Node.js Stack

| Component | Library | Version (package.json) |
|---|---|---|
| HTTP server | express | ^4.18.2 |
| HTTP client | axios | ^1.13.6 |
| HTML parsing | cheerio | ^1.2.0 |
| Env vars | dotenv | ^17.2.3 |
| DOM simulation | jsdom | ^23.0.0 |
| Browser automation | playwright + playwright-extra | ^1.53.2 |
| Stealth plugin | puppeteer-extra-plugin-stealth | ^2.11.2 |
| Dev: auto-reload | nodemon | ^3.0.1 |

---

## Infrastructure

| Component | Technology |
|---|---|
| Database / BaaS | NocoDB (self-hosted, Docker) |
| Containerization | Docker + docker-compose |
| Reverse proxy | Caddy (`caddy_default` network) |
| RSS aggregation | RSSHub (Docker, `diygod/rsshub:latest`) |
| Change monitoring | ChangeDetection.io (external service) |
| Deployment | Single Docker container (`seha-radar:latest`) |
| Data persistence | `/srv/data/seharadar` volume mount |

---

## Configuration Files

| File | Purpose |
|---|---|
| `pyproject.toml` | Python project config, dependencies, build |
| `requirements.txt` | Simplified pip-installable deps (subset) |
| `package.json` | Node.js deps for bridge-service.js |
| `.env.example` | All required environment variable keys |
| `docker-compose.yml` | Production deployment (SehaRadar + RSSHub) |
| `docker-compose.mac.yml` | macOS development variant |
| `Dockerfile` | Python 3.11-slim + Node.js + Playwright Chromium |
| `config/sources.json` | SehaRadar source configuration |
| `config/trend_sources.json` | Trenfy platform sources (YouTube/Spotify/Steam) |
| `config/diseases.json` | Known disease library with aliases |
| `config/agency_configs.json` | Health agency configurations |

---

## Python Package Structure

Declared in `pyproject.toml`:
```toml
packages = ["health_agents", "workflows", "tools", "parsers"]
```

**Trenfy packages** (new system, declared but not yet in pyproject.toml wheels):
- `trend_agents` — Trenfy models + source registry
- `tools/nocodb_trends_client.py` — Trenfy-specific NocoDB client
- `tools/trend_clients/` — Platform API clients (referenced in Trenfy.md, **not yet implemented**)

---

## LLM Integration

- **Provider**: OpenRouter (`https://openrouter.ai/api/v1`)
- **Default model**: `openai/gpt-4o-mini` (env `OPENROUTER_MODEL`)
- **SDK**: OpenAI Agents SDK (`openai-agents` package)
- **Client pattern**: Lazy singleton in `tools/openai_client.py`
- **Future**: Direct OpenAI fallback also supported

---

## Key Runtime Entry Points

| Entry point | Purpose |
|---|---|
| `server.py` | FastAPI app (SehaRadar, port 8080) |
| `bridge-service.js` | Node.js bridge (ChangeDetection.io → webhooks) |
| `main.py` | CLI test runner (SehaRadar) |
| `run.sh` | Shell script to start server |
