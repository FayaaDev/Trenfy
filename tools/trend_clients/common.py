import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

from trend_agents.shared.models import TrendItem, generate_trend_hash

T = TypeVar("T")

_CATEGORY_MAP = {
    "game": "gaming",
    "games": "gaming",
    "gaming": "gaming",
    "music": "music",
}


def normalize_category(raw: str) -> str:
    key = (raw or "").strip().lower()
    if key in _CATEGORY_MAP:
        return _CATEGORY_MAP[key]
    return "entertainment"


def compute_content_hash(item: TrendItem) -> str:
    return generate_trend_hash(item)


async def retry_with_backoff(
    call: Callable[[], Awaitable[T]],
    retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 8.0,
) -> T:
    attempt = 0
    while True:
        try:
            return await call()
        except Exception:
            attempt += 1
            if attempt > retries:
                raise
            delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
            await asyncio.sleep(delay)
