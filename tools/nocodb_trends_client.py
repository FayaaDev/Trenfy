"""
NocoDB client for Trenfy trend data operations.
Targets the trends and trend_sources tables in NocoDB.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from trend_agents.shared.models import TrendItem


class NocoDBTrendsClient:
    def __init__(self):
        internal_base_url = _env("NOCODB_API_URL", "")
        public_base_url = _env("NC_PUBLIC_URL", "")
        default_base_url = internal_base_url or public_base_url or "http://nocodb:8080"

        self.internal_base_url = _normalize_url(internal_base_url)
        self.public_base_url = _normalize_url(public_base_url)
        self.base_url = (
            self.internal_base_url
            or self.public_base_url
            or _normalize_url(default_base_url)
        )
        self.api_token = _env("NOCODB_API_TOKEN", "")
        self.trends_table_id = _env("NOCODB_TRENDS_TABLE_ID", "md3c6cy09fvz2jg")
        self.sources_table_id = _env("NOCODB_SOURCES_TABLE_ID", "")

    @property
    def base_urls(self) -> List[str]:
        urls: List[str] = []
        for candidate in (
            self.internal_base_url,
            self.public_base_url,
            self.base_url,
        ):
            if candidate and candidate not in urls:
                urls.append(candidate)
        if not urls:
            urls.append("http://nocodb:8080")
        return urls

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "xc-token": self.api_token,
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Any] = None,
        allow_404: bool = False,
    ) -> Optional[httpx.Response]:
        errors: List[str] = []

        for base_url in self.base_urls:
            url = f"{base_url}{path}"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.request(
                        method,
                        url,
                        headers=self.headers,
                        params=params,
                        json=json_body,
                    )
                if allow_404 and response.status_code == 404:
                    return None
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as e:
                status_code = e.response.status_code if e.response is not None else "?"
                errors.append(f"{url} -> HTTP {status_code}")
                if e.response is None or status_code not in {502, 503, 504}:
                    raise
            except httpx.RequestError as e:
                errors.append(f"{url} -> {e}")

        if allow_404:
            return None
        raise RuntimeError(
            "NocoDB request failed across configured URLs: " + " | ".join(errors)
        )

    def _item_to_record(self, item: TrendItem) -> Dict[str, Any]:
        return {
            "platform": item.platform,
            "category": item.category,
            "title": item.title,
            "description": item.description,
            "url": item.url,
            "thumbnail_url": item.thumbnail_url,
            "published_date": item.published_date,
            "metric_type": item.metric_type,
            "metric_value": item.metric_value,
            "region_code": item.region_code,
            "metadata": json.dumps(item.metadata) if item.metadata else "{}",
            "content_hash": item.content_hash,
            "fetched_at": datetime.now().isoformat(),
            "notification_sent": False,
        }

    async def create_trend(self, item: TrendItem) -> Optional[Dict[str, Any]]:
        try:
            response = await self._request(
                "POST",
                f"/api/v2/tables/{self.trends_table_id}/records",
                json_body=self._item_to_record(item),
            )
            return response.json() if response else None
        except Exception as e:
            print(f"[NocoDBTrends] Error creating trend: {e}")
            return None

    async def batch_create_trends(self, items: List[TrendItem]) -> List[Dict[str, Any]]:
        if not items:
            return []
        records = [self._item_to_record(item) for item in items]
        try:
            response = await self._request(
                "POST",
                f"/api/v2/tables/{self.trends_table_id}/records",
                json_body=records,
            )
            if response is None:
                return []
            return response.json().get("list", [])
        except Exception as e:
            print(f"[NocoDBTrends] Error batch creating trends: {e}")
            return []

    async def query_trends(
        self,
        platform: Optional[str] = None,
        category: Optional[str] = None,
        region_code: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort: str = "-fetched_at",
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if sort:
            params["sort"] = sort

        where_parts: List[str] = []
        if platform:
            where_parts.append(f"(platform,eq,{platform})")
        if category:
            where_parts.append(f"(category,eq,{category})")
        if region_code:
            where_parts.append(f"(region_code,eq,{region_code})")
        if start_date:
            where_parts.append(f"(published_date,gte,{start_date})")
        if end_date:
            where_parts.append(f"(published_date,lte,{end_date})")

        if where_parts:
            params["where"] = "~and".join(where_parts)

        try:
            response = await self._request(
                "GET",
                f"/api/v2/tables/{self.trends_table_id}/records",
                params=params,
            )
            if response is None:
                return []
            return response.json().get("list", [])
        except Exception as e:
            print(f"[NocoDBTrends] Error querying trends: {e}")
            return []

    async def get_trend_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = await self._request(
                "GET",
                f"/api/v2/tables/{self.trends_table_id}/records/{record_id}",
                allow_404=True,
            )
            if response is None:
                return None
            return response.json()
        except Exception as e:
            print(f"[NocoDBTrends] Error getting trend by id: {e}")
            return None

    async def check_duplicate_by_hash(self, content_hash: str) -> bool:
        try:
            response = await self._request(
                "GET",
                f"/api/v2/tables/{self.trends_table_id}/records",
                params={
                    "where": f"(content_hash,eq,{content_hash})",
                    "limit": 1,
                },
            )
            if response is None:
                return False
            data = response.json()
            return len(data.get("list", [])) > 0
        except Exception as e:
            print(f"[NocoDBTrends] Error checking duplicate hash: {e}")
            return False

    async def batch_check_duplicates(
        self, hashes: List[str], page_size: int = 50
    ) -> set[str]:
        existing: set[str] = set()
        if not hashes:
            return existing

        for chunk in _chunk(hashes, page_size):
            hash_list = ",".join(chunk)
            offset = 0
            page_limit = 1000
            while True:
                try:
                    response = await self._request(
                        "GET",
                        f"/api/v2/tables/{self.trends_table_id}/records",
                        params={
                            "where": f"(content_hash,anyof,{hash_list})",
                            "limit": page_limit,
                            "offset": offset,
                        },
                    )
                    if response is None:
                        break
                    data = response.json()
                    page = data.get("list", [])
                    for record in page:
                        h = record.get("content_hash", "")
                        if h:
                            existing.add(h)
                    if len(page) < page_limit:
                        break
                    offset += page_limit
                except Exception as e:
                    print(f"[NocoDBTrends] Error batch checking duplicates: {e}")
                    break

        return existing

    async def get_statistics(self) -> Dict[str, Any]:
        platforms = ["youtube", "spotify", "steam"]
        stats: Dict[str, Any] = {"total": 0, "by_platform": {}}

        for platform in platforms:
            try:
                response = await self._request(
                    "GET",
                    f"/api/v2/tables/{self.trends_table_id}/records",
                    params={"where": f"(platform,eq,{platform})", "limit": 1},
                )
                if response:
                    data = response.json()
                    count = data.get("count", 0)
                    stats["by_platform"][platform] = count
                    stats["total"] += count
            except Exception:
                stats["by_platform"][platform] = 0

        return stats

    async def query_sources(
        self,
        platform: Optional[str] = None,
        enabled_only: bool = False,
    ) -> List[Dict[str, Any]]:
        if not self.sources_table_id:
            return []

        params: Dict[str, Any] = {"limit": 100}
        where_parts: List[str] = []
        if platform:
            where_parts.append(f"(platform,eq,{platform})")
        if enabled_only:
            where_parts.append("(enabled,eq,true)")

        if where_parts:
            params["where"] = "~and".join(where_parts)

        try:
            response = await self._request(
                "GET",
                f"/api/v2/tables/{self.sources_table_id}/records",
                params=params,
            )
            if response is None:
                return []
            return response.json().get("list", [])
        except Exception as e:
            print(f"[NocoDBTrends] Error querying sources: {e}")
            return []

    async def update_source_last_fetched(
        self, source_id: str, status: str = "success"
    ) -> bool:
        if not self.sources_table_id:
            return False

        try:
            response = await self._request(
                "PATCH",
                f"/api/v2/tables/{self.sources_table_id}/records",
                json_body=[
                    {
                        "id": source_id,
                        "last_fetched_at": datetime.now().isoformat(),
                        "last_fetch_status": status,
                    }
                ],
            )
            return response is not None
        except Exception as e:
            print(f"[NocoDBTrends] Error updating source: {e}")
            return False


def _env(key: str, default: str) -> str:
    import os

    return os.getenv(key, default)


def _normalize_url(value: str) -> str:
    return str(value or "").replace("/api/v1", "").replace("/api/v2", "").rstrip("/")


def _chunk(lst: List[str], size: int) -> List[List[str]]:
    return [lst[i : i + size] for i in range(0, len(lst), size)]


nocodb_trends = NocoDBTrendsClient()
