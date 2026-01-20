"""
Authentication middleware for Supabase JWT verification
"""
import logging
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def ensure_user_profile(user_id: str, email: str) -> None:
    """
    Ensure user has a profile and default role. Idempotent.

    This is the "lazy initialization" pattern - guarantees user data exists
    regardless of whether database triggers fired correctly.

    Called on every authenticated request (fast path if already exists).
    """
    db = get_supabase_client()

    # Check if profile exists (fast path)
    profile = db.table('user_profiles').select('id').eq('id', user_id).execute()

    if not profile.data:
        # Create profile
        display_name = email.split('@')[0] if email else None
        try:
            db.table('user_profiles').insert({
                'id': user_id,
                'email': email,
                'display_name': display_name
            }).execute()
            logger.info(f"Created user_profile for {email}")
        except Exception as e:
            # Ignore duplicate key errors (race condition)
            if 'duplicate' not in str(e).lower() and '23505' not in str(e):
                logger.warning(f"Failed to create user_profile for {email}: {e}")

    # Check if user has any role (fast path)
    roles = db.table('user_roles').select('id').eq('user_id', user_id).execute()

    if not roles.data:
        # Assign default 'user' role
        try:
            db.table('user_roles').insert({
                'user_id': user_id,
                'role': 'user'
            }).execute()
            logger.info(f"Assigned default 'user' role to {email}")
        except Exception as e:
            # Ignore duplicate key errors (race condition)
            if 'duplicate' not in str(e).lower() and '23505' not in str(e):
                logger.warning(f"Failed to assign role to {email}: {e}")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    Verify JWT token and return user_id.

    Also ensures user profile and default role exist (lazy initialization).

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

        user_id = str(user_response.user.id)
        email = user_response.user.email

        # Ensure profile and role exist (idempotent, fast if already exists)
        if email:
            ensure_user_profile(user_id, email)

        return user_id

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
