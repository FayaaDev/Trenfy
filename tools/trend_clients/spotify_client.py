import asyncio
import os
import time
from datetime import date
from typing import Any

import httpx

from trend_agents.shared.models import TrendItem, TrendSource
from tools.trend_clients.base import BaseTrendClient
from tools.trend_clients.common import compute_content_hash

SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"


class SpotifyTrendClient(BaseTrendClient):
    platform = "spotify"

    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.client_id = client_id or os.getenv("SPOTIFY_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("SPOTIFY_CLIENT_SECRET", "")
        self._transport = transport
        self._token_lock = asyncio.Lock()
        self._access_token = ""
        self._token_expires_at = 0.0

    async def fetch(self, source: TrendSource, max_items: int = 20) -> list[TrendItem]:
        access_token = await self._get_access_token()
        limit = min(max_items, 20)
        region_code = (source.params or {}).get("regionCode", "US")

        if source.endpoint == "browse/new-releases":
            path = "/browse/new-releases"
        elif source.endpoint == "browse/featured-playlists":
            path = "/browse/featured-playlists"
        else:
            raise ValueError(f"Unsupported Spotify endpoint: {source.endpoint}")

        async with httpx.AsyncClient(timeout=30.0, transport=self._transport) as client:
            response = await client.get(
                f"{SPOTIFY_API_BASE}{path}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"limit": limit},
            )
            response.raise_for_status()
            payload = response.json()

        if source.endpoint == "browse/new-releases":
            return self._normalize_new_releases(payload, region_code, limit)
        return self._normalize_featured_playlists(payload, region_code, limit)

    async def _get_access_token(self) -> str:
        if self._token_is_valid():
            return self._access_token

        async with self._token_lock:
            if self._token_is_valid():
                return self._access_token

            if not self.client_id or not self.client_secret:
                raise ValueError(
                    "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required"
                )

            async with httpx.AsyncClient(
                timeout=30.0, transport=self._transport
            ) as client:
                response = await client.post(
                    SPOTIFY_TOKEN_ENDPOINT,
                    data={"grant_type": "client_credentials"},
                    auth=(self.client_id, self.client_secret),
                )
                response.raise_for_status()
                payload = response.json()

            self._access_token = str(payload.get("access_token") or "")
            expires_in = int(payload.get("expires_in") or 3600)
            self._token_expires_at = time.monotonic() + expires_in

            if not self._access_token:
                raise RuntimeError("Spotify token response missing access_token")

            return self._access_token

    def _token_is_valid(self) -> bool:
        if not self._access_token:
            return False
        return (self._token_expires_at - time.monotonic()) > 60

    def _normalize_new_releases(
        self, payload: dict[str, Any], region_code: str, limit: int
    ) -> list[TrendItem]:
        albums = (payload.get("albums") or {}).get("items") or []
        rows: list[TrendItem] = []

        for album in albums:
            title = str(album.get("name") or "").strip()
            url = str((album.get("external_urls") or {}).get("spotify") or "").strip()
            if not url:
                album_id = str(album.get("id") or "").strip()
                if album_id:
                    url = f"https://open.spotify.com/album/{album_id}"
            if not title or not url:
                continue

            artists = album.get("artists") or []
            artist_name = ""
            if artists:
                artist_name = str((artists[0] or {}).get("name") or "")

            metadata = {
                "track_id": str(album.get("id") or ""),
                "artist_name": artist_name,
                "album_name": title,
                "album_type": str(album.get("album_type") or "album"),
                "popularity": int(album.get("popularity") or 0),
                "duration_ms": int(album.get("duration_ms") or 0),
            }

            trend = TrendItem(
                platform=self.platform,
                category="music",
                title=title,
                description=str(album.get("description") or ""),
                url=url,
                thumbnail_url=((album.get("images") or [{}])[0]).get("url"),
                published_date=str(album.get("release_date") or "")[:10],
                metric_type="popularity",
                metric_value=int(album.get("popularity") or 0),
                region_code=region_code,
                metadata=metadata,
            )
            trend.content_hash = compute_content_hash(trend)
            rows.append(trend)
            if len(rows) >= limit:
                break

        return rows

    def _normalize_featured_playlists(
        self, payload: dict[str, Any], region_code: str, limit: int
    ) -> list[TrendItem]:
        playlists = (payload.get("playlists") or {}).get("items") or []
        rows: list[TrendItem] = []

        for playlist in playlists:
            title = str(playlist.get("name") or "").strip()
            url = str(
                (playlist.get("external_urls") or {}).get("spotify") or ""
            ).strip()
            if not title or not url:
                continue

            metadata = {
                "track_id": str(playlist.get("id") or ""),
                "artist_name": str(
                    (playlist.get("owner") or {}).get("display_name") or ""
                ),
                "album_name": title,
                "album_type": "playlist",
                "popularity": int((playlist.get("tracks") or {}).get("total") or 0),
                "duration_ms": 0,
            }

            trend = TrendItem(
                platform=self.platform,
                category="music",
                title=title,
                description=str(playlist.get("description") or ""),
                url=url,
                thumbnail_url=((playlist.get("images") or [{}])[0]).get("url"),
                published_date=date.today().isoformat(),
                metric_type="popularity",
                metric_value=int((playlist.get("tracks") or {}).get("total") or 0),
                region_code=region_code,
                metadata=metadata,
            )
            trend.content_hash = compute_content_hash(trend)
            rows.append(trend)
            if len(rows) >= limit:
                break

        return rows
