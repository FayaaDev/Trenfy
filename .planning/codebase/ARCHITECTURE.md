# ARCHITECTURE.md — System Architecture

## System Overview

The repo contains **two coexisting systems**:

1. **SehaRadar** — production-ready AI-powered health surveillance system (the running system)
2. **Trenfy** — new trend-tracking platform (in development, partially implemented)

These share the same repo and some tooling, but serve different purposes.

---

## SehaRadar Architecture

### Pattern: Multi-Agent Pipeline + Webhook-Driven

```
ChangeDetection.io (external)
         ↓ webhook POST
bridge-service.js (Node.js, port varies)
         ↓ relays to
FastAPI server (server.py, port 8080)
         ↓
Webhook Queue (aiosqlite via tools/syncdetection_store.py)
         ↓
SyncDetection Worker (workflows/syncdetection_worker.py)
         ↓
Unified Scan Workflow (workflows/unified_scan_workflow.py)
         ↓
   ┌─────────────────────────────────────────────────────┐
   │  OpenAI Agents SDK Multi-Agent Pipeline             │
   │  ┌──────────────┐   ┌────────────────────────────┐ │
   │  │ Fetcher Agent│   │ Epidemiological Agent      │ │
   │  │ (health_     │ → │ (health_agents/epi_*.py)   │ │
   │  │  agents/)    │   └────────────────────────────┘ │
   │  └──────────────┘              ↓                    │
   │              ┌──────────────────────────────────┐   │
   │              │ Analysis Specialist              │   │
   │              │ + Database Agent                 │   │
   │              │ + Reporting Generator            │   │
   │              │ + Translator Agent               │   │
   │              └──────────────────────────────────┘   │
   └─────────────────────────────────────────────────────┘
         ↓
NocoDB (findings + quarantine tables)
         ↓
Email Digest (workflows/email_digest_workflow.py)
```

### Key Layers

| Layer | Components | Path |
|---|---|---|
| HTTP API | FastAPI endpoints | `server.py` |
| Orchestration | UnifiedScanWorkflow | `workflows/unified_scan_workflow.py` |
| Agents | health_agents/* | `health_agents/` |
| Parsers | Source-specific HTML/PDF/RSS parsers | `parsers/` |
| Tools | Shared utilities (NocoDB, LLM, dedup, geocoder) | `tools/` |
| Config | Source registry, disease catalog | `config/`, `health_agents/shared/` |
| Data | NocoDB (self-hosted) | external via `NOCODB_API_URL` |

### Agents (OpenAI Agents SDK)

| Agent | File | Role |
|---|---|---|
| Master Agent | `health_agents/master_agent.py` | Orchestrates pipeline |
| Fetcher Agent | `health_agents/fetcher_agent.py` | Fetches content from sources |
| Epidemiological Agent | `health_agents/epidemiological_agent.py` | Epi analysis, classification |
| Analysis Specialist | `health_agents/analysis_specialist.py` | Deep analysis |
| Database Agent | `health_agents/database_agent.py` | NocoDB read/write |
| Reporting Generator | `health_agents/reporting_generator.py` | Report generation |
| Translator Agent | `health_agents/translator_agent.py` | EN → AR translation |
| Collection Monitor | `health_agents/collection_monitor.py` | Collection status |
| Orchestrator | `health_agents/orchestrator.py` | Agent coordination |

### Data Flow (Scan Pipeline)

```
1. ChangeDetection.io detects change on health agency page
2. Sends webhook to bridge-service.js
3. Bridge relays payload to /webhook endpoint on server.py
4. Payload parsed by tools/syncdetection_payload.py
5. Queued in aiosqlite DB (tools/syncdetection_store.py)
6. Worker picks up (workflows/syncdetection_worker.py)
7. Parser selected by parser_registry based on source_id
8. Content parsed into raw findings (list of items)
9. LLM classifies each item: disease_name, description
10. Disease name normalized (tools/epi_triad_analyzer.py)
11. Countries extracted, dedup hash generated
12. Duplicate check against NocoDB
13. New findings stored via tools/nocodb_client.py
14. Arabic translation via translator_agent
15. Digest emails sent on schedule
```

---

## Trenfy Architecture (In Progress)

### Pattern: Scheduled Polling + NocoDB Storage

```
config/trend_sources.json
         ↓
TrendsScheduler (workflows/trends_scheduler.py) [not yet impl]
         ↓ per-interval
TrendsWorkflow (workflows/trends_workflow.py) [not yet impl]
         ↓
Platform Clients (tools/trend_clients/) [not yet impl]
    ├── youtube_client.py
    ├── spotify_client.py
    └── steam_client.py
         ↓
Content hash dedup check
         ↓
NocoDBTrendsClient (tools/nocodb_trends_client.py) [IMPLEMENTED]
         ↓
NocoDB (trends + trend_sources tables)
         ↓
FastAPI Server (app.py) [not yet impl] → REST API
```

### Trenfy Models

```python
# trend_agents/shared/models.py
class TrendItem(BaseModel):
    platform: str          # youtube | spotify | steam
    category: str
    title: str
    description: str
    url: str
    thumbnail_url: Optional[str]
    published_date: str
    metric_type: str       # views | streams | players
    metric_value: int
    region_code: str       # ISO code
    metadata: dict         # platform-specific JSON
    content_hash: str      # sha256[:32] of platform|title|date|region
```

### Dedup Strategy (Trenfy)

```python
content = f"{item.platform}|{item.title.lower()}|{item.published_date}|{item.region_code}"
hash = hashlib.sha256(content.encode()).hexdigest()[:32]
```

---

## Shared Patterns

### NocoDB Client Pattern

Both SehaRadar and Trenfy use the same multi-URL fallback pattern:
- `internal_base_url` (Docker internal)
- `public_base_url` (NC_PUBLIC_URL)
- fallback to `http://nocodb:8080`
- Retry across URLs on 502/503/504

### Async Throughout

All I/O is async Python (`async/await`), using `httpx.AsyncClient` for HTTP.

### Module-level Singletons

Shared clients instantiated at module level for reuse:
```python
# tools/nocodb_client.py
nocodb_client = NocoDBClientV3()

# tools/nocodb_trends_client.py
nocodb_trends = NocoDBTrendsClient()
```
