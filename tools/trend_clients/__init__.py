from tools.trend_clients.base import BaseTrendClient


def get_trend_client(platform: str) -> BaseTrendClient:
    normalized = (platform or "").strip().lower()

    if normalized == "youtube":
        from tools.trend_clients.youtube_client import YouTubeTrendClient

        return YouTubeTrendClient()
    if normalized == "spotify":
        from tools.trend_clients.spotify_client import SpotifyTrendClient

        return SpotifyTrendClient()
    if normalized == "steam":
        from tools.trend_clients.steam_client import SteamTrendClient

        return SteamTrendClient()
    if normalized == "tiktok":
        from tools.trend_clients.tiktok_client import TikTokTrendClient

        return TikTokTrendClient()

    raise ValueError(f"Unsupported platform: {platform}")


__all__ = ["BaseTrendClient", "get_trend_client"]
