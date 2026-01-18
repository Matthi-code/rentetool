"""
Cases API routes with Supabase integration
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends

from app.models import (
    CaseCreate, CaseResponse, CaseWithLines,
    VorderingCreate, VorderingResponse,
    DeelbetalingCreate, DeelbetalingResponse
)
from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


@router.get("", response_model=List[CaseResponse])
async def list_cases(user_id: str = Depends(get_current_user)):
    """List all cases for the current user."""
    db = get_db()

    response = db.table('cases').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()

    return [CaseResponse(**row) for row in response.data]


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
    case_response = db.table('cases').select('*').eq('id', case_id).eq('user_id', user_id).execute()

    if not case_response.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case = case_response.data[0]

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

    # Verify case ownership
    case = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not case.data:
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

    # Get vordering and verify ownership via case
    v_response = db.table('vorderingen').select('*, cases!inner(user_id)').eq('id', vordering_id).execute()
    if not v_response.data or v_response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Vordering not found")

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

    # Get vordering and verify ownership via case
    v_response = db.table('vorderingen').select('*, cases!inner(user_id)').eq('id', vordering_id).execute()
    if not v_response.data or v_response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Vordering not found")

    db.table('vorderingen').delete().eq('id', vordering_id).execute()

    return {"status": "deleted"}


# Deelbetalingen routes

@router.post("/{case_id}/deelbetalingen", response_model=DeelbetalingResponse)
async def create_deelbetaling(case_id: str, deelbetaling: DeelbetalingCreate, user_id: str = Depends(get_current_user)):
    """Add a deelbetaling to a case."""
    db = get_db()

    # Verify case ownership
    case = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not case.data:
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

    # Get deelbetaling and verify ownership via case
    d_response = db.table('deelbetalingen').select('*, cases!inner(user_id)').eq('id', deelbetaling_id).execute()
    if not d_response.data or d_response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Deelbetaling not found")

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

    # Get deelbetaling and verify ownership via case
    d_response = db.table('deelbetalingen').select('*, cases!inner(user_id)').eq('id', deelbetaling_id).execute()
    if not d_response.data or d_response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Deelbetaling not found")

    db.table('deelbetalingen').delete().eq('id', deelbetaling_id).execute()

    return {"status": "deleted"}
