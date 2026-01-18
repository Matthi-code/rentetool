"""
Admin API routes - restricted to admin users only
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()

# Admin whitelist
ADMIN_EMAILS = ['matthi+rente@gcon.nl']


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


async def require_admin(user_id: str = Depends(get_current_user)) -> str:
    """Verify user is an admin."""
    db = get_db()

    # Get user email from user_profiles
    profile = db.table('user_profiles').select('email').eq('id', user_id).execute()

    if not profile.data:
        raise HTTPException(status_code=403, detail="Geen toegang")

    email = profile.data[0]['email']

    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Geen admin rechten")

    return user_id


class UserStats(BaseModel):
    id: str
    email: str
    display_name: str | None
    email_domain: str
    created_at: datetime
    cases_count: int
    shared_with_count: int
    last_activity: datetime | None


class AdminStats(BaseModel):
    total_users: int
    total_cases: int
    total_calculations: int
    total_pdf_views: int


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(admin_id: str = Depends(require_admin)):
    """Get overall system statistics."""
    db = get_db()

    # Count users
    users = db.table('user_profiles').select('id', count='exact').execute()
    total_users = users.count or 0

    # Count cases
    cases = db.table('cases').select('id', count='exact').execute()
    total_cases = cases.count or 0

    # Count usage logs
    try:
        calculations = db.table('usage_logs').select('id', count='exact').eq('action_type', 'calculation').execute()
        total_calculations = calculations.count or 0

        pdf_views = db.table('usage_logs').select('id', count='exact').eq('action_type', 'pdf_view').execute()
        total_pdf_views = pdf_views.count or 0
    except:
        total_calculations = 0
        total_pdf_views = 0

    return AdminStats(
        total_users=total_users,
        total_cases=total_cases,
        total_calculations=total_calculations,
        total_pdf_views=total_pdf_views
    )


@router.get("/users", response_model=List[UserStats])
async def list_users(admin_id: str = Depends(require_admin)):
    """List all users with their statistics."""
    db = get_db()

    # Get all user profiles
    profiles = db.table('user_profiles').select('*').order('created_at', desc=True).execute()

    result = []
    for profile in profiles.data:
        user_id = profile['id']

        # Count cases owned by this user
        cases = db.table('cases').select('id', count='exact').eq('user_id', user_id).execute()
        cases_count = cases.count or 0

        # Count cases shared with this user
        try:
            shares = db.table('case_shares').select('id', count='exact').eq('shared_with_user_id', user_id).execute()
            shared_with_count = shares.count or 0
        except:
            shared_with_count = 0

        # Get last activity from usage_logs
        try:
            last_log = db.table('usage_logs').select('created_at').eq('user_id', user_id).order('created_at', desc=True).limit(1).execute()
            last_activity = last_log.data[0]['created_at'] if last_log.data else None
        except:
            last_activity = None

        result.append(UserStats(
            id=user_id,
            email=profile['email'],
            display_name=profile.get('display_name'),
            email_domain=profile['email_domain'],
            created_at=profile['created_at'],
            cases_count=cases_count,
            shared_with_count=shared_with_count,
            last_activity=last_activity
        ))

    return result


@router.get("/check")
async def check_admin(admin_id: str = Depends(require_admin)):
    """Check if current user is an admin."""
    return {"is_admin": True}
