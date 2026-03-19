import hashlib
from datetime import date
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    YOUTUBE = "youtube"
    SPOTIFY = "spotify"
    STEAM = "steam"


class TrendItem(BaseModel):
    platform: str = Field(..., description="youtube | spotify | steam")
    category: str = Field(default="", description="gaming | music | video | etc.")
    title: str
    description: str = ""
    url: str
    thumbnail_url: Optional[str] = None
    published_date: str = Field(default="", description="YYYY-MM-DD")
    metric_type: str = Field(default="views", description="views | streams | players")
    metric_value: int = 0
    region_code: str = Field(default="US", description="ISO region code")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    content_hash: str = ""


class YouTubeVideoMetadata(BaseModel):
    video_id: str
    channel_title: str = ""
    channel_id: str = ""
    duration: str = ""
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    category_id: str = ""


class SpotifyTrackMetadata(BaseModel):
    track_id: str
    artist_name: str = ""
    album_name: str = ""
    album_type: str = "track"
    popularity: int = 0
    duration_ms: int = 0
    danceability: float = 0.0
    energy: float = 0.0
    tempo: float = 0.0


class SteamGameMetadata(BaseModel):
    app_id: str
    developer: str = ""
    publisher: str = ""
    genres: List[str] = Field(default_factory=list)
    price: str = ""
    release_date: str = ""
    current_players: Optional[int] = None
    peak_players: Optional[int] = None


class TrendSource(BaseModel):
    id: str
    name: str = ""
    platform: str
    endpoint: str = ""
    params: Dict[str, Any] = Field(default_factory=dict)
    check_interval_minutes: int = 15
    enabled: bool = True
    last_fetched_at: Optional[str] = None
    last_fetch_status: str = ""


def generate_trend_hash(item: TrendItem) -> str:
    content = (
        f"{item.platform}|{item.title.lower()}|{item.published_date}|{item.region_code}"
    )
    return hashlib.sha256(content.encode()).hexdigest()[:32]
