"""
NocoDB client for Trenfy trend data operations.
Targets the trends and trend_sources tables in NocoDB.
"""

import json
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

import httpx

from trend_agents.shared.models import TrendItem

if TYPE_CHECKING:
    from trend_agents.shared.models import TrendSource


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
            "ar_translation": item.ar_translation,
            "status": item.status or "pending",
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
            payload = response.json()

            if isinstance(payload, list):
                return [row for row in payload if isinstance(row, dict)]

            if isinstance(payload, dict):
                rows = payload.get("list")
                if isinstance(rows, list):
                    return [row for row in rows if isinstance(row, dict)]

                data = payload.get("data")
                if isinstance(data, list):
                    return [row for row in data if isinstance(row, dict)]
                if isinstance(data, dict):
                    return [data]

                if payload.get("Id") is not None or payload.get("id") is not None:
                    return [payload]

            return []
        except Exception as e:
            print(f"[NocoDBTrends] Error batch creating trends: {e}")
            return []

    def _normalize_trend_status(self, row: Dict[str, Any]) -> str:
        """Return normalized status string for a NocoDB row.

        Treats None, missing, empty, or whitespace-only status as 'pending'.
        """
        raw = row.get("status")
        if raw is None:
            return "pending"
        normalized = str(raw).strip().lower()
        return normalized if normalized else "pending"

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
        q: Optional[str] = None,
        min_metric_value: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if sort:
            params["sort"] = sort

        where_parts: List[str] = []
        if platform:
            if "," in platform:
                where_parts.append(f"(platform,anyof,{platform})")
            else:
                where_parts.append(f"(platform,eq,{platform})")
        if category:
            where_parts.append(f"(category,eq,{category})")
        if region_code:
            where_parts.append(f"(region_code,eq,{region_code})")
        if start_date:
            where_parts.append(f"(published_date,gte,{start_date})")
        if end_date:
            where_parts.append(f"(published_date,lte,{end_date})")
        if q and q.strip():
            q_clean = q.strip()
            where_parts.append(
                f"(title,like,%{q_clean}%)~or(description,like,%{q_clean}%)"
            )
        if min_metric_value is not None:
            where_parts.append(f"(metric_value,gte,{min_metric_value})")

        # Status filter: approved/rejected use NocoDB where clause;
        # pending requires post-filtering because legacy rows have null/empty status.
        if status in ("approved", "rejected"):
            where_parts.append(f"(status,eq,{status})")

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
            rows: List[Dict[str, Any]] = response.json().get("list", [])

            # For pending filter: include rows with null/empty/missing status
            if status == "pending":
                rows = [r for r in rows if self._normalize_trend_status(r) == "pending"]

            # Normalize status field in response so callers always see a string
            if status is not None:
                for row in rows:
                    row["status"] = self._normalize_trend_status(row)

            return rows
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

    def _record_id(self, row: Dict[str, Any]) -> str:
        """Extract the NocoDB row ID from a record dict."""
        return str(row.get("Id") or row.get("id") or "")

    async def update_trend(
        self, record_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update a trend by its NocoDB row ID.

        Returns the updated row on success, None if the trend does not exist.
        """
        existing = await self.get_trend_by_id(record_id)
        if existing is None:
            return None
        try:
            await self._request(
                "PATCH",
                f"/api/v2/tables/{self.trends_table_id}/records",
                json_body=[{"Id": record_id, **updates}],
            )
        except Exception as e:
            print(f"[NocoDBTrends] Error updating trend: {e}")
            return None
        return await self.get_trend_by_id(record_id)

    async def delete_trend(self, record_id: str) -> bool:
        """Hard-delete a trend from NocoDB by its row ID.

        Returns True on success, False on error.
        Delete contract: DELETE /api/v2/tables/{table_id}/records with body [{"Id": row_id}]
        """
        try:
            await self._request(
                "DELETE",
                f"/api/v2/tables/{self.trends_table_id}/records",
                json_body=[{"Id": record_id}],
            )
            return True
        except Exception as e:
            print(f"[NocoDBTrends] Error deleting trend: {e}")
            return False

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

    def _resolve_stats_platforms(self) -> List[str]:
        try:
            from trend_agents.shared import source_registry

            configured_platforms = sorted(
                {
                    str(source.platform or "").strip().lower()
                    for source in source_registry.list_all()
                    if str(source.platform or "").strip()
                }
            )
            if configured_platforms:
                return configured_platforms
        except Exception:
            pass

        return ["youtube", "x"]

    async def get_statistics(self) -> Dict[str, Any]:
        platforms = self._resolve_stats_platforms()
        by_platform: List[Dict[str, Any]] = []
        total_trends = 0

        for platform in platforms:
            platform_total = 0
            newest_fetched_at: Optional[str] = None

            try:
                count_response = await self._request(
                    "GET",
                    f"/api/v2/tables/{self.trends_table_id}/records",
                    params={"where": f"(platform,eq,{platform})", "limit": 1},
                )
                if count_response is not None:
                    platform_total = int(count_response.json().get("count", 0))
            except Exception:
                platform_total = 0

            try:
                newest_response = await self._request(
                    "GET",
                    f"/api/v2/tables/{self.trends_table_id}/records",
                    params={
                        "where": f"(platform,eq,{platform})",
                        "sort": "-fetched_at",
                        "limit": 1,
                    },
                )
                if newest_response is not None:
                    newest_rows = newest_response.json().get("list", [])
                    if newest_rows:
                        newest_fetched_at = newest_rows[0].get("fetched_at")
            except Exception:
                newest_fetched_at = None

            by_platform.append(
                {
                    "platform": platform,
                    "total_trends": platform_total,
                    "newest_fetched_at": newest_fetched_at,
                }
            )
            total_trends += platform_total

        return {"total_trends": total_trends, "by_platform": by_platform}

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
            rows = response.json().get("list", [])
            return [self._normalize_source_row(row) for row in rows]
        except Exception as e:
            print(f"[NocoDBTrends] Error querying sources: {e}")
            return []

    def _normalize_source_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        source_id = row.get("id") or row.get("Id") or ""
        return {
            "id": source_id,
            "name": row.get("name") or "",
            "platform": row.get("platform") or "",
            "last_fetched_at": row.get("last_fetched_at"),
            "last_fetch_status": row.get("last_fetch_status") or "",
            "enabled": bool(row.get("enabled", False)),
        }

    def _source_to_record(self, source: "TrendSource") -> Dict[str, Any]:
        return {
            "id": source.id,
            "name": source.name,
            "platform": source.platform,
            "endpoint": source.endpoint,
            "params": json.dumps(source.params) if source.params else "{}",
            "check_interval_minutes": source.check_interval_minutes,
            "enabled": source.enabled,
            "last_fetched_at": None,
            "last_fetch_status": "",
        }

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

    async def sync_sources(self, sources: List["TrendSource"]) -> int:
        """Upsert sources from JSON config into trend_sources table.

        Inserts sources not yet in the table. Skips existing rows (preserves
        last_fetched_at and last_fetch_status). Returns count of inserted rows.
        Failure is non-fatal — logs warning and returns 0.
        """
        if not self.sources_table_id:
            print(
                "[NocoDBTrends] sync_sources skipped: NOCODB_SOURCES_TABLE_ID not set"
            )
            return 0

        try:
            # Fetch existing source IDs from table
            existing_response = await self._request(
                "GET",
                f"/api/v2/tables/{self.sources_table_id}/records",
                params={"fields": "id", "limit": 200},
            )
            if existing_response is None:
                return 0
            existing_ids: set = {
                row.get("id", "") for row in existing_response.json().get("list", [])
            }

            # Insert only sources not already present
            to_insert = [
                self._source_to_record(source)
                for source in sources
                if source.id not in existing_ids
            ]

            if not to_insert:
                print(
                    f"[NocoDBTrends] sync_sources: all {len(sources)} sources already present"
                )
                return 0

            inserted = 0
            for record in to_insert:
                try:
                    await self._request(
                        "POST",
                        f"/api/v2/tables/{self.sources_table_id}/records",
                        json_body=[record],
                    )
                    inserted += 1
                except httpx.HTTPStatusError as exc:
                    status_code = (
                        exc.response.status_code if exc.response is not None else "?"
                    )
                    detail = ""
                    if exc.response is not None:
                        try:
                            detail = str(exc.response.json().get("msg") or "")
                        except Exception:
                            detail = exc.response.text
                    suffix = f": {detail}" if detail else ""
                    print(
                        "[NocoDBTrends] sync_sources skipped "
                        f"{record.get('id', '')}: HTTP {status_code}{suffix}"
                    )
                except Exception as exc:
                    print(
                        "[NocoDBTrends] sync_sources skipped "
                        f"{record.get('id', '')}: {exc}"
                    )

            if inserted:
                print(f"[NocoDBTrends] sync_sources: inserted {inserted} new sources")
            return inserted

        except Exception as e:
            print(f"[NocoDBTrends] sync_sources warning (non-fatal): {e}")
            return 0

    async def update_source_status(
        self, source_id: str, status: str = "success"
    ) -> bool:
        """Update last_fetched_at and last_fetch_status for a source by its string ID.

        Note: source_id here is the string like 'YOUTUBE_TRENDING_US', not a NocoDB row int.
        Must first find the NocoDB row ID, then PATCH it.
        """
        if not self.sources_table_id:
            return False

        try:
            # Find NocoDB row by source string id
            lookup = await self._request(
                "GET",
                f"/api/v2/tables/{self.sources_table_id}/records",
                params={"where": f"(id,eq,{source_id})", "limit": 1},
            )
            if lookup is None:
                return False
            rows = lookup.json().get("list", [])
            if not rows:
                return False

            nocodb_row_id = rows[0].get("Id") or rows[0].get("id")

            response = await self._request(
                "PATCH",
                f"/api/v2/tables/{self.sources_table_id}/records",
                json_body=[
                    {
                        "Id": nocodb_row_id,
                        "last_fetched_at": datetime.now().isoformat(),
                        "last_fetch_status": status,
                    }
                ],
            )
            return response is not None
        except Exception as e:
            print(f"[NocoDBTrends] Error updating source status: {e}")
            return False


def _env(key: str, default: str) -> str:
    import os

    return os.getenv(key, default)


def _normalize_url(value: str) -> str:
    return str(value or "").replace("/api/v1", "").replace("/api/v2", "").rstrip("/")


def _chunk(lst: List[str], size: int) -> List[List[str]]:
    return [lst[i : i + size] for i in range(0, len(lst), size)]


nocodb_trends = NocoDBTrendsClient()
