"""
Application configuration using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Dashboard API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    # In docker-compose the hostname is the service name: "postgres"
    DATABASE_URL: str = "postgresql+asyncpg://admin:admin@postgres:5432/dashboard"
    # Sync URL for Alembic migrations (postgresql:// with psycopg2)
    SYNC_DATABASE_URL: str = "postgresql://admin:admin@postgres:5432/dashboard"
    
    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str
    
    # Redis
    # In docker-compose the hostname is the service name: "redis"
    REDIS_URL: str = "redis://redis:6379"
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 1073741824  # 1GB in bytes
    ALLOWED_FILE_TYPES: List[str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "video/mp4", "video/quicktime",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel"
    ]
    
    # Analytics
    ANALYTICS_REFRESH_INTERVAL_HOURS: int = 1
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
