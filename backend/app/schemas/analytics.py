"""
Analytics schemas.
"""

from pydantic import BaseModel
from typing import Optional


class AnalyticsStats(BaseModel):
    """High-level analytics statistics."""

    total_files: int
    total_bytes: int
    by_extension: dict[str, int]
    by_content_type: dict[str, int]
    refreshed: bool = False
    cache_ttl_seconds: Optional[int] = None
    detail: Optional[str] = None


class ActivityTrendRow(BaseModel):
    """One row of activity trend data (flexible keys from Excel)."""
    model_config = {"extra": "allow"}

