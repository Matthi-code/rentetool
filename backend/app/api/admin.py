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


class AdminCase(BaseModel):
    id: str
    naam: str
    klant_referentie: str | None
    einddatum: str
    owner_email: str
    vorderingen_count: int
    deelbetalingen_count: int
    created_at: datetime


@router.get("/cases", response_model=List[AdminCase])
async def list_all_cases(admin_id: str = Depends(require_admin)):
    """List all cases with owner info."""
    db = get_db()

    cases = db.table('cases').select(
        '*, vorderingen(count), deelbetalingen(count)'
    ).order('created_at', desc=True).execute()

    # Get owner emails
    user_ids = list(set(c['user_id'] for c in cases.data))
    users = db.table('user_profiles').select('id, email').in_('id', user_ids).execute()
    users_map = {u['id']: u['email'] for u in users.data}

    result = []
    for c in cases.data:
        vord_count = c.get('vorderingen', [{}])[0].get('count', 0) if c.get('vorderingen') else 0
        deel_count = c.get('deelbetalingen', [{}])[0].get('count', 0) if c.get('deelbetalingen') else 0

        result.append(AdminCase(
            id=c['id'],
            naam=c['naam'],
            klant_referentie=c.get('klant_referentie'),
            einddatum=c['einddatum'],
            owner_email=users_map.get(c['user_id'], 'onbekend'),
            vorderingen_count=vord_count,
            deelbetalingen_count=deel_count,
            created_at=c['created_at']
        ))

    return result


class AdminUsageLog(BaseModel):
    id: str
    user_email: str
    action_type: str
    case_name: str | None
    created_at: datetime


@router.get("/usage-logs", response_model=List[AdminUsageLog])
async def list_usage_logs(admin_id: str = Depends(require_admin)):
    """List all usage logs with user info."""
    db = get_db()

    logs = db.table('usage_logs').select('*').order('created_at', desc=True).limit(500).execute()

    # Get user emails
    user_ids = list(set(l['user_id'] for l in logs.data if l.get('user_id')))
    users = db.table('user_profiles').select('id, email').in_('id', user_ids).execute() if user_ids else type('obj', (object,), {'data': []})()
    users_map = {u['id']: u['email'] for u in users.data}

    result = []
    for l in logs.data:
        result.append(AdminUsageLog(
            id=l['id'],
            user_email=users_map.get(l.get('user_id'), 'onbekend'),
            action_type=l['action_type'],
            case_name=l.get('case_name'),
            created_at=l['created_at']
        ))

    return result


@router.post("/sync-profiles")
async def sync_user_profiles(admin_id: str = Depends(require_admin)):
    """Sync user_profiles with auth.users - create missing profiles."""
    db = get_db()

    # Get all existing profile IDs
    profiles = db.table('user_profiles').select('id').execute()
    profile_ids = {p['id'] for p in profiles.data}

    # We can't directly query auth.users from the API, but we can use the
    # Supabase admin API. For now, return the count of existing profiles.
    # The proper fix is to run the backfill SQL in Supabase dashboard.

    return {
        "profiles_count": len(profile_ids),
        "message": "Run this SQL in Supabase Dashboard to sync profiles: INSERT INTO public.user_profiles (id, email, display_name) SELECT id, email, split_part(email, '@', 1) FROM auth.users ON CONFLICT (id) DO NOTHING;"
    }
