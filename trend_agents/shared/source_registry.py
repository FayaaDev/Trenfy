"""
Source registry — loads trend sources from config/trend_sources.json.
"""

import json
from pathlib import Path
from typing import List, Optional

from trend_agents.shared.models import TrendSource

_CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "trend_sources.json"


def _load_sources() -> List[TrendSource]:
    if not _CONFIG_PATH.exists():
        raise FileNotFoundError(f"trend_sources.json not found at {_CONFIG_PATH}")
    with _CONFIG_PATH.open() as f:
        data = json.load(f)
    return [TrendSource(**source) for source in data.get("sources", [])]


def list_all() -> List[TrendSource]:
    """Return all configured trend sources."""
    return _load_sources()


def list_enabled() -> List[TrendSource]:
    """Return only enabled trend sources."""
    return [s for s in _load_sources() if s.enabled]


def get_source(source_id: str) -> Optional[TrendSource]:
    """Return a source by its id, or None if not found."""
    return next((s for s in _load_sources() if s.id == source_id), None)
