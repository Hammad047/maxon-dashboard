"""
Authentication service.
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.session import Session
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.schemas.auth import TokenData
from app.config import settings


class AuthService:
    """Authentication service."""
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email and password.
        
        Args:
            db: Database session
            email: User email
            password: Plain text password
            
        Returns:
            User object if authenticated, None otherwise
        """
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        return user
    
    @staticmethod
    async def create_session(db: AsyncSession, user: User) -> Session:
        """
        Create a new session with a refresh token.
        
        Args:
            db: Database session
            user: User object
            refresh_token: Refresh token string
            
        Returns:
            Session object
        """
        refresh_token = create_refresh_token(
            data={"sub": user.id, "email": user.email, "role": user.role.value}
        )
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        session = Session(
            user_id=user.id,
            refresh_token=refresh_token,
            expires_at=expires_at
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session
    
    @staticmethod
    async def get_session_by_token(db: AsyncSession, refresh_token: str) -> Optional[Session]:
        """
        Get session by refresh token.
        
        Args:
            db: Database session
            refresh_token: Refresh token string
            
        Returns:
            Session object or None
        """
        result = await db.execute(
            select(Session).where(Session.refresh_token == refresh_token)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete_session(db: AsyncSession, session: Session) -> None:
        """
        Delete a session.
        
        Args:
            db: Database session
            session: Session object
        """
        await db.delete(session)
        await db.commit()
    
    @staticmethod
    def create_tokens(user: User) -> dict:
        """
        Create access and refresh tokens for a user.
        
        Args:
            user: User object
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
        }
        
        access_token = create_access_token(data=token_data)
        refresh_token = create_refresh_token(data=token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> Optional[dict]:
        """
        Refresh access token using refresh token.
        
        Args:
            db: Database session
            refresh_token: Refresh token string
            
        Returns:
            Dictionary with new access_token or None if invalid
        """
        # Verify refresh token
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None
        
        # Get session
        session = await AuthService.get_session_by_token(db, refresh_token)
        if not session:
            return None
        
        # Check if session expired
        if session.expires_at < datetime.utcnow():
            await AuthService.delete_session(db, session)
            return None
        
        # Get user
        result = await db.execute(select(User).where(User.id == session.user_id))
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            return None
        
        # Rotate refresh token + create new access token
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
        }
        access_token = create_access_token(data=token_data)
        new_refresh_token = create_refresh_token(data=token_data)

        session.refresh_token = new_refresh_token
        session.expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }

    @staticmethod
    async def logout(db: AsyncSession, refresh_token: str) -> bool:
        """
        Logout by deleting the refresh-token session.
        """
        session = await AuthService.get_session_by_token(db, refresh_token)
        if not session:
            return False
        await AuthService.delete_session(db, session)
        return True
