"""
AWS S3 client wrapper for file operations.
"""
import boto3
from botocore.exceptions import ClientError
from typing import Optional, List, Dict, BinaryIO
from app.config import settings

class S3Client:
    """Wrapper for AWS S3 operations."""
    
    def __init__(self):
        # Validate required config early (avoid cryptic boto errors)
        if not settings.AWS_REGION or not settings.S3_BUCKET_NAME:
            raise ValueError("S3 is not configured: missing AWS_REGION or S3_BUCKET_NAME")
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
            raise ValueError("S3 is not configured: missing AWS credentials")
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.S3_BUCKET_NAME
    
    def upload_file(self, file_obj: BinaryIO, key: str, content_type: Optional[str] = None) -> bool:
        """
        Upload a file to S3.
        
        Args:
            file_obj: File-like object to upload
            key: S3 object key (path)
            content_type: MIME type of the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                key,
                ExtraArgs=extra_args
            )
            return True
        except ClientError as e:
            print(f"Error uploading file to S3: {e}")
            return False
    
    def download_file(self, key: str) -> Optional[bytes]:
        """
        Download a file from S3.
        
        Args:
            key: S3 object key
            
        Returns:
            File content as bytes or None if error
        """
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except ClientError as e:
            print(f"Error downloading file from S3: {e}")
            return None
    
    def delete_file(self, key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            key: S3 object key
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            print(f"Error deleting file from S3: {e}")
            return False
    
    def list_files(self, prefix: str = "", max_keys: int = 1000) -> List[Dict]:
        """
        List files in S3 bucket (flat list, no folder structure).
        
        Args:
            prefix: Prefix to filter files
            max_keys: Maximum number of keys to return
            
        Returns:
            List of file metadata dictionaries
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'etag': obj['ETag'].strip('"'),
                    })
            
            return files
        except ClientError as e:
            print(f"Error listing files from S3: {e}")
            return []

    def list_with_folders(self, prefix: str = "", max_keys: int = 1000) -> Dict:
        """
        List files and folders in S3 bucket preserving AWS folder structure.
        Uses Delimiter='/' to get CommonPrefixes (folders) and Contents (files).
        Paginates with ContinuationToken to return up to max_keys items.
        """
        try:
            list_prefix = prefix.rstrip("/") + "/" if prefix and not prefix.endswith("/") else prefix
            folders = []
            files = []
            continuation_token = None
            max_pages = max(1, min(50, (max_keys + 999) // 1000))  # cap 50 pages
            for _ in range(max_pages):
                kwargs = {
                    "Bucket": self.bucket_name,
                    "Prefix": list_prefix,
                    "Delimiter": "/",
                    "MaxKeys": 1000,
                }
                if continuation_token:
                    kwargs["ContinuationToken"] = continuation_token
                response = self.s3_client.list_objects_v2(**kwargs)
                if "CommonPrefixes" in response:
                    for cp in response["CommonPrefixes"]:
                        folder_key = cp["Prefix"]
                        folder_name = folder_key.rstrip("/").split("/")[-1] if folder_key else ""
                        folders.append({"key": folder_key, "name": folder_name or folder_key})
                if "Contents" in response:
                    for obj in response["Contents"]:
                        key = obj["Key"]
                        if key.endswith("/"):
                            continue
                        filename = key.split("/")[-1]
                        files.append({
                            "key": key,
                            "filename": filename,
                            "size": obj["Size"],
                            "last_modified": obj["LastModified"].isoformat(),
                            "etag": obj["ETag"].strip('"'),
                        })
                continuation_token = response.get("NextContinuationToken")
                if not continuation_token:
                    break
            return {"folders": folders, "files": files, "prefix": prefix or None}
        except ClientError as e:
            print(f"Error listing files from S3: {e}")
            return {"folders": [], "files": [], "prefix": prefix or None}
    
    def get_presigned_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for secure file access.
        
        Args:
            key: S3 object key
            expires_in: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Presigned URL or None if error
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None
    
    def get_presigned_post_url(self, key: str, expires_in: int = 3600) -> Optional[Dict]:
        """
        Generate a presigned POST URL for direct file uploads.
        
        Args:
            key: S3 object key
            expires_in: URL expiration time in seconds
            
        Returns:
            Dictionary with URL and fields for POST request
        """
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=key,
                ExpiresIn=expires_in
            )
            return response
        except ClientError as e:
            print(f"Error generating presigned POST URL: {e}")
            return None
    
    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in S3.
        
        Args:
            key: S3 object key
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def get_file_metadata(self, key: str) -> Optional[Dict]:
        """
        Get file metadata from S3.
        
        Args:
            key: S3 object key
            
        Returns:
            Dictionary with file metadata or None if error
        """
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return {
                'key': key,
                'size': response['ContentLength'],
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'last_modified': response['LastModified'].isoformat(),
                'etag': response['ETag'].strip('"'),
            }
        except ClientError as e:
            print(f"Error getting file metadata: {e}")
            return None


_s3_client: Optional[S3Client] = None


def get_s3_client() -> S3Client:
    """
    Lazily create a singleton S3 client.
    Keeps imports light and avoids initializing AWS client at module import time.
    """
    global _s3_client
    if _s3_client is None:
        _s3_client = S3Client()
    return _s3_client
