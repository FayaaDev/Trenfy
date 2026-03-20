"""
X API development plan: build once, test cheap.

Principles
----------
1. Never use live X API by default.
2. Develop against an internal provider interface.
3. Record a small number of real responses, replay them locally.
4. Cache live responses aggressively.
5. Keep CI and most local testing fully offline.
6. Add hard guardrails so live calls are visible and limited.

Suggested project structure
---------------------------
app/
  providers/
    base.py
    x_mock.py
    x_fixture.py
    x_live.py
    x_cached.py
  fixtures/
    x_recent_search_ai.json
    x_recent_search_sports.json
  services/
    trends.py
  settings.py
  main.py
tests/
  test_trends_with_fixtures.py
.env

Environment variables
---------------------
USE_LIVE_X_API=false
X_BEARER_TOKEN=...
X_CACHE_TTL_SECONDS=3600
X_DAILY_BUDGET_CALLS=25
X_ENABLE_RECORDING=false
"""

from __future__ import annotations

import json
import os
import time
import hashlib
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional

import requests


# =========================
# settings.py
# =========================

USE_LIVE_X_API = os.getenv("USE_LIVE_X_API", "false").lower() == "true"
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN", "")
X_CACHE_TTL_SECONDS = int(os.getenv("X_CACHE_TTL_SECONDS", "3600"))
X_DAILY_BUDGET_CALLS = int(os.getenv("X_DAILY_BUDGET_CALLS", "25"))
X_ENABLE_RECORDING = os.getenv("X_ENABLE_RECORDING", "false").lower() == "true"

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / "cache"
FIXTURES_DIR = BASE_DIR / "fixtures"
BUDGET_FILE = CACHE_DIR / "x_daily_budget.json"

CACHE_DIR.mkdir(parents=True, exist_ok=True)
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# providers/base.py
# =========================

class XProvider(ABC):
    @abstractmethod
    def recent_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        raise NotImplementedError


# =========================
# providers/x_mock.py
# =========================

class MockXProvider(XProvider):
    def recent_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        return {
            "source": "mock",
            "meta": {"query": query, "max_results": max_results},
            "data": [
                {"id": "1", "text": f"Mock post about {query} #1"},
                {"id": "2", "text": f"Mock post about {query} #2"},
            ],
        }


# =========================
# providers/x_fixture.py
# =========================

class FixtureXProvider(XProvider):
    def __init__(self, fixture_map: Optional[Dict[str, str]] = None) -> None:
        self.fixture_map = fixture_map or {}

    def recent_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        fixture_name = self.fixture_map.get(query) or f"x_recent_search_{slugify(query)}.json"
        fixture_path = FIXTURES_DIR / fixture_name

        if not fixture_path.exists():
            raise FileNotFoundError(
                f"Fixture not found for query={query!r}: {fixture_path}"
            )

        with fixture_path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        data["_fixture"] = fixture_name
        data["_source"] = "fixture"
        return data


# =========================
# providers/x_live.py
# =========================

class LiveXProvider(XProvider):
    BASE_URL = "https://api.x.com/2/tweets/search/recent"

    def __init__(self, bearer_token: str) -> None:
        if not bearer_token:
            raise ValueError("Missing X_BEARER_TOKEN")
        self.bearer_token = bearer_token

    def recent_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        enforce_daily_budget()

        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json",
        }
        params = {
            "query": query,
            "max_results": max_results,
            "tweet.fields": "created_at,public_metrics,lang",
        }

        response = requests.get(self.BASE_URL, headers=headers, params=params, timeout=20)
        increment_daily_budget("recent_search", query)

        response.raise_for_status()
        payload = response.json()

        if X_ENABLE_RECORDING:
            save_fixture(query, payload)

        payload["_source"] = "live"
        return payload


# =========================
# providers/x_cached.py
# =========================

class CachedXProvider(XProvider):
    def __init__(self, wrapped: XProvider, ttl_seconds: int = 3600) -> None:
        self.wrapped = wrapped
        self.ttl_seconds = ttl_seconds

    def recent_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        cache_key = make_cache_key("recent_search", {"query": query, "max_results": max_results})
        cache_path = CACHE_DIR / f"{cache_key}.json"

        if cache_path.exists():
            age = time.time() - cache_path.stat().st_mtime
            if age < self.ttl_seconds:
                with cache_path.open("r", encoding="utf-8") as f:
                    cached = json.load(f)
                cached["_cache"] = "hit"
                return cached

        fresh = self.wrapped.recent_search(query, max_results=max_results)
        with cache_path.open("w", encoding="utf-8") as f:
            json.dump(fresh, f, ensure_ascii=False, indent=2)

        fresh["_cache"] = "miss"
        return fresh


# =========================
# services/trends.py
# =========================

def get_trend_posts(provider: XProvider, topic: str) -> Dict[str, Any]:
    """
    App code should depend on this service layer, not on raw X API calls.
    """
    result = provider.recent_search(topic, max_results=10)

    posts = result.get("data", [])
    normalized = [
        {
            "id": p.get("id"),
            "text": p.get("text"),
        }
        for p in posts
    ]

    return {
        "topic": topic,
        "count": len(normalized),
        "posts": normalized,
        "meta": {
            "provider_source": result.get("_source", result.get("source", "unknown")),
            "cache": result.get("_cache", "n/a"),
        },
    }


# =========================
# provider factory
# =========================

def build_x_provider() -> XProvider:
    """
    Default path:
      1. USE_LIVE_X_API=false  -> use fixtures if present, otherwise mock
      2. USE_LIVE_X_API=true   -> wrap live provider with cache
    """
    if USE_LIVE_X_API:
        live = LiveXProvider(X_BEARER_TOKEN)
        return CachedXProvider(live, ttl_seconds=X_CACHE_TTL_SECONDS)

    # Offline-first behavior
    return FixtureFallbackProvider(
        fixture_provider=FixtureXProvider(),
        mock_provider=MockXProvider(),
    )


class FixtureFallbackProvider(XProvider):
    def __init__(self, fixture_provider: XProvider, mock_provider: XProvider) -> None:
        self.fixture_provider = fixture_provider
        self.mock_provider = mock_provider

    def recent_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        try:
            return self.fixture_provider.recent_search(query, max_results=max_results)
        except FileNotFoundError:
            return self.mock_provider.recent_search(query, max_results=max_results)


# =========================
# utilities
# =========================

def slugify(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "_" for ch in value)
    while "__" in cleaned:
        cleaned = cleaned.replace("__", "_")
    return cleaned.strip("_") or "query"


def make_cache_key(endpoint: str, params: Dict[str, Any]) -> str:
    raw = json.dumps({"endpoint": endpoint, "params": params}, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def save_fixture(query: str, payload: Dict[str, Any]) -> None:
    fixture_name = f"x_recent_search_{slugify(query)}.json"
    fixture_path = FIXTURES_DIR / fixture_name
    with fixture_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def today_key() -> str:
    return time.strftime("%Y-%m-%d")


def enforce_daily_budget() -> None:
    budget = load_budget()
    today = today_key()
    used = budget.get(today, {}).get("count", 0)

    if used >= X_DAILY_BUDGET_CALLS:
        raise RuntimeError(
            f"Daily X API budget exceeded: used={used}, limit={X_DAILY_BUDGET_CALLS}"
        )


def increment_daily_budget(endpoint: str, query: str) -> None:
    budget = load_budget()
    today = today_key()

    if today not in budget:
        budget[today] = {"count": 0, "calls": []}

    budget[today]["count"] += 1
    budget[today]["calls"].append(
        {
            "ts": int(time.time()),
            "endpoint": endpoint,
            "query": query,
        }
    )
    save_budget(budget)


def load_budget() -> Dict[str, Any]:
    if not BUDGET_FILE.exists():
        return {}
    with BUDGET_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_budget(data: Dict[str, Any]) -> None:
    with BUDGET_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# =========================
# main.py
# =========================

if __name__ == "__main__":
    provider = build_x_provider()

    # Example app usage
    for topic in ["AI", "Saudi football", "Ramadan recipes"]:
        result = get_trend_posts(provider, topic)
        print(json.dumps(result, ensure_ascii=False, indent=2))


# =========================
# tests/test_trends_with_fixtures.py
# =========================

def test_trends_from_mock_or_fixture() -> None:
    provider = FixtureFallbackProvider(
        fixture_provider=FixtureXProvider(),
        mock_provider=MockXProvider(),
    )
    result = get_trend_posts(provider, "AI")
    assert "posts" in result
    assert isinstance(result["posts"], list)


"""
Recommended workflow
--------------------
1. Build UI and logic against MockXProvider first.
2. Record a few real queries using LiveXProvider with X_ENABLE_RECORDING=true.
3. Save those JSON files under fixtures/.
4. Switch local dev and tests to FixtureXProvider.
5. Keep USE_LIVE_X_API=false by default forever.
6. Only enable live mode for deliberate integration checks.

Do not do this
--------------
- Do not let CI call live X.
- Do not call the same query repeatedly without cache.
- Do not make live X your default dev backend.
- Do not test broad noisy queries every time you change UI code.

Cheapest serious setup
----------------------
- Local dev: fixtures
- Unit tests: fixtures/mock
- CI: fixtures only
- Manual integration test: cached live provider
- Production: cached live provider + rate limits + budget tracking
"""