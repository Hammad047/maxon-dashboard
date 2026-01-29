"""
File metadata model (optional - for caching file info).
"""
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class FileMetadata(Base):
    """File metadata cache model."""
    __tablename__ = "file_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    s3_key = Column(String, unique=True, nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=True)  # MIME type
    file_size = Column(BigInteger, nullable=False)  # Size in bytes
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_modified = Column(DateTime(timezone=True), nullable=True)
    etag = Column(String, nullable=True)
    
    # Relationship
    uploader = relationship("User", backref="uploaded_files")
    
    def __repr__(self):
        return f"<FileMetadata(id={self.id}, s3_key={self.s3_key}, filename={self.filename})>"
