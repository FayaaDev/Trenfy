from abc import ABC, abstractmethod

from trend_agents.shared.models import TrendItem, TrendSource


class BaseTrendClient(ABC):
    platform: str

    @abstractmethod
    async def fetch(self, source: TrendSource, max_items: int = 20) -> list[TrendItem]:
        raise NotImplementedError
