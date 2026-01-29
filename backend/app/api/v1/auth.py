"""
Authentication endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import LoginRequest, Token, RefreshTokenRequest, SignupRequest
from app.schemas.user import UserResponse, UserCreate
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.core.security import create_access_token
from app.api.deps import get_current_active_user
from app.models.user import User, UserRole

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint - returns access and refresh tokens.
    """
    user = await AuthService.authenticate_user(db, login_data.email, login_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login (persisted when create_session commits)
    from datetime import datetime, timezone
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    # Create session with refresh token
    session = await AuthService.create_session(db, user)
    
    # Create access token
    access_token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role.value}
    )
    
    return Token(
        access_token=access_token,
        refresh_token=session.refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    tokens = await AuthService.refresh_access_token(db, refresh_data.refresh_token)
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return Token(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer"
    )


@router.post("/logout")
async def logout(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Logout endpoint - invalidates refresh token.
    """
    success = await AuthService.logout(db, refresh_data.refresh_token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token"
        )
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user information.
    """
    return current_user


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    signup_data: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public signup. Role is always VIEWER (backend enforced)."""
    created = await UserService.create_user(
        db,
        UserCreate(
            email=signup_data.email,
            password=signup_data.password,
            full_name=signup_data.full_name,
            role=UserRole.VIEWER,
            is_active=True,
        ),
    )
    return created
