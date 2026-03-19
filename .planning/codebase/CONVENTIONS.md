# CONVENTIONS.md — Code Style & Patterns

## Language & Style

### Python

- **Version**: 3.11+ (required)
- **Style**: PEP 8, no enforced formatter (no black/ruff config in pyproject.toml)
- **Type hints**: Used throughout — function signatures annotated with `Optional`, `List`, `Dict`, `Any`
- **Async**: All I/O is `async/await`. HTTP via `httpx.AsyncClient`. DB via `aiosqlite`.
- **Docstrings**: Module-level docstrings common; method docstrings sparse

### Python Naming

| Element | Convention | Example |
|---|---|---|
| Modules | `snake_case` | `nocodb_client.py` |
| Classes | `PascalCase` | `NocoDBClientV3`, `TrendItem` |
| Methods/functions | `snake_case` | `fetch_trending()`, `generate_hash()` |
| Constants | `UPPER_SNAKE_CASE` | `BUILTIN_DISEASES`, `ICON_CATALOG` |
| Private helpers | `_snake_case` | `_normalize_url()`, `_chunk()` |
| Pydantic fields | `snake_case` | `metric_value`, `content_hash` |

---

## Pydantic Patterns

All data models use Pydantic v2 `BaseModel`:

```python
class TrendItem(BaseModel):
    platform: str
    category: str
    title: str
    description: str
    url: str
    thumbnail_url: Optional[str]
    published_date: str
    metric_type: str
    metric_value: int
    region_code: str
    metadata: dict
    content_hash: str
```

Settings loaded with `pydantic-settings`:
```python
class Settings(BaseSettings):
    nocodb_api_url: str = "http://nocodb:8080"
    ...
```

---

## Error Handling Patterns

### Try/Except → Return None/False

The dominant pattern: catch exceptions, log with `print()`, return safe default:

```python
async def create_trend(self, item: TrendItem) -> Optional[Dict[str, Any]]:
    try:
        response = await self._request(...)
        return response.json() if response else None
    except Exception as e:
        print(f"[NocoDBTrends] Error creating trend: {e}")
        return None
```

### HTTP Resilience (NocoDB clients)

Both NocoDB clients implement multi-URL fallback:
```python
for base_url in self.base_urls:
    try:
        response = await client.request(...)
        response.raise_for_status()
        return response
    except httpx.HTTPStatusError as e:
        if status_code not in {502, 503, 504}:
            raise  # non-transient: don't retry
    except httpx.RequestError as e:
        errors.append(...)  # network error: try next URL
```

### `allow_404` Pattern

For optional record lookups, `allow_404=True` returns `None` instead of raising:
```python
response = await self._request("GET", f"/.../records/{id}", allow_404=True)
if response is None:
    return None
```

---

## Logging Pattern

**No structured logging library** — all logging via `print()`:

```python
print(f"[NocoDBTrends] Error creating trend: {e}")
print(f"[UnifiedScan] Processing watcher {watch_uuid[:12]}...")
```

Prefix convention: `[ModuleName]` in brackets. No log levels.

---

## Configuration Patterns

### Environment Variables

All config from `.env` via `python-dotenv`:
```python
from dotenv import load_dotenv
load_dotenv(override=True)  # override=True in server.py

import os
value = os.getenv("NOCODB_API_TOKEN", "")
```

### Lazy Initialization with Singletons

Shared clients instantiated at module level as singletons:
```python
# tools/nocodb_trends_client.py
nocodb_trends = NocoDBTrendsClient()

# tools/openai_client.py
_openai_client: Optional[AsyncOpenAI] = None  # lazy via get_openai_client()
```

### Hardcoded Fallback Table IDs

NocoDB table IDs have hardcoded defaults (fallback when env var missing):
```python
self.table_id = os.getenv("NOCODB_TABLE_ID", "m0s3bmpa8qzp4eh")
self.quarantine_table_id = os.getenv("NOCODB_QUARANTINE_TABLE_ID", "mn6vcva5rqv1272")
self.trends_table_id = _env("NOCODB_TRENDS_TABLE_ID", "md3c6cy09fvz2jg")
```

---

## Data Patterns

### Deduplication Hash (SehaRadar)

Disease + country-code based, cross-source dedup:
```python
# tools/deduplication.py
def generate_hash(disease: str, countries: List[str], headline: str = "") -> str:
    # Normalizes disease name + resolves country to ISO code
    # Empty countries → unique (uses UUID-based fallback, never deduplicates)
```

### Deduplication Hash (Trenfy)

Platform + title + date + region:
```python
content = f"{item.platform}|{item.title.lower()}|{item.published_date}|{item.region_code}"
return hashlib.sha256(content.encode()).hexdigest()[:32]
```

### NocoDB Query Filter Format

Both clients use NocoDB's `where` filter syntax:
```python
where_parts = ["(platform,eq,youtube)", "(region_code,eq,US)"]
params["where"] = "~and".join(where_parts)
```

---

## Node.js (bridge-service.js)

- **Style**: CommonJS (`require()`), no ES modules
- **Error handling**: try/catch with `console.error()`
- **Environment**: `dotenv` loaded at startup
- **Server**: Express with JSON body parser
- **HTTP client**: axios for outbound requests
- **Browser**: Playwright with stealth plugin for scraping

---

## Python Path / Import Convention

Test files add project root to `sys.path`:
```python
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _project_root)
```

Some tests stub out packages before importing to avoid circular deps:
```python
if "tools" not in sys.modules:
    _stub = types.ModuleType("tools")
    sys.modules["tools"] = _stub
```

---

## HTTP Client Convention

All HTTP is `httpx.AsyncClient` with `timeout=30.0`:
```python
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.request(method, url, headers=self.headers, ...)
```

No connection pooling via persistent client (new client per request — known concern).
