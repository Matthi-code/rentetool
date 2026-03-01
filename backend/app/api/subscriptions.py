"""
Subscription API routes - user tier info endpoint.
"""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.db.supabase import get_supabase_client
from app.models.subscription import UserTierResponse
from app.services.subscription import get_user_tier_response

router = APIRouter()


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


@router.get("/me", response_model=UserTierResponse)
async def get_my_tier(user_id: str = Depends(get_current_user)):
    """Get the current user's subscription tier info."""
    db = get_db()
    return get_user_tier_response(user_id, db)
