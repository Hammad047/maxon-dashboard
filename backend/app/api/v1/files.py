"""
File operation endpoints (S3-backed).
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_active_user
from app.core.permissions import require_permission, user_can_access_path
from app.database import get_db
from pydantic import Field
from app.models.user import User
from app.schemas.file import (
    FileDeleteResponse,
    FileDownloadResponse,
    FileListResponse,
    FileTreeResponse,
    FileUploadResponse,
)
from app.services.file_service import FileService
from app.core.s3_client import get_s3_client
from app.config import settings
from typing_extensions import Annotated


router = APIRouter()


def _effective_prefix(current_user: User, prefix: str) -> str:
    """Return prefix scoped to user's allowed_path_prefix if set."""
    allowed = (current_user.allowed_path_prefix or "").strip()
    if not allowed:
        return prefix
    # User is restricted to allowed_path_prefix; ensure they only see under it
    prefix_norm = (prefix or "").strip().rstrip("/")
    if prefix_norm and not (prefix_norm + "/").startswith(allowed.rstrip("/") + "/"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this path")
    if not prefix_norm:
        return allowed.rstrip("/") + "/" if allowed else ""
    return prefix


# Declare /tree before "" so GET /api/v1/files/tree is matched correctly (not as path param)
@router.get("/tree", response_model=FileTreeResponse)
@require_permission("files:read")
async def list_files_with_folders(
    prefix: str = "",
    max_keys: int = 1000,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List files and folders preserving AWS S3 bucket structure."""
    effective = _effective_prefix(current_user, prefix)
    result = FileService.list_with_folders(prefix=effective, max_keys=max_keys)
    folders = [{"key": f["key"], "name": f["name"]} for f in result["folders"]]
    files = [
        {
            "key": f["key"],
            "filename": f["filename"],
            "size": int(f.get("size", 0)),
            "file_type": None,
            "last_modified": f["last_modified"],
            "etag": f.get("etag"),
        }
        for f in result["files"]
    ]
    return {"folders": folders, "files": files, "prefix": result.get("prefix")}


@router.get("", response_model=FileListResponse)
@require_permission("files:read")
async def list_files(
    prefix: str = "",
    max_keys: int = 1000,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    effective = _effective_prefix(current_user, prefix)
    files = FileService.list_files(prefix=effective, max_keys=max_keys)
    mapped = [
        {
            "key": f["key"],
            "filename": f["key"].split("/")[-1],
            "size": int(f.get("size", 0)),
            "file_type": None,
            "last_modified": f["last_modified"],
            "etag": f.get("etag"),
        }
        for f in files
    ]
    return {"files": mapped, "total": len(mapped), "prefix": prefix or None}


def _check_path_access(current_user: User, key: str) -> None:
    """Raise 403 if user cannot access the given S3 key."""
    if not user_can_access_path(current_user, key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this path")


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
@require_permission("files:write")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if file.content_type and file.content_type not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="File type not allowed")

    allowed = (current_user.allowed_path_prefix or "").strip()
    
    if path:
        # If path is provided, use it. But we must validate it against allowed_path_prefix if set.
        dest_path = path.strip().rstrip("/")
        key = f"{dest_path}/{file.filename}"
    elif allowed:
        key = f"{allowed.rstrip('/')}/{file.filename}"
    else:
        key = f"{current_user.id}/{file.filename}"
    _check_path_access(current_user, key)
    ok = get_s3_client().upload_file(file.file, key=key, content_type=file.content_type)
    if not ok:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upload failed")

    return {"key": key, "filename": file.filename, "size": 0, "presigned_url": None}


@router.get("/download/{key:path}", response_model=FileDownloadResponse)
@require_permission("files:read")
async def download_file(
    key: str,
    expires_in: int = 3600,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _check_path_access(current_user, key)
    url = FileService.get_download_url(key, expires_in=expires_in)
    return {"presigned_url": url, "expires_in": expires_in}


@router.delete("/{key:path}", response_model=FileDeleteResponse)
@require_permission("files:delete")
async def delete_file(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _check_path_access(current_user, key)
    deleted = FileService.delete_file(key)
    return {"key": key, "deleted": deleted}


@router.get("/presigned-upload", response_model=dict)
@require_permission("files:write")
async def presigned_upload(
    key: str,
    expires_in: int = 3600,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _check_path_access(current_user, key)
    return FileService.get_presigned_upload(key, expires_in=expires_in)


@router.post("/create-folder", status_code=status.HTTP_201_CREATED)
@require_permission("files:write")
async def create_folder(
    path: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a folder (prefix) in S3."""
    # Ensure path ends with /
    folder_path = path.strip().rstrip("/") + "/"
    
    # Check permissions
    allowed = (current_user.allowed_path_prefix or "").strip()
    if allowed and not folder_path.startswith(allowed.rstrip("/") + "/"):
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this path")

    # Create empty object (folder placeholder in S3)
    try:
        s3_client = get_s3_client()
        s3_client.s3_client.put_object(
            Bucket=s3_client.bucket_name, Key=folder_path, Body=b""
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create folder: {str(e)}")

    return {"key": folder_path, "message": "Folder created"}

