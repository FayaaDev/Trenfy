import hashlib
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    YOUTUBE = "youtube"
    X = "x"


class TrendItem(BaseModel):
    platform: str = Field(..., description="youtube | x")
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
    ar_translation: Optional[str] = None
    title_ar: Optional[str] = None
    status: Optional[str] = None


class YouTubeVideoMetadata(BaseModel):
    video_id: str
    channel_title: str = ""
    channel_id: str = ""
    duration: str = ""
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    category_id: str = ""


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
    min_metric_value: int = 0
    blocked_keywords: List[str] = Field(default_factory=list)


def generate_trend_hash(item: TrendItem) -> str:
    content = (
        f"{item.platform}|{item.title.lower()}|{item.published_date}|{item.region_code}"
    )
    return hashlib.sha256(content.encode()).hexdigest()[:32]
