# STRUCTURE.md — Directory Layout

## Root Directory

```
/Users/fayaa/MyProjects/Trenfy/
├── server.py                    # SehaRadar FastAPI app (1316 lines, main entry)
├── main.py                      # CLI test runner for SehaRadar
├── bridge-service.js            # Node.js bridge (ChangeDetection.io → webhooks)
├── promed.js                    # ProMED scraper (Node.js + Playwright)
├── promednew.js                 # ProMED scraper variant
├── Dockerfile                   # Python 3.11-slim + Node + Playwright
├── docker-compose.yml           # Production: seha-radar + rsshub
├── docker-compose.mac.yml       # macOS dev variant
├── pyproject.toml               # Python project config (seha-radar)
├── requirements.txt             # Simplified pip deps
├── package.json                 # Node.js deps (name: health-agent-bridge)
├── package-lock.json            # Node lockfile
├── .env.example                 # All required env vars
├── run.sh                       # Shell entry point
├── Trenfy.md                    # Trenfy spec document
├── AGENTS.md                    # Agent workflow instructions
├── progress.md                  # Development progress notes
├── ralph.md                     # ralph.ai related notes
│
├── health_agents/               # SehaRadar AI agents (OpenAI Agents SDK)
├── trend_agents/                # Trenfy models + registry
├── tools/                       # Shared utilities
├── workflows/                   # Business logic workflows
├── parsers/                     # Source-specific content parsers
├── config/                      # JSON configuration files
├── tests/                       # Test suite
├── scripts/                     # Maintenance scripts
├── docs/                        # Documentation
├── session-docs/                # Session notes
├── findings/                    # Finding outputs
├── reports/                     # Report outputs
├── travel_notice/               # Travel notice related
├── tasks/                       # Task tracking
├── public/                      # Static public files
└── .planning/                   # GSD planning workspace
```

---

## Key Directories

### `health_agents/` — SehaRadar Multi-Agent System

```
health_agents/
├── __init__.py
├── master_agent.py          # Top-level agent orchestrator
├── fetcher_agent.py         # Fetches source content
├── epidemiological_agent.py # Epi analysis + classification
├── analysis_specialist.py   # Deep analysis
├── database_agent.py        # NocoDB operations
├── reporting_generator.py   # Report generation
├── translator_agent.py      # EN → AR translation
├── collection_monitor.py    # Collection health monitoring
├── orchestrator.py          # Agent coordination logic
├── configure_handoffs.py    # Agent handoff configuration
└── shared/
    ├── models.py            # Finding, HealthContext, Priority, EpidemiologicalTriad
    ├── source_registry.py   # Source config loader
    ├── config_loader.py     # Config file loader
    ├── context.py           # RunContext / shared context
    └── tracing.py           # Tracing utilities
```

### `trend_agents/` — Trenfy Models + Registry

```
trend_agents/
├── __init__.py
└── shared/
    ├── __init__.py
    ├── models.py            # TrendItem, TrendSource, SourceType, YouTube/Spotify/SteamMetadata
    └── source_registry.py  # list_all(), list_enabled(), get_source() from config/trend_sources.json
```

### `tools/` — Shared Utilities

```
tools/
├── __init__.py
├── nocodb_client.py         # SehaRadar NocoDB CRUD (NocoDBClientV3)
├── nocodb_trends_client.py  # Trenfy NocoDB CRUD (NocoDBTrendsClient)
├── openai_client.py         # OpenRouter/OpenAI lazy singleton client
├── deduplication.py         # DeduplicationService + content_hash
├── epi_triad_analyzer.py    # Disease normalization, location extraction
├── disease_catalog.py       # Known disease catalog, icon assignment
├── keyword_detector.py      # Keyword-based disease detection
├── geocoder.py              # Country/region resolution
├── arabic_translator.py     # EN → AR translation
├── batch_analyzer.py        # Batch LLM analysis
├── email_digest.py          # Email compilation + SMTP sending
├── report_generator.py      # Report formatting
├── html_extraction.py       # HTML scraping utilities
├── rss_parser.py            # RSS feed parsing
├── rsshub_client.py         # RSSHub HTTP client
├── google_search.py         # Google search integration
├── changedetection_client.py # ChangeDetection.io API client
├── syncdetection_payload.py  # Webhook payload parsing + auth
├── syncdetection_store.py    # aiosqlite webhook queue
├── syncdetection_watch_sync.py # Sync sources to CD.io watches
├── llm_comparison.py        # LLM output comparison utilities
├── data_validator.py        # Data validation
├── promed_account_pool.py   # ProMED account pooling
└── trend_clients/           # Trenfy platform clients (NOT YET IMPLEMENTED)
    (referenced in Trenfy.md but directory/files don't exist)
```

### `workflows/` — Business Logic

```
workflows/
├── __init__.py              # Re-exports all workflows
├── unified_scan_workflow.py # Main scan pipeline (UnifiedScanWorkflow)
├── email_digest_workflow.py # Compile + send email digests
├── periodic_scan_workflow.py # Periodic Google scans (ScanScheduler)
├── scheduled_workflow.py    # Daily report generation
├── reclassify_workflow.py   # Re-classify unclassified DB findings
├── syncdetection_worker.py  # Process ChangeDetection.io webhook queue
├── webhook_workflow.py      # Webhook handling
├── retry_handler.py         # retry_with_backoff utility
├── trends_workflow.py       # TrendsWorkflow: fetch→normalize→dedup→store (Phase 2 stub)
└── trends_scheduler.py      # TrendsScheduler: interval-based per-source scheduler
```

### `parsers/` — Content Parsers

```
parsers/
├── __init__.py
├── parser_registry.py       # get_parser_safe(parser_id) factory
├── base_parser.py           # Abstract base parser
├── who_parser.py            # WHO Disease Outbreak News
├── who_afro_document_parser.py # WHO AFRO documents
├── who_mpox_parser.py       # WHO Mpox-specific
├── cdc_parser.py            # CDC Outbreaks
├── promed_parser.py         # ProMED-mail
├── ecdc_cdtr_pdf_parser.py  # ECDC CDTR PDF
├── mhlw_covid_pdf_parser.py # Japan MHLW COVID PDF
├── gtfcc_cholera_parser.py  # GTFCC Cholera
├── rsshub_parser.py         # Generic RSS (via RSSHub)
├── generic_parser.py        # Generic fallback parser
└── ai_parser.py             # AI-powered parser fallback
```

### `config/` — Configuration Files

```
config/
├── sources.json             # SehaRadar source definitions
├── disease_catalog.json     # Auto-discovered diseases (runtime-populated)
├── diseases.json            # Known disease library with aliases
├── agency_configs.json      # Health agency configurations
└── trend_sources.json       # Trenfy: YouTube/Spotify/Steam sources
```

### `tests/` — Test Suite

```
tests/
├── test_scan_dryrun.py          # Full pipeline mock test (919 lines)
├── test_syncdetection_*.py      # ChangeDetection.io tests
├── test_nocodb_shared_callers.py # NocoDB integration tests
├── test_parser_url_fetch.py     # Parser URL fetching tests
├── test_promed_parser_url_fetch.py # ProMED parser tests
├── test_quality_gate.py         # Quality gate tests
├── test_who_parser.py           # WHO parser tests
├── test_who_afro_document_parser.py
├── test_ecdc_cdtr_pdf_parser.py
└── test_mhlw_covid_pdf_parser.py
```

---

## Naming Conventions

| Pattern | Convention |
|---|---|
| Python modules | `snake_case.py` |
| Classes | `PascalCase` |
| Functions | `snake_case` |
| Constants | `UPPER_SNAKE_CASE` |
| Pydantic models | `PascalCase(BaseModel)` |
| NocoDB table IDs | `env var` → hardcoded default fallback |
| Test files | `test_<subject>.py` |
| Config files | `<subject>.json` in `config/` |

---

## Notable Outlier Files (Root Level)

These exist in the root but belong to earlier experiments or legacy systems:

- `emptySDKagnet.py` (29KB) — blank SDK agent template
- `extract-auth0-config.js` — Auth0 config extraction
- `nocodb-webhook-helper.sh` — NocoDB webhook setup script
- `EMAIL_NOTIFICATION_ARCHITECTURE.txt` — Email architecture notes
- `QUICK_REF_WEBHOOK.txt` — Webhook quick reference
- `test-*.js` (7 files) — Node.js Playwright/auth test scripts
- `seharadar-icons-test.png` — Icon test image
- `test_api_phase1.py`, `test_phase1.py`, `test_phase2.py` — Root-level ad-hoc tests
