"""
User management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.permissions import require_role, ACCESS_RULE_TYPES, NAMED_PATH_PREFIXES
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/access-rules")
@require_role(["admin"])
async def list_access_rules(
    current_user: User = Depends(get_current_active_user),
):
    """List all access rule types (read only, delete, upload, etc.) for admin panel."""
    return {"rules": ACCESS_RULE_TYPES}


@router.get("/path-prefixes")
@require_role(["admin"])
async def list_path_prefixes(
    current_user: User = Depends(get_current_active_user),
):
    """List named path prefixes (ampere, hertz, joule, etc.) for admin panel."""
    return {"prefixes": [{"value": p, "label": p.split("/")[-1] or p} for p in NAMED_PATH_PREFIXES]}


@router.get("/discover-paths")
@require_role(["admin"])
async def discover_s3_paths(
    prefix: str = "",
    current_user: User = Depends(get_current_active_user),
):
    """
    Discover path prefixes from AWS S3 (admin only).
    Lists folders at the given prefix (default: root). Use to populate path rules in admin panel.
    """
    try:
        from app.services.file_service import FileService
        result = FileService.list_with_folders(prefix=prefix, max_keys=500)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not list S3 paths: {e!s}",
        ) from e
    folders = result.get("folders", [])
    # Return as { value: key, label: name } for admin panel Select
    prefixes = [{"value": f["key"].rstrip("/"), "label": f["name"] or f["key"]} for f in folders]
    return {"prefixes": prefixes, "prefix": result.get("prefix")}


@router.get("/stats")
@require_role(["admin"])
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Admin monitoring: user counts."""
    from sqlalchemy import select, func
    total = await db.scalar(select(func.count(User.id)))
    active = await db.scalar(select(func.count(User.id)).where(User.is_active))
    return {"total_users": total or 0, "active_users": active or 0}


@router.get("", response_model=list[UserResponse])
@require_role(["admin"])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await UserService.list_users(db, skip=skip, limit=limit)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@require_role(["admin"])
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await UserService.create_user(db, user_in)


@router.get("/{user_id}", response_model=UserResponse)
@require_role(["admin"])
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    user = await UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
@require_role(["admin"])
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    user = await UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await UserService.update_user(db, user, user_in)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_role(["admin"])
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    user = await UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await UserService.delete_user(db, user)
    return None

