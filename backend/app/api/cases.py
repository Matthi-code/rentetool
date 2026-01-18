"""
Cases API routes with Supabase integration
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models import (
    CaseCreate, CaseResponse, CaseWithLines, CaseListResponse,
    VorderingCreate, VorderingResponse,
    DeelbetalingCreate, DeelbetalingResponse,
    CaseShareInfo, ColleagueResponse, ColleagueWithPermission
)
from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


def can_edit_case(db, case_id: str, user_id: str) -> bool:
    """Check if user can edit a case (owner or has edit permission)."""
    # Check ownership
    case = db.table('cases').select('user_id').eq('id', case_id).execute()
    if case.data and case.data[0]['user_id'] == user_id:
        return True

    # Check edit permission
    share = db.table('case_shares').select('permission').eq(
        'case_id', case_id
    ).eq('shared_with_user_id', user_id).eq('permission', 'edit').execute()

    return bool(share.data)


def _sharing_tables_exist(db) -> bool:
    """Check if sharing feature tables exist."""
    try:
        db.table('case_shares').select('id').limit(1).execute()
        return True
    except:
        return False


@router.get("", response_model=List[CaseListResponse])
async def list_cases(
    user_id: str = Depends(get_current_user),
    filter: Optional[str] = Query(None, description="Filter: 'own', 'shared', or None for all")
):
    """List all cases for the current user (owned and shared) with counts and sharing info."""
    db = get_db()
    result = []

    # Check if sharing feature is available
    sharing_enabled = _sharing_tables_exist(db)

    # Get owned cases (unless filtering for shared only)
    if filter != 'shared':
        owned_response = db.table('cases').select(
            '*, vorderingen(count), deelbetalingen(count)'
        ).eq('user_id', user_id).order('created_at', desc=True).execute()

        # Get sharing info for owned cases (only if sharing is enabled)
        shares_by_case = {}
        if sharing_enabled:
            owned_case_ids = [c['id'] for c in owned_response.data] if owned_response.data else []
            if owned_case_ids:
                try:
                    shares = db.table('case_shares').select('*').in_('case_id', owned_case_ids).execute()
                    if shares.data:
                        # Get user details for shared_with users
                        shared_user_ids = list(set(s['shared_with_user_id'] for s in shares.data))
                        users = db.table('user_profiles').select('id, email, display_name').in_('id', shared_user_ids).execute()
                        users_map = {u['id']: u for u in users.data}

                        for share in shares.data:
                            cid = share['case_id']
                            if cid not in shares_by_case:
                                shares_by_case[cid] = []
                            user_data = users_map.get(share['shared_with_user_id'])
                            if user_data:
                                shares_by_case[cid].append(ColleagueWithPermission(
                                    **user_data,
                                    permission=share['permission']
                                ))
                except:
                    pass  # Sharing not available

        # Process owned cases
        for row in owned_response.data:
            vord_count = row.get('vorderingen', [{}])[0].get('count', 0) if row.get('vorderingen') else 0
            deel_count = row.get('deelbetalingen', [{}])[0].get('count', 0) if row.get('deelbetalingen') else 0

            case_data = {k: v for k, v in row.items() if k not in ('vorderingen', 'deelbetalingen')}

            sharing_info = CaseShareInfo(
                is_shared=row['id'] in shares_by_case,
                is_owner=True,
                shared_with=shares_by_case.get(row['id'], [])
            )

            result.append(CaseListResponse(
                **case_data,
                vorderingen_count=vord_count,
                deelbetalingen_count=deel_count,
                sharing=sharing_info
            ))

    # Get shared cases (unless filtering for own only) - only if sharing is enabled
    if filter != 'own' and sharing_enabled:
        try:
            shared_response = db.table('case_shares').select(
                'case_id, permission, shared_by_user_id'
            ).eq('shared_with_user_id', user_id).execute()

            if shared_response.data:
                shared_case_ids = [s['case_id'] for s in shared_response.data]
                shared_by_map = {s['case_id']: {'user_id': s['shared_by_user_id'], 'permission': s['permission']}
                               for s in shared_response.data}

                # Get the actual case data
                cases_response = db.table('cases').select(
                    '*, vorderingen(count), deelbetalingen(count)'
                ).in_('id', shared_case_ids).order('created_at', desc=True).execute()

                # Get shared_by user details
                shared_by_user_ids = list(set(s['shared_by_user_id'] for s in shared_response.data))
                shared_by_users = db.table('user_profiles').select('id, email, display_name').in_('id', shared_by_user_ids).execute()
                shared_by_users_map = {u['id']: u for u in shared_by_users.data}

                for row in cases_response.data:
                    vord_count = row.get('vorderingen', [{}])[0].get('count', 0) if row.get('vorderingen') else 0
                    deel_count = row.get('deelbetalingen', [{}])[0].get('count', 0) if row.get('deelbetalingen') else 0

                    case_data = {k: v for k, v in row.items() if k not in ('vorderingen', 'deelbetalingen')}
                    share_info = shared_by_map.get(row['id'], {})
                    shared_by_user = shared_by_users_map.get(share_info.get('user_id'))

                    sharing_info = CaseShareInfo(
                        is_shared=True,
                        is_owner=False,
                        shared_by=ColleagueResponse(**shared_by_user) if shared_by_user else None,
                        my_permission=share_info.get('permission')
                    )

                    result.append(CaseListResponse(
                        **case_data,
                        vorderingen_count=vord_count,
                        deelbetalingen_count=deel_count,
                        sharing=sharing_info
                    ))
        except:
            pass  # Sharing not available

    # Sort by created_at descending
    result.sort(key=lambda x: x.created_at, reverse=True)

    return result


@router.post("", response_model=CaseResponse)
async def create_case(case: CaseCreate, user_id: str = Depends(get_current_user)):
    """Create a new case."""
    db = get_db()

    case_data = {
        'user_id': user_id,
        'naam': case.naam,
        'klant_referentie': case.klant_referentie,
        'einddatum': str(case.einddatum),
        'strategie': case.strategie,
    }

    response = db.table('cases').insert(case_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create case")

    return CaseResponse(**response.data[0])


@router.get("/{case_id}", response_model=CaseWithLines)
async def get_case(case_id: str, user_id: str = Depends(get_current_user)):
    """Get a case with all vorderingen and deelbetalingen."""
    db = get_db()

    # Get case
    case_response = db.table('cases').select('*').eq('id', case_id).execute()

    if not case_response.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case = case_response.data[0]
    is_owner = case['user_id'] == user_id

    # If not owner, check if shared with user
    sharing_info = None
    sharing_tables_exist = _sharing_tables_exist(db)

    if is_owner:
        # Owner always has access
        if sharing_tables_exist:
            # Get sharing info for owner
            shares = db.table('case_shares').select('*').eq('case_id', case_id).execute()
            shared_with = []
            if shares.data:
                shared_user_ids = [s['shared_with_user_id'] for s in shares.data]
                users = db.table('user_profiles').select('id, email, display_name').in_('id', shared_user_ids).execute()
                users_map = {u['id']: u for u in users.data}
                for s in shares.data:
                    user_data = users_map.get(s['shared_with_user_id'])
                    if user_data:
                        shared_with.append(ColleagueWithPermission(
                            **user_data,
                            permission=s['permission']
                        ))
            sharing_info = CaseShareInfo(
                is_shared=len(shared_with) > 0,
                is_owner=True,
                shared_with=shared_with
            )
        else:
            # No sharing tables - provide default sharing info
            sharing_info = CaseShareInfo(
                is_shared=False,
                is_owner=True,
                shared_with=[]
            )
    else:
        # Not owner - check if shared (only if sharing tables exist)
        if sharing_tables_exist:
            share = db.table('case_shares').select('*, user_profiles!shared_by_user_id(id, email, display_name)').eq(
                'case_id', case_id
            ).eq('shared_with_user_id', user_id).execute()

            if not share.data:
                raise HTTPException(status_code=404, detail="Case not found")

            shared_by_user = share.data[0].get('user_profiles')
            sharing_info = CaseShareInfo(
                is_shared=True,
                is_owner=False,
                shared_by=ColleagueResponse(**shared_by_user) if shared_by_user else None,
                my_permission=share.data[0]['permission']
            )
        else:
            # No sharing tables - user can't access others' cases
            raise HTTPException(status_code=404, detail="Case not found")

    # Get vorderingen
    vord_response = db.table('vorderingen').select('*').eq('case_id', case_id).order('volgorde').execute()
    vorderingen = [VorderingResponse(**v) for v in vord_response.data]

    # Get deelbetalingen
    deel_response = db.table('deelbetalingen').select('*').eq('case_id', case_id).order('datum').execute()
    deelbetalingen = [DeelbetalingResponse(**d) for d in deel_response.data]

    return CaseWithLines(
        **case,
        vorderingen=vorderingen,
        deelbetalingen=deelbetalingen,
        sharing=sharing_info
    )


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(case_id: str, case: CaseCreate, user_id: str = Depends(get_current_user)):
    """Update a case."""
    db = get_db()

    # Verify ownership
    existing = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Case not found")

    update_data = {
        'naam': case.naam,
        'klant_referentie': case.klant_referentie,
        'einddatum': str(case.einddatum),
        'strategie': case.strategie,
    }

    response = db.table('cases').update(update_data).eq('id', case_id).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update case")

    return CaseResponse(**response.data[0])


@router.delete("/{case_id}")
async def delete_case(case_id: str, user_id: str = Depends(get_current_user)):
    """Delete a case and all its vorderingen and deelbetalingen."""
    db = get_db()

    # Verify ownership
    existing = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Case not found")

    # Delete case (cascades to vorderingen and deelbetalingen via FK)
    db.table('cases').delete().eq('id', case_id).execute()

    return {"status": "deleted"}


# Vorderingen routes

@router.post("/{case_id}/vorderingen", response_model=VorderingResponse)
async def create_vordering(case_id: str, vordering: VorderingCreate, user_id: str = Depends(get_current_user)):
    """Add a vordering to a case."""
    db = get_db()

    # Verify case edit permission (owner or edit share)
    if not can_edit_case(db, case_id, user_id):
        raise HTTPException(status_code=404, detail="Case not found")

    # Get current max volgorde
    max_volgorde = db.table('vorderingen').select('volgorde').eq('case_id', case_id).order('volgorde', desc=True).limit(1).execute()
    next_volgorde = (max_volgorde.data[0]['volgorde'] + 1) if max_volgorde.data else 0

    v_data = {
        'case_id': case_id,
        'kenmerk': vordering.kenmerk,
        'bedrag': float(vordering.bedrag),
        'datum': str(vordering.datum),
        'rentetype': vordering.rentetype,
        'kosten': float(vordering.kosten) if vordering.kosten else 0,
        'opslag': float(vordering.opslag) if vordering.opslag else None,
        'opslag_ingangsdatum': str(vordering.opslag_ingangsdatum) if vordering.opslag_ingangsdatum else None,
        'volgorde': next_volgorde,
    }

    response = db.table('vorderingen').insert(v_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create vordering")

    return VorderingResponse(**response.data[0])


@router.put("/vorderingen/{vordering_id}", response_model=VorderingResponse)
async def update_vordering(vordering_id: str, vordering: VorderingCreate, user_id: str = Depends(get_current_user)):
    """Update a vordering."""
    db = get_db()

    # Get vordering and verify edit permission via case
    v_response = db.table('vorderingen').select('case_id').eq('id', vordering_id).execute()
    if not v_response.data:
        raise HTTPException(status_code=404, detail="Vordering not found")

    if not can_edit_case(db, v_response.data[0]['case_id'], user_id):
        raise HTTPException(status_code=403, detail="Geen bewerkrechten")

    update_data = {
        'kenmerk': vordering.kenmerk,
        'bedrag': float(vordering.bedrag),
        'datum': str(vordering.datum),
        'rentetype': vordering.rentetype,
        'kosten': float(vordering.kosten) if vordering.kosten else 0,
        'opslag': float(vordering.opslag) if vordering.opslag else None,
        'opslag_ingangsdatum': str(vordering.opslag_ingangsdatum) if vordering.opslag_ingangsdatum else None,
    }

    response = db.table('vorderingen').update(update_data).eq('id', vordering_id).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update vordering")

    return VorderingResponse(**response.data[0])


@router.delete("/vorderingen/{vordering_id}")
async def delete_vordering(vordering_id: str, user_id: str = Depends(get_current_user)):
    """Delete a vordering."""
    db = get_db()

    # Get vordering and verify edit permission via case
    v_response = db.table('vorderingen').select('case_id').eq('id', vordering_id).execute()
    if not v_response.data:
        raise HTTPException(status_code=404, detail="Vordering not found")

    if not can_edit_case(db, v_response.data[0]['case_id'], user_id):
        raise HTTPException(status_code=403, detail="Geen bewerkrechten")

    db.table('vorderingen').delete().eq('id', vordering_id).execute()

    return {"status": "deleted"}


# Deelbetalingen routes

@router.post("/{case_id}/deelbetalingen", response_model=DeelbetalingResponse)
async def create_deelbetaling(case_id: str, deelbetaling: DeelbetalingCreate, user_id: str = Depends(get_current_user)):
    """Add a deelbetaling to a case."""
    db = get_db()

    # Verify case edit permission (owner or edit share)
    if not can_edit_case(db, case_id, user_id):
        raise HTTPException(status_code=404, detail="Case not found")

    # Get current max volgorde
    max_volgorde = db.table('deelbetalingen').select('volgorde').eq('case_id', case_id).order('volgorde', desc=True).limit(1).execute()
    next_volgorde = (max_volgorde.data[0]['volgorde'] + 1) if max_volgorde.data else 0

    d_data = {
        'case_id': case_id,
        'kenmerk': deelbetaling.kenmerk,
        'bedrag': float(deelbetaling.bedrag),
        'datum': str(deelbetaling.datum),
        'aangewezen': deelbetaling.aangewezen or [],
        'volgorde': next_volgorde,
    }

    response = db.table('deelbetalingen').insert(d_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create deelbetaling")

    return DeelbetalingResponse(**response.data[0])


@router.put("/deelbetalingen/{deelbetaling_id}", response_model=DeelbetalingResponse)
async def update_deelbetaling(deelbetaling_id: str, deelbetaling: DeelbetalingCreate, user_id: str = Depends(get_current_user)):
    """Update a deelbetaling."""
    db = get_db()

    # Get deelbetaling and verify edit permission via case
    d_response = db.table('deelbetalingen').select('case_id').eq('id', deelbetaling_id).execute()
    if not d_response.data:
        raise HTTPException(status_code=404, detail="Deelbetaling not found")

    if not can_edit_case(db, d_response.data[0]['case_id'], user_id):
        raise HTTPException(status_code=403, detail="Geen bewerkrechten")

    update_data = {
        'kenmerk': deelbetaling.kenmerk,
        'bedrag': float(deelbetaling.bedrag),
        'datum': str(deelbetaling.datum),
        'aangewezen': deelbetaling.aangewezen or [],
    }

    response = db.table('deelbetalingen').update(update_data).eq('id', deelbetaling_id).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update deelbetaling")

    return DeelbetalingResponse(**response.data[0])


@router.delete("/deelbetalingen/{deelbetaling_id}")
async def delete_deelbetaling(deelbetaling_id: str, user_id: str = Depends(get_current_user)):
    """Delete a deelbetaling."""
    db = get_db()

    # Get deelbetaling and verify edit permission via case
    d_response = db.table('deelbetalingen').select('case_id').eq('id', deelbetaling_id).execute()
    if not d_response.data:
        raise HTTPException(status_code=404, detail="Deelbetaling not found")

    if not can_edit_case(db, d_response.data[0]['case_id'], user_id):
        raise HTTPException(status_code=403, detail="Geen bewerkrechten")

    db.table('deelbetalingen').delete().eq('id', deelbetaling_id).execute()

    return {"status": "deleted"}
