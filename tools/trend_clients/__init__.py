from tools.trend_clients.base import BaseTrendClient


def get_trend_client(platform: str) -> BaseTrendClient:
    normalized = (platform or "").strip().lower()

    if normalized == "youtube":
        from tools.trend_clients.youtube_client import YouTubeTrendClient

        return YouTubeTrendClient()

    raise ValueError(f"Unsupported platform: {platform}")


__all__ = ["BaseTrendClient", "get_trend_client"]
