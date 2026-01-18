"""
Snapshots API routes with Supabase integration
"""
from typing import List
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from app.models import SnapshotResponse
from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


@router.get("/case/{case_id}", response_model=List[SnapshotResponse])
async def list_snapshots(case_id: str, user_id: str = Depends(get_current_user)):
    """List all snapshots for a case."""
    db = get_db()

    # Verify case ownership
    case = db.table('cases').select('id').eq('id', case_id).eq('user_id', user_id).execute()
    if not case.data:
        raise HTTPException(status_code=404, detail="Case not found")

    response = db.table('snapshots').select('*').eq('case_id', case_id).order('created_at', desc=True).execute()

    return [SnapshotResponse(**s) for s in response.data]


@router.post("/case/{case_id}", response_model=SnapshotResponse)
async def create_snapshot(case_id: str, user_id: str = Depends(get_current_user)):
    """
    Create a new snapshot for a case.

    This runs the calculation on the current case data and saves:
    - The input (vorderingen + deelbetalingen)
    - The calculation result
    - Generated PDF (TODO)
    """
    from app.api.berekening import bereken_rente
    from app.models.berekening import BerekeningRequest, VorderingInput, DeelbetalingInput

    db = get_db()

    # Get case with ownership check
    case_response = db.table('cases').select('*').eq('id', case_id).eq('user_id', user_id).execute()
    if not case_response.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case = case_response.data[0]

    # Get vorderingen
    vord_response = db.table('vorderingen').select('*').eq('case_id', case_id).order('volgorde').execute()
    vorderingen = vord_response.data

    if not vorderingen:
        raise HTTPException(status_code=400, detail="Case has no vorderingen")

    # Get deelbetalingen
    deel_response = db.table('deelbetalingen').select('*').eq('case_id', case_id).order('datum').execute()
    deelbetalingen = deel_response.data

    # Build calculation request
    berekening_request = BerekeningRequest(
        einddatum=case['einddatum'],
        strategie=case['strategie'],
        vorderingen=[
            VorderingInput(
                kenmerk=v['kenmerk'],
                bedrag=v['bedrag'],
                datum=v['datum'],
                rentetype=v['rentetype'],
                kosten=v['kosten'],
                opslag=v.get('opslag'),
                opslag_ingangsdatum=v.get('opslag_ingangsdatum'),
            )
            for v in vorderingen
        ],
        deelbetalingen=[
            DeelbetalingInput(
                kenmerk=d.get('kenmerk'),
                bedrag=d['bedrag'],
                datum=d['datum'],
                aangewezen=d.get('aangewezen', []),
            )
            for d in deelbetalingen
        ],
    )

    # Run calculation
    result = await bereken_rente(berekening_request)

    # Serialize for storage
    invoer_json = {
        'case': {
            'naam': case['naam'],
            'einddatum': str(case['einddatum']),
            'strategie': case['strategie'],
        },
        'vorderingen': [
            {
                'kenmerk': v['kenmerk'],
                'bedrag': str(v['bedrag']),
                'datum': str(v['datum']),
                'rentetype': v['rentetype'],
                'kosten': str(v['kosten']),
                'opslag': str(v['opslag']) if v.get('opslag') else None,
                'opslag_ingangsdatum': str(v['opslag_ingangsdatum']) if v.get('opslag_ingangsdatum') else None,
            }
            for v in vorderingen
        ],
        'deelbetalingen': [
            {
                'kenmerk': d.get('kenmerk'),
                'bedrag': str(d['bedrag']),
                'datum': str(d['datum']),
                'aangewezen': d.get('aangewezen', []),
            }
            for d in deelbetalingen
        ],
    }

    # Convert result to dict
    resultaat_json = result.model_dump(mode='json')

    snapshot_data = {
        'case_id': case_id,
        'einddatum': str(case['einddatum']),
        'totaal_openstaand': float(result.totalen.openstaand),
        'pdf_url': None,
        'invoer_json': invoer_json,
        'resultaat_json': resultaat_json,
    }

    response = db.table('snapshots').insert(snapshot_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create snapshot")

    return SnapshotResponse(**response.data[0])


@router.get("/{snapshot_id}", response_model=dict)
async def get_snapshot(snapshot_id: str, user_id: str = Depends(get_current_user)):
    """Get full snapshot data including invoer and resultaat."""
    db = get_db()

    # Get snapshot with case ownership check
    response = db.table('snapshots').select('*, cases!inner(user_id)').eq('id', snapshot_id).execute()

    if not response.data or response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    snapshot = response.data[0]

    return {
        'id': snapshot['id'],
        'created_at': snapshot['created_at'],
        'einddatum': snapshot['einddatum'],
        'totaal_openstaand': snapshot['totaal_openstaand'],
        'invoer': snapshot['invoer_json'],
        'resultaat': snapshot['resultaat_json'],
    }


@router.get("/{snapshot_id}/pdf")
async def get_snapshot_pdf(snapshot_id: str, user_id: str = Depends(get_current_user)):
    """Download snapshot as PDF."""
    from app.services.pdf_generator import generate_pdf
    from datetime import datetime

    db = get_db()

    # Get snapshot with case ownership check
    response = db.table('snapshots').select('*, cases!inner(user_id)').eq('id', snapshot_id).execute()

    if not response.data or response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    snapshot = response.data[0]

    # Parse created_at for filename
    created_at = datetime.fromisoformat(snapshot['created_at'].replace('Z', '+00:00'))

    # Generate PDF
    pdf_bytes = generate_pdf(
        invoer=snapshot['invoer_json'],
        resultaat=snapshot['resultaat_json'],
        snapshot_created=created_at,
    )

    filename = f"renteberekening_{snapshot['invoer_json']['case']['naam'].replace(' ', '_')}_{created_at.strftime('%Y%m%d_%H%M')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.delete("/{snapshot_id}")
async def delete_snapshot(snapshot_id: str, user_id: str = Depends(get_current_user)):
    """Delete a snapshot."""
    db = get_db()

    # Get snapshot with case ownership check
    response = db.table('snapshots').select('*, cases!inner(user_id)').eq('id', snapshot_id).execute()

    if not response.data or response.data[0]['cases']['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    db.table('snapshots').delete().eq('id', snapshot_id).execute()

    return {"status": "deleted"}
