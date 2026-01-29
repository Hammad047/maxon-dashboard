"""
RBAC (Role-Based Access Control) permissions and decorators.
"""
from functools import wraps
from typing import List, Callable, Optional
from fastapi import HTTPException, status
from app.models.user import User

# Access rule types (for admin panel and UI labels)
ACCESS_RULE_TYPES = [
    {"id": "files:read", "label": "Read / List", "description": "View and list files and folders"},
    {"id": "files:write", "label": "Upload", "description": "Upload files"},
    {"id": "files:delete", "label": "Delete", "description": "Delete files"},
    {"id": "analytics:read", "label": "Analytics", "description": "View analytics and activity trends"},
]

# Define role permissions
ROLE_PERMISSIONS = {
    "admin": ["*"],  # All permissions
    "editor": [
        "files:read",
        "files:write",
        "files:delete",
        "analytics:read",
    ],
    "viewer": [
        "files:read",
        "analytics:read",
    ],
    "external_viewer": [
        "files:read",
    ],
}

# Named path prefixes for restricted users (examples from S3: dawarc/..., prm/...)
NAMED_PATH_PREFIXES = [
    "dawarc/circuit/ampere",
    "dawarc/circuit/hertz",
    "dawarc/circuit/joule",
    "dawarc/circuit/kelvin",
    "dawarc/circuit/pascal",
    "dawarc/circuit/tesla",
]


def user_can_access_path(user: User, path_prefix: str) -> bool:
    """
    Check if user can access the given S3 path prefix.
    Admin can access everything. Others only within their allowed_path_prefix.
    """
    role_value = getattr(user.role, "value", None) or str(user.role)
    if role_value == "admin":
        return True
    allowed = (user.allowed_path_prefix or "").strip()
    if not allowed:
        return True  # No restriction = full access (e.g. legacy admin)
    # Normalize: ensure prefix ends with / for "under" check
    path = (path_prefix or "").strip().rstrip("/") + "/"
    base = allowed.rstrip("/") + "/"
    return path == base or path.startswith(base)


def has_permission(user: User, permission: str) -> bool:
    """
    Check if user has a specific permission.
    
    Args:
        user: User object
        permission: Permission string (e.g., "files:read")
        
    Returns:
        True if user has permission, False otherwise
    """
    user_permissions = ROLE_PERMISSIONS.get(user.role, [])
    
    # Admin has all permissions
    if "*" in user_permissions:
        return True
    
    return permission in user_permissions


def require_permission(permission: str):
    """
    Decorator to require a specific permission for an endpoint.
    
    Usage:
        @router.get("/files")
        @require_permission("files:read")
        async def list_files(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current_user from kwargs (injected by dependency)
            current_user = kwargs.get("current_user")
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(roles: List[str]):
    """
    Decorator to require specific roles for an endpoint.
    
    Usage:
        @router.get("/admin/users")
        @require_role(["admin"])
        async def list_users(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            role_value = getattr(current_user.role, "value", None) or str(current_user.role)
            if role_value not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role required: {', '.join(roles)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
