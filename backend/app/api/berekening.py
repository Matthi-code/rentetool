"""
Berekening API routes
"""
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel

from app.models.berekening import (
    BerekeningRequest,
    BerekeningResponse,
    VorderingResultaat,
    DeelbetalingResultaat,
    Periode,
    PeriodeKosten,
    Toerekening,
    Totalen,
)
from app.auth import get_current_user
from app.services.rente_calculator import (
    RenteCalculator,
    Vordering as CalcVordering,
    Deelbetaling as CalcDeelbetaling,
)

router = APIRouter()


@router.post("/bereken", response_model=BerekeningResponse)
async def bereken_rente(request: BerekeningRequest):
    """
    Voer een renteberekening uit.

    Dit endpoint voert een volledige renteberekening uit op basis van:
    - Vorderingen met hun startdatum en rentetype
    - Deelbetalingen met toerekening
    - Einddatum voor de berekening
    - Strategie (A = meest bezwarend, B = oudste eerst)

    Returns een gedetailleerd resultaat met:
    - Resultaat per vordering (inclusief alle renteperiodes)
    - Verwerking van deelbetalingen
    - Totalen
    - Controleberekening
    """
    try:
        # Convert input models to calculator objects
        vorderingen = [
            CalcVordering(
                kenmerk=v.kenmerk,
                oorspronkelijk_bedrag=v.bedrag,
                startdatum=v.datum,
                rentetype=v.rentetype,
                item_type=v.item_type,
                kosten=v.kosten,
                kosten_rentedatum=v.kosten_rentedatum,
                opslag=v.opslag or Decimal("0"),
                opslag_ingangsdatum=v.opslag_ingangsdatum,
                pauze_start=v.pauze_start,
                pauze_eind=v.pauze_eind,
                betaaltermijn_dagen=v.betaaltermijn_dagen,
                bodemrente=v.bodemrente,
            )
            for v in request.vorderingen
        ]

        deelbetalingen = [
            CalcDeelbetaling(
                kenmerk=d.kenmerk or f"BET-{i+1}",
                bedrag=d.bedrag,
                datum=d.datum,
                aangewezen_vorderingen=d.aangewezen,
            )
            for i, d in enumerate(request.deelbetalingen)
        ]

        # Run calculation
        calculator = RenteCalculator(vorderingen, deelbetalingen, request.einddatum)
        result = calculator.bereken()

        # Convert results to response model
        vordering_resultaten = []
        totaal_oorspronkelijk = Decimal("0")
        totaal_kosten = Decimal("0")
        totaal_rente = Decimal("0")
        totaal_rente_kosten = Decimal("0")
        totaal_afl_hs = Decimal("0")
        totaal_afl_kst = Decimal("0")
        totaal_afl_rnt = Decimal("0")
        totaal_afl_rnt_kosten = Decimal("0")
        totaal_openstaand = Decimal("0")

        for v in result['vorderingen'].values():
            periodes = [
                Periode(
                    start=p['start'],
                    eind=p['eind'],
                    dagen=p['dagen'],
                    dagen_jaar=p.get('dagen_jaar', 365),
                    hoofdsom=p['hoofdsom'],
                    rente_pct=p['rente_pct'],
                    rente=p['rente'],
                    is_kapitalisatie=p.get('is_kapitalisatie', False),
                    is_pauze=p.get('is_pauze', False),
                    is_betaaltermijn=p.get('is_betaaltermijn', False),
                )
                for p in v.periodes
            ]

            # Periodes voor kosten
            periodes_kosten = [
                PeriodeKosten(
                    start=p['start'],
                    eind=p['eind'],
                    dagen=p['dagen'],
                    dagen_jaar=p.get('dagen_jaar', 365),
                    kosten=p['kosten'],
                    rente_pct=p['rente_pct'],
                    rente=p['rente'],
                    is_pauze=p.get('is_pauze', False),
                )
                for p in v.periodes_kosten
            ]

            # Bepaal of kosten een afwijkende rentedatum hebben
            kosten_rentedatum = v.kosten_rentedatum if v.kosten > 0 and v.kosten_rentedatum != v.startdatum else None

            vordering_resultaten.append(VorderingResultaat(
                item_type=v.item_type,
                kenmerk=v.kenmerk,
                oorspronkelijk_bedrag=v.oorspronkelijk_bedrag,
                kosten=v.kosten,
                kosten_rentedatum=kosten_rentedatum,
                totale_rente=v.totale_rente,
                totale_rente_kosten=v.totale_rente_kosten,
                afgelost_hoofdsom=v.afgelost_hoofdsom,
                afgelost_kosten=v.afgelost_kosten,
                afgelost_rente=v.afgelost_rente,
                afgelost_rente_kosten=v.afgelost_rente_kosten,
                openstaand=v.openstaand,
                status="VOLDAAN" if v.voldaan else "OPEN",
                voldaan_datum=v.voldaan_datum,
                pauze_start=v.pauze_start,
                pauze_eind=v.pauze_eind,
                periodes=periodes,
                periodes_kosten=periodes_kosten,
            ))

            totaal_oorspronkelijk += v.oorspronkelijk_bedrag
            totaal_kosten += v.kosten
            totaal_rente += v.totale_rente
            totaal_rente_kosten += v.totale_rente_kosten
            totaal_afl_hs += v.afgelost_hoofdsom
            totaal_afl_kst += v.afgelost_kosten
            totaal_afl_rnt += v.afgelost_rente
            totaal_afl_rnt_kosten += v.afgelost_rente_kosten
            totaal_openstaand += v.openstaand

        # Deelbetaling results
        deelbetaling_resultaten = [
            DeelbetalingResultaat(
                kenmerk=d.kenmerk,
                bedrag=d.bedrag,
                datum=d.datum,
                verwerkt=d.verwerkt,
                toerekeningen=[
                    Toerekening(
                        vordering=t['vordering'],
                        type=t['type'],
                        bedrag=t['bedrag'],
                    )
                    for t in d.toerekeningen
                ],
            )
            for d in result['deelbetalingen']
        ]

        # Totals
        totalen = Totalen(
            oorspronkelijk=totaal_oorspronkelijk,
            kosten=totaal_kosten,
            rente=totaal_rente,
            rente_kosten=totaal_rente_kosten,
            afgelost_hoofdsom=totaal_afl_hs,
            afgelost_kosten=totaal_afl_kst,
            afgelost_rente=totaal_afl_rnt,
            afgelost_rente_kosten=totaal_afl_rnt_kosten,
            openstaand=totaal_openstaand,
        )

        # Control calculation
        # Use actual amounts applied (not just payment amounts, which may exceed debt)
        totaal_afgelost = totaal_afl_hs + totaal_afl_kst + totaal_afl_rnt + totaal_afl_rnt_kosten
        controle = totaal_oorspronkelijk + totaal_kosten + totaal_rente + totaal_rente_kosten - totaal_afgelost
        controle_ok = abs(controle - totaal_openstaand) < Decimal("0.02")

        return BerekeningResponse(
            einddatum=request.einddatum,
            strategie=request.strategie,
            vorderingen=vordering_resultaten,
            deelbetalingen=deelbetaling_resultaten,
            totalen=totalen,
            controle_ok=controle_ok,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bereken/pdf")
async def bereken_rente_pdf(request: BerekeningRequest, user_id: str = Depends(get_current_user)):
    """
    Calculate and generate PDF directly (without saving a snapshot).
    Free users get a watermarked PDF, Pro users get a clean one.
    """
    from app.services.pdf_generator import generate_pdf
    from app.services.subscription import get_user_tier
    from app.db.supabase import get_supabase_client

    # Run calculation
    result = await bereken_rente(request)

    # Check tier for watermark
    db = get_supabase_client()
    tier = get_user_tier(user_id, db)
    watermark = not tier.mag_pdf_schoon

    # Build invoer structure for PDF
    invoer = {
        'case': {
            'naam': 'Renteberekening',
            'einddatum': str(request.einddatum),
            'strategie': request.strategie,
        },
        'vorderingen': [
            {
                'item_type': getattr(v, 'item_type', 'vordering'),
                'kenmerk': v.kenmerk,
                'bedrag': str(v.bedrag),
                'datum': str(v.datum),
                'rentetype': v.rentetype,
                'kosten': str(v.kosten or 0),
                'opslag': str(v.opslag) if v.opslag else None,
                'opslag_ingangsdatum': str(v.opslag_ingangsdatum) if v.opslag_ingangsdatum else None,
                'pauze_start': str(v.pauze_start) if v.pauze_start else None,
                'pauze_eind': str(v.pauze_eind) if v.pauze_eind else None,
                'betaaltermijn_dagen': v.betaaltermijn_dagen,
                'kosten_categorie': v.kosten_categorie,
            }
            for v in request.vorderingen
        ],
        'deelbetalingen': [
            {
                'kenmerk': d.kenmerk,
                'bedrag': str(d.bedrag),
                'datum': str(d.datum),
                'aangewezen': d.aangewezen or [],
            }
            for d in request.deelbetalingen
        ],
    }

    resultaat = result.model_dump(mode='json')
    now = datetime.now()

    try:
        pdf_bytes = generate_pdf(
            invoer=invoer,
            resultaat=resultaat,
            snapshot_created=now,
            watermark=watermark,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generatie mislukt: {str(e)}")

    filename = f"renteberekening_{now.strftime('%Y%m%d_%H%M')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


class BikRequest(BaseModel):
    """Request for BIK calculation."""
    hoofdsom: Decimal


class BikResponse(BaseModel):
    """Response for BIK calculation."""
    hoofdsom: Decimal
    bik: Decimal


@router.post("/bik/bereken", response_model=BikResponse)
async def bereken_bik_endpoint(request: BikRequest):
    """Bereken buitengerechtelijke incassokosten (BIK) conform wettelijke staffel."""
    from app.services.bik_calculator import bereken_bik

    if request.hoofdsom <= 0:
        raise HTTPException(status_code=400, detail="Hoofdsom moet positief zijn")

    bik = bereken_bik(request.hoofdsom)
    return BikResponse(hoofdsom=request.hoofdsom, bik=bik)


@router.post("/bereken/excel")
async def bereken_rente_excel(request: BerekeningRequest, user_id: str = Depends(get_current_user)):
    """
    Calculate and generate Excel directly.
    Pro users only.
    """
    from app.services.excel_generator import generate_excel
    from app.services.subscription import get_user_tier
    from app.db.supabase import get_supabase_client

    # Check Pro tier
    db = get_supabase_client()
    tier = get_user_tier(user_id, db)
    if not tier.mag_pdf_schoon:
        raise HTTPException(status_code=403, detail="Excel export is een Pro-functie")

    # Run calculation
    result = await bereken_rente(request)

    # Build invoer structure for Excel
    invoer = {
        'case': {
            'naam': 'Renteberekening',
            'einddatum': str(request.einddatum),
            'strategie': request.strategie,
        },
        'vorderingen': [
            {
                'item_type': getattr(v, 'item_type', 'vordering'),
                'kenmerk': v.kenmerk,
                'bedrag': str(v.bedrag),
                'datum': str(v.datum),
                'rentetype': v.rentetype,
            }
            for v in request.vorderingen
        ],
    }

    resultaat = result.model_dump(mode='json')

    try:
        excel_bytes = generate_excel(invoer=invoer, resultaat=resultaat)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Excel generatie mislukt: {str(e)}")

    now = datetime.now()
    filename = f"renteberekening_{now.strftime('%Y%m%d_%H%M')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
