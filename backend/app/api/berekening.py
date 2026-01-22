"""
Berekening API routes
"""
from decimal import Decimal
from fastapi import APIRouter, HTTPException

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
                    hoofdsom=p['hoofdsom'],
                    rente_pct=p['rente_pct'],
                    rente=p['rente'],
                    is_kapitalisatie=p.get('is_kapitalisatie', False),
                    is_pauze=p.get('is_pauze', False),
                )
                for p in v.periodes
            ]

            # Periodes voor kosten
            periodes_kosten = [
                PeriodeKosten(
                    start=p['start'],
                    eind=p['eind'],
                    dagen=p['dagen'],
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
