"""
Analytics endpoints.
"""

import io
from typing import Any, List

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_role
from app.api.deps import get_current_active_user
from app.core.permissions import require_permission
from app.core.s3_client import get_s3_client
from app.database import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsStats
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/stats", response_model=AnalyticsStats)
@require_permission("analytics:read")
async def get_stats(
    force_refresh: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = AnalyticsService()
    return await service.get_analytics(force_refresh=force_refresh)


ALLOWED_EXCEL_TYPES = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
)


def _parse_excel_bytes(content: bytes) -> dict[str, Any]:
    """Parse Excel bytes into {data, columns} like upload-activity-trend."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        if not ws:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Excel has no active sheet")
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse Excel: {e!s}",
        ) from e

    if not rows:
        return {"data": [], "columns": []}

    headers = [str(c).strip() if c is not None else f"col_{i}" for i, c in enumerate(rows[0])]
    data: List[dict[str, Any]] = []
    for row in rows[1:]:
        obj: dict[str, Any] = {}
        for i, val in enumerate(row):
            key = headers[i] if i < len(headers) else f"col_{i}"
            if val is not None:
                obj[key] = val
        data.append(obj)
    return {"data": data, "columns": headers}


@router.post("/upload-activity-trend")
@require_permission("analytics:read")
async def upload_activity_trend(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, Any]:
    """
    Upload an Excel file for activity trend visualization.
    First row = headers, following rows = data. Returns list of objects (one per row).
    """
    if file.content_type and file.content_type not in ALLOWED_EXCEL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be Excel (.xlsx or .xls)",
        )
    content = await file.read()
    return _parse_excel_bytes(content)


PRM_EXCEL_KEY = "prm/vault/mi-data-bank/MI Data Bank - PRM.xlsx"
PRM_MAX_ROWS = 10_000


@router.get("/prm-data")
@require_role(["admin"])
async def get_prm_activity_trend(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, Any]:
    """
    Load fixed PRM Excel from S3 and return rows/columns for Activity Trend.
    Invalid/empty data → 400; file not found → 404.
    """
    content = get_s3_client().download_file(PRM_EXCEL_KEY)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Excel not found: {PRM_EXCEL_KEY}")
    out = _parse_excel_bytes(content)
    data = out.get("data") or []
    columns = out.get("columns") or []
    if not data or not columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or empty PRM Excel data")
    if len(data) > PRM_MAX_ROWS:
        data = data[:PRM_MAX_ROWS]
        out = {"data": data, "columns": columns}
    return out


