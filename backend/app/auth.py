"""
Authentication middleware for Supabase JWT verification
"""
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.supabase import get_supabase_client


security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    Verify JWT token and return user_id.

    For development: if no token provided and debug mode, return demo-user.
    """
    from app.config import get_settings
    settings = get_settings()

    # Development fallback
    if credentials is None:
        if settings.debug:
            return "demo-user"
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    try:
        supabase = get_supabase_client()
        # Verify the JWT with Supabase
        user_response = supabase.auth.get_user(token)

        if user_response.user is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return str(user_response.user.id)

    except Exception as e:
        if settings.debug:
            print(f"Auth error: {e}")
            return "demo-user"
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """Get user if authenticated, None otherwise."""
    if credentials is None:
        return None

    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None
