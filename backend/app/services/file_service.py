"""
File service (S3-backed operations).
"""

from __future__ import annotations

from typing import Optional, List, Dict

from fastapi import HTTPException, status

from app.config import settings
from app.core.s3_client import get_s3_client


class FileService:
    """S3 file operations."""

    @staticmethod
    def list_files(prefix: str = "", max_keys: int = 1000) -> List[Dict]:
        try:
            return get_s3_client().list_files(prefix=prefix, max_keys=max_keys)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    @staticmethod
    def list_with_folders(prefix: str = "", max_keys: int = 1000) -> Dict:
        """List files and folders preserving AWS S3 bucket structure."""
        try:
            return get_s3_client().list_with_folders(prefix=prefix, max_keys=max_keys)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    @staticmethod
    def delete_file(key: str) -> bool:
        if not key:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing key")
        try:
            return get_s3_client().delete_file(key)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    @staticmethod
    def get_download_url(key: str, expires_in: int = 3600) -> str:
        try:
            url = get_s3_client().get_presigned_url(key, expires_in=expires_in)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
        if not url:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        return url

    @staticmethod
    def get_presigned_upload(key: str, expires_in: int = 3600) -> Dict:
        try:
            post = get_s3_client().get_presigned_post_url(key, expires_in=expires_in)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
        if not post:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create presigned upload")
        return post

