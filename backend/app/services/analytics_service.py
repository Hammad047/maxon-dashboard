"""
Analytics service (S3 + Redis cache).
"""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any, Dict, Optional

import redis

from app.config import settings
from app.core.s3_client import get_s3_client


class AnalyticsService:
    CACHE_KEY = "analytics:stats:v1"

    def __init__(self) -> None:
        self._redis = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _redis_get(self, key: str) -> Optional[str]:
        return await asyncio.to_thread(self._redis.get, key)

    async def _redis_setex(self, key: str, ttl: int, value: str) -> None:
        await asyncio.to_thread(self._redis.setex, key, ttl, value)

    async def _redis_ttl(self, key: str) -> int:
        return await asyncio.to_thread(self._redis.ttl, key)

    async def get_analytics(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Returns analytics stats, cached in Redis.
        """
        if not force_refresh:
            cached = await self._redis_get(self.CACHE_KEY)
            if cached:
                data = json.loads(cached)
                data["refreshed"] = False
                data["cache_ttl_seconds"] = await self._redis_ttl(self.CACHE_KEY)
                return data

        try:
            files = get_s3_client().list_files(prefix="", max_keys=1000)
        except ValueError as e:
            # S3 not configured; return stable empty analytics instead of 500
            return {
                "total_files": 0,
                "total_bytes": 0,
                "by_extension": {},
                "by_content_type": {},
                "refreshed": False,
                "cache_ttl_seconds": None,
                "detail": str(e),
            }

        total_files = len(files)
        total_bytes = sum(int(f.get("size", 0)) for f in files)

        by_extension: dict[str, int] = defaultdict(int)
        by_content_type: dict[str, int] = defaultdict(int)

        # Best-effort enrichment (content-type needs head_object; keep it light by only using key extension)
        for f in files:
            key = f.get("key", "") or ""
            ext = (key.rsplit(".", 1)[-1].lower() if "." in key else "none")
            by_extension[ext] += 1

        data = {
            "total_files": total_files,
            "total_bytes": total_bytes,
            "by_extension": dict(by_extension),
            "by_content_type": dict(by_content_type),
            "refreshed": True,
            "cache_ttl_seconds": settings.REDIS_CACHE_TTL,
        }

        await self._redis_setex(self.CACHE_KEY, settings.REDIS_CACHE_TTL, json.dumps(data))
        return data

