import asyncio
import json
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trend_agents.shared.models import TrendSource
from tools.trend_clients.spotify_client import SpotifyTrendClient


def _build_source(endpoint: str, region: str | None = None) -> TrendSource:
    params = {"limit": 20}
    if region:
        params["regionCode"] = region
    return TrendSource(
        id=f"SPOTIFY_{endpoint.upper().replace('/', '_')}",
        platform="spotify",
        endpoint=endpoint,
        params=params,
        check_interval_minutes=60,
        enabled=True,
    )


async def test_token_refresh_when_missing_or_expiring() -> None:
    token_calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal token_calls

        if request.url.host == "accounts.spotify.com":
            token_calls += 1
            return httpx.Response(
                200,
                content=json.dumps(
                    {"access_token": f"token-{token_calls}", "expires_in": 3600}
                ),
            )

        payload = {
            "albums": {
                "items": [
                    {
                        "id": "album-1",
                        "name": "Album 1",
                        "release_date": "2026-03-19",
                        "artists": [{"name": "Artist 1"}],
                        "images": [{"url": "https://img/a.jpg"}],
                    }
                ]
            }
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = SpotifyTrendClient(
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )
    source = _build_source("browse/new-releases")

    await client.fetch(source)
    assert token_calls == 1

    client._token_expires_at = time.monotonic() + 10
    await client.fetch(source)
    assert token_calls == 2


async def test_concurrent_fetches_refresh_token_once() -> None:
    token_calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal token_calls

        if request.url.host == "accounts.spotify.com":
            token_calls += 1
            return httpx.Response(
                200,
                content=json.dumps(
                    {"access_token": "shared-token", "expires_in": 3600}
                ),
            )

        payload = {
            "playlists": {
                "items": [
                    {
                        "id": "playlist-1",
                        "name": "Playlist 1",
                        "description": "Desc",
                        "images": [{"url": "https://img/p.jpg"}],
                        "tracks": {"total": 15},
                        "owner": {"display_name": "Owner"},
                        "external_urls": {
                            "spotify": "https://open.spotify.com/playlist/playlist-1"
                        },
                    }
                ]
            }
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = SpotifyTrendClient(
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )
    source = _build_source("browse/featured-playlists")

    await asyncio.gather(
        client.fetch(source), client.fetch(source), client.fetch(source)
    )
    assert token_calls == 1


async def test_source_endpoints_normalize_to_trend_items() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "accounts.spotify.com":
            return httpx.Response(
                200,
                content=json.dumps({"access_token": "token-1", "expires_in": 3600}),
            )

        if request.url.path.endswith("/new-releases"):
            payload = {
                "albums": {
                    "items": [
                        {
                            "id": "album-1",
                            "name": "Album 1",
                            "release_date": "2026-03-19",
                            "album_type": "album",
                            "artists": [{"name": "Artist 1"}],
                            "images": [{"url": "https://img/a.jpg"}],
                            "external_urls": {
                                "spotify": "https://open.spotify.com/album/album-1"
                            },
                        }
                    ]
                }
            }
            return httpx.Response(200, content=json.dumps(payload))

        payload = {
            "playlists": {
                "items": [
                    {
                        "id": "playlist-1",
                        "name": "Playlist 1",
                        "description": "Desc",
                        "images": [{"url": "https://img/p.jpg"}],
                        "tracks": {"total": 15},
                        "owner": {"display_name": "Owner"},
                        "external_urls": {
                            "spotify": "https://open.spotify.com/playlist/playlist-1"
                        },
                    }
                ]
            }
        }
        return httpx.Response(200, content=json.dumps(payload))

    client = SpotifyTrendClient(
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )

    new_release_rows = await client.fetch(
        _build_source("browse/new-releases", region="SA")
    )
    featured_rows = await client.fetch(_build_source("browse/featured-playlists"))

    assert len(new_release_rows) == 1
    assert len(featured_rows) == 1

    first = new_release_rows[0]
    assert first.platform == "spotify"
    assert first.category == "music"
    assert first.metric_type == "popularity"
    assert first.region_code == "SA"

    second = featured_rows[0]
    assert second.platform == "spotify"
    assert second.category == "music"
    assert second.metric_type == "popularity"
    assert second.region_code == "US"


if __name__ == "__main__":
    asyncio.run(test_token_refresh_when_missing_or_expiring())
    asyncio.run(test_concurrent_fetches_refresh_token_once())
    asyncio.run(test_source_endpoints_normalize_to_trend_items())
    print("test_spotify_client.py: ok")
