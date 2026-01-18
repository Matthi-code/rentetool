"""
Sharing API routes for case collaboration
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from app.models import (
    ColleagueResponse, ColleagueWithPermission, CaseShareCreate,
    CaseShareResponse, ColleagueCountResponse
)
from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


@router.get("/colleagues", response_model=List[ColleagueResponse])
async def list_colleagues(user_id: str = Depends(get_current_user)):
    """
    List colleagues (users with same email domain) excluding self.
    Returns empty list if no colleagues found.
    """
    db = get_db()

    # Get current user's email domain
    user_profile = db.table('user_profiles').select('email_domain').eq('id', user_id).execute()

    if not user_profile.data:
        return []

    domain = user_profile.data[0]['email_domain']

    # Get all users with same domain except self
    colleagues = db.table('user_profiles').select(
        'id, email, display_name'
    ).eq('email_domain', domain).neq('id', user_id).order('display_name').execute()

    return [ColleagueResponse(**c) for c in colleagues.data]


@router.get("/colleagues/count", response_model=ColleagueCountResponse)
async def get_colleague_count(user_id: str = Depends(get_current_user)):
    """Get count of available colleagues for sharing."""
    db = get_db()

    user_profile = db.table('user_profiles').select('email_domain').eq('id', user_id).execute()

    if not user_profile.data:
        return ColleagueCountResponse(count=0, domain=None)

    domain = user_profile.data[0]['email_domain']

    count_result = db.table('user_profiles').select(
        'id', count='exact'
    ).eq('email_domain', domain).neq('id', user_id).execute()

    return ColleagueCountResponse(count=count_result.count or 0, domain=domain)


@router.post("/cases/{case_id}/share", response_model=CaseShareResponse)
async def share_case(
    case_id: str,
    share: CaseShareCreate,
    user_id: str = Depends(get_current_user)
):
    """Share a case with a colleague."""
    db = get_db()

    # Verify case ownership
    case = db.table('cases').select('id, user_id').eq('id', case_id).execute()
    if not case.data or case.data[0]['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Case not found")

    # Verify target user is a colleague (same domain)
    user_profile = db.table('user_profiles').select('email_domain').eq('id', user_id).execute()
    target_profile = db.table('user_profiles').select(
        'id, email, display_name, email_domain'
    ).eq('id', share.shared_with_user_id).execute()

    if not user_profile.data or not target_profile.data:
        raise HTTPException(status_code=400, detail="User not found")

    if user_profile.data[0]['email_domain'] != target_profile.data[0]['email_domain']:
        raise HTTPException(
            status_code=403,
            detail="Kan alleen delen met collega's van dezelfde organisatie"
        )

    if share.shared_with_user_id == user_id:
        raise HTTPException(status_code=400, detail="Kan niet met uzelf delen")

    # Create share (upsert to handle re-sharing with different permission)
    share_data = {
        'case_id': case_id,
        'shared_with_user_id': share.shared_with_user_id,
        'shared_by_user_id': user_id,
        'permission': share.permission,
    }

    response = db.table('case_shares').upsert(
        share_data,
        on_conflict='case_id,shared_with_user_id'
    ).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Delen mislukt")

    result = response.data[0]
    return CaseShareResponse(
        **result,
        shared_with_user=ColleagueResponse(**target_profile.data[0])
    )


@router.delete("/cases/{case_id}/share/{shared_with_user_id}")
async def unshare_case(
    case_id: str,
    shared_with_user_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove sharing for a specific user (owner only)."""
    db = get_db()

    # Verify case ownership
    case = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not case.data:
        raise HTTPException(status_code=404, detail="Case not found")

    # Delete share
    db.table('case_shares').delete().eq('case_id', case_id).eq(
        'shared_with_user_id', shared_with_user_id
    ).execute()

    return {"status": "unshared"}


@router.delete("/cases/{case_id}/leave")
async def leave_shared_case(
    case_id: str,
    user_id: str = Depends(get_current_user)
):
    """Leave a shared case (recipient removes themselves from share)."""
    db = get_db()

    # Verify user is a recipient of this share (not the owner)
    share = db.table('case_shares').select('id').eq('case_id', case_id).eq(
        'shared_with_user_id', user_id
    ).execute()

    if not share.data:
        raise HTTPException(status_code=404, detail="Share not found")

    # Delete the share
    db.table('case_shares').delete().eq('case_id', case_id).eq(
        'shared_with_user_id', user_id
    ).execute()

    return {"status": "left"}


@router.get("/cases/{case_id}/shares", response_model=List[CaseShareResponse])
async def get_case_shares(
    case_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all shares for a case (owner only)."""
    db = get_db()

    # Verify case ownership
    case = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not case.data:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get shares with user details
    shares = db.table('case_shares').select('*').eq('case_id', case_id).execute()

    if not shares.data:
        return []

    # Get user details for each share
    user_ids = [s['shared_with_user_id'] for s in shares.data]
    users = db.table('user_profiles').select('id, email, display_name').in_('id', user_ids).execute()
    users_map = {u['id']: u for u in users.data}

    results = []
    for s in shares.data:
        user_data = users_map.get(s['shared_with_user_id'])
        results.append(CaseShareResponse(
            **s,
            shared_with_user=ColleagueResponse(**user_data) if user_data else None
        ))

    return results


@router.patch("/cases/{case_id}/share/{shared_with_user_id}")
async def update_share_permission(
    case_id: str,
    shared_with_user_id: str,
    permission: str,
    user_id: str = Depends(get_current_user)
):
    """Update sharing permission."""
    db = get_db()

    if permission not in ('view', 'edit'):
        raise HTTPException(status_code=400, detail="Ongeldige permissie")

    # Verify case ownership
    case = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not case.data:
        raise HTTPException(status_code=404, detail="Case not found")

    response = db.table('case_shares').update({'permission': permission}).eq(
        'case_id', case_id
    ).eq('shared_with_user_id', shared_with_user_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Share not found")

    return {"status": "updated", "permission": permission}
