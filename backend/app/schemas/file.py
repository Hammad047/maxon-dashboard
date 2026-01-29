"""
File operation schemas.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FileInfo(BaseModel):
    """File information schema."""
    key: str
    filename: str
    size: int
    file_type: Optional[str] = None
    last_modified: datetime
    etag: Optional[str] = None


class FolderInfo(BaseModel):
    """Folder information schema (S3 prefix)."""
    key: str
    name: str


class FileListResponse(BaseModel):
    """File list response schema."""
    files: List[FileInfo]
    total: int
    prefix: Optional[str] = None


class FileTreeResponse(BaseModel):
    """File and folder tree response schema (preserves AWS structure)."""
    folders: List[FolderInfo]
    files: List[FileInfo]
    prefix: Optional[str] = None


class FileUploadResponse(BaseModel):
    """File upload response schema."""
    key: str
    filename: str
    size: int
    presigned_url: Optional[str] = None  # For direct S3 upload


class FileDownloadResponse(BaseModel):
    """File download response schema."""
    presigned_url: str
    expires_in: int  # seconds


class FileDeleteResponse(BaseModel):
    """File delete response schema."""
    key: str
    deleted: bool
