"""
Rentetool - Wettelijke Rente Calculator
========================================
Nederlandse wettelijke rente calculator conform Burgerlijk Wetboek.

Gebaseerd op de referentie-implementatie met correcties voor:
1. Periodesplitsing op rentewijzigingsdata
2. Kapitalisatie op verjaardagen
3. Betalingstoerekening conform art. 6:43/6:44 BW
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from dataclasses import dataclass, field
from typing import List, Dict, Optional


# =============================================================================
# RENTETABEL
# =============================================================================

RENTETABEL = [
    # (datum, wettelijk%, handels%)
    (date(2027, 1, 1), Decimal("0.04"), Decimal("0.1015")),
    (date(2026, 1, 1), Decimal("0.04"), Decimal("0.1015")),
    (date(2025, 7, 1), Decimal("0.06"), Decimal("0.1015")),
    (date(2025, 1, 1), Decimal("0.06"), Decimal("0.1115")),
    (date(2024, 7, 1), Decimal("0.07"), Decimal("0.1225")),
    (date(2024, 1, 1), Decimal("0.07"), Decimal("0.125")),
    (date(2023, 7, 1), Decimal("0.06"), Decimal("0.12")),
    (date(2023, 1, 1), Decimal("0.04"), Decimal("0.105")),
    (date(2022, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2021, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2021, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2020, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2020, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2019, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2019, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2018, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2018, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2017, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2017, 1, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2016, 7, 1), Decimal("0.02"), Decimal("0.08")),
    (date(2016, 1, 1), Decimal("0.02"), Decimal("0.0805")),
    (date(2015, 7, 1), Decimal("0.02"), Decimal("0.0805")),
    (date(2015, 1, 1), Decimal("0.02"), Decimal("0.0805")),
    (date(2014, 7, 1), Decimal("0.03"), Decimal("0.0815")),
    (date(2014, 1, 1), Decimal("0.03"), Decimal("0.0825")),
    (date(2013, 7, 1), Decimal("0.03"), Decimal("0.085")),
    (date(2013, 3, 16), Decimal("0.03"), Decimal("0.0875")),
    (date(2013, 1, 1), Decimal("0.03"), Decimal("0.0775")),
    (date(2012, 7, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2012, 1, 1), Decimal("0.04"), Decimal("0.08")),
    (date(2011, 7, 1), Decimal("0.04"), Decimal("0.0825")),
    (date(2011, 1, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2010, 7, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2010, 1, 1), Decimal("0.03"), Decimal("0.08")),
    (date(2009, 7, 1), Decimal("0.04"), Decimal("0.08")),
    (date(2009, 1, 1), Decimal("0.06"), Decimal("0.095")),
    (date(2008, 7, 1), Decimal("0.06"), Decimal("0.1107")),
    (date(2008, 1, 1), Decimal("0.06"), Decimal("0.112")),
    (date(2007, 7, 1), Decimal("0.06"), Decimal("0.1107")),
    (date(2007, 1, 1), Decimal("0.06"), Decimal("0.1058")),
    (date(2006, 7, 1), Decimal("0.04"), Decimal("0.0983")),
    (date(2006, 1, 1), Decimal("0.04"), Decimal("0.0925")),
    (date(2005, 7, 1), Decimal("0.04"), Decimal("0.0905")),
    (date(2005, 1, 1), Decimal("0.04"), Decimal("0.0909")),
    (date(2004, 7, 1), Decimal("0.04"), Decimal("0.0901")),
    (date(2004, 2, 1), Decimal("0.04"), Decimal("0.0902")),
    (date(2004, 1, 1), Decimal("0.05"), Decimal("0.0902")),
]

# Extraheer alle rentewijzigingsdata
RENTE_WIJZIGINGSDATA = sorted(set(d[0] for d in RENTETABEL))


def get_rente_percentage(datum: date, is_handelsrente: bool, opslag: Decimal = Decimal("0")) -> Decimal:
    """Haal het geldende rentepercentage op voor een datum, inclusief eventuele opslag."""
    for rente_datum, wet, handel in RENTETABEL:
        if datum >= rente_datum:
            basis = handel if is_handelsrente else wet
            return basis + opslag
    basis = RENTETABEL[-1][2 if is_handelsrente else 1]
    return basis + opslag


def get_volgende_rentewijziging(na_datum: date, voor_datum: date) -> Optional[date]:
    """Vind de eerstvolgende rentewijzigingsdatum na na_datum en voor voor_datum."""
    for wijziging in RENTE_WIJZIGINGSDATA:
        if na_datum < wijziging < voor_datum:
            return wijziging
    return None


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Vordering:
    """Een vordering met renteberekening."""
    kenmerk: str
    oorspronkelijk_bedrag: Decimal
    startdatum: date
    rentetype: int  # 1-7
    item_type: str = 'vordering'  # 'vordering' or 'kosten'
    kosten: Decimal = Decimal("0")
    kosten_rentedatum: Optional[date] = None  # Aparte rentedatum voor kosten
    opslag: Decimal = Decimal("0")  # Voor type 6 en 7
    opslag_ingangsdatum: Optional[date] = None  # Default: startdatum
    pauze_start: Optional[date] = None  # Start of interest pause
    pauze_eind: Optional[date] = None  # End of interest pause

    # Huidige staat
    hoofdsom: Decimal = field(default=Decimal("0"))
    openstaande_kosten: Decimal = field(default=Decimal("0"))
    opgebouwde_rente: Decimal = field(default=Decimal("0"))  # Rente op hoofdsom
    opgebouwde_rente_kosten: Decimal = field(default=Decimal("0"))  # Rente op kosten
    totale_rente: Decimal = field(default=Decimal("0"))  # Totale rente hoofdsom
    totale_rente_kosten: Decimal = field(default=Decimal("0"))  # Totale rente kosten
    voldaan: bool = False
    voldaan_datum: Optional[date] = None

    # Aflossingen
    afgelost_hoofdsom: Decimal = field(default=Decimal("0"))
    afgelost_kosten: Decimal = field(default=Decimal("0"))
    afgelost_rente: Decimal = field(default=Decimal("0"))  # Rente op hoofdsom
    afgelost_rente_kosten: Decimal = field(default=Decimal("0"))  # Rente op kosten

    # Detail logging
    periodes: List[Dict] = field(default_factory=list)
    periodes_kosten: List[Dict] = field(default_factory=list)  # Periodes voor kosten
    events: List[Dict] = field(default_factory=list)

    # Track laatste berekende datum
    laatst_berekend_tot: Optional[date] = None
    laatst_berekend_tot_kosten: Optional[date] = None

    def __post_init__(self):
        self.hoofdsom = self.oorspronkelijk_bedrag
        self.openstaande_kosten = self.kosten
        if self.opslag_ingangsdatum is None:
            self.opslag_ingangsdatum = self.startdatum
        # Kosten rentedatum default naar startdatum als niet opgegeven
        if self.kosten_rentedatum is None:
            self.kosten_rentedatum = self.startdatum
        self.laatst_berekend_tot = self.startdatum
        self.laatst_berekend_tot_kosten = self.kosten_rentedatum

    @property
    def is_samengesteld(self) -> bool:
        return self.rentetype in (1, 2, 6, 7)

    @property
    def is_handelsrente(self) -> bool:
        return self.rentetype in (2, 4, 7)

    @property
    def openstaand(self) -> Decimal:
        return self.hoofdsom + self.openstaande_kosten + self.opgebouwde_rente + self.opgebouwde_rente_kosten

    def is_in_pauze(self, datum: date) -> bool:
        """Check if a date falls within the pause period."""
        if self.pauze_start and self.pauze_eind:
            return self.pauze_start <= datum < self.pauze_eind
        return False

    def get_rente_pct(self, datum: date) -> Decimal:
        """Haal rentepercentage op voor deze vordering op een datum."""
        if self.rentetype == 5:
            # Contractueel vast percentage - gebruik opslag als het vaste percentage
            return self.opslag
        elif self.rentetype in (6, 7):
            # Wettelijke/handelsrente + opslag
            opslag = self.opslag if datum >= self.opslag_ingangsdatum else Decimal("0")
            return get_rente_percentage(datum, self.is_handelsrente, opslag)
        else:
            # Standaard wettelijke of handelsrente
            return get_rente_percentage(datum, self.is_handelsrente)


@dataclass
class Deelbetaling:
    """Een ontvangen betaling."""
    kenmerk: str
    bedrag: Decimal
    datum: date
    aangewezen_vorderingen: List[str] = field(default_factory=list)

    verwerkt: Decimal = field(default=Decimal("0"))
    toerekeningen: List[Dict] = field(default_factory=list)


# =============================================================================
# HULPFUNCTIES
# =============================================================================

def verjaardag(start_datum: date, jaar: int) -> date:
    """Bereken verjaardag in een specifiek jaar, handle 29 feb."""
    try:
        return date(jaar, start_datum.month, start_datum.day)
    except ValueError:
        return date(jaar, start_datum.month, 28)


def bereken_rente(hoofdsom: Decimal, rente_pct: Decimal, dagen: int) -> Decimal:
    """Bereken rentebedrag."""
    if dagen <= 0 or hoofdsom <= 0:
        return Decimal("0")
    rente = hoofdsom * rente_pct * Decimal(dagen) / Decimal(365)
    return rente.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# =============================================================================
# RENTE CALCULATOR
# =============================================================================

class RenteCalculator:
    """Calculator for Dutch statutory interest."""

    def __init__(self, vorderingen: List[Vordering], deelbetalingen: List[Deelbetaling], einddatum: date):
        self.vorderingen = {v.kenmerk: v for v in vorderingen}
        self.deelbetalingen = sorted(deelbetalingen, key=lambda d: d.datum)
        # Einddatum is inclusief (t/m), dus +1 dag voor interne berekening (exclusief)
        self.einddatum = einddatum + timedelta(days=1)
        self.einddatum_display = einddatum  # Originele datum voor weergave
        self.events = []

    def get_actieve_vorderingen(self, datum: date) -> List[Vordering]:
        """Haal alle actieve (niet-voldane) vorderingen op die al gestart zijn."""
        return [v for v in self.vorderingen.values()
                if v.startdatum <= datum and not v.voldaan]

    def get_meest_bezwarend(self, datum: date, vorderingen: List[Vordering]) -> Vordering:
        """Bepaal meest bezwarende vordering (hoogste rente%)."""
        return max(vorderingen, key=lambda v: v.get_rente_pct(datum))

    def get_splitpunten(self, vordering: Vordering, van_datum: date, tot_datum: date) -> List[date]:
        """
        Bepaal alle splitpunten tussen twee data:
        - Rentewijzigingsdata
        - Verjaardagen (voor kapitalisatie)
        - Pauze grenzen (start en eind)
        """
        splitpunten = set()

        # Voeg rentewijzigingsdata toe
        for wijziging in RENTE_WIJZIGINGSDATA:
            if van_datum < wijziging < tot_datum:
                splitpunten.add(wijziging)

        # Voeg verjaardagen toe (voor samengestelde rente)
        if vordering.is_samengesteld:
            jaar = van_datum.year
            while True:
                jaar += 1
                vj = verjaardag(vordering.startdatum, jaar)
                if vj >= tot_datum:
                    break
                if vj > van_datum:
                    splitpunten.add(vj)

        # Voeg pauze grenzen toe
        if vordering.pauze_start and van_datum < vordering.pauze_start < tot_datum:
            splitpunten.add(vordering.pauze_start)
        if vordering.pauze_eind and van_datum < vordering.pauze_eind < tot_datum:
            splitpunten.add(vordering.pauze_eind)

        return sorted(splitpunten)

    def bereken_rente_kosten_tot_datum(self, vordering: Vordering, tot_datum: date):
        """
        Bereken rente over openstaande kosten tot een bepaalde datum.
        Kosten hebben hun eigen rentedatum (kosten_rentedatum).
        Respecteert pauze periodes (geen rente tijdens pauze).
        """
        if vordering.voldaan or vordering.openstaande_kosten <= 0:
            return
        if vordering.kosten_rentedatum >= tot_datum:
            return

        huidige_datum = vordering.laatst_berekend_tot_kosten
        if huidige_datum >= tot_datum:
            return

        # Haal splitpunten op (alleen rentewijzigingen + pauze grenzen, geen kapitalisatie voor kosten)
        splitpunten = []
        for wijziging in RENTE_WIJZIGINGSDATA:
            if huidige_datum < wijziging < tot_datum:
                splitpunten.append(wijziging)
        # Add pause boundaries
        if vordering.pauze_start and huidige_datum < vordering.pauze_start < tot_datum:
            splitpunten.append(vordering.pauze_start)
        if vordering.pauze_eind and huidige_datum < vordering.pauze_eind < tot_datum:
            splitpunten.append(vordering.pauze_eind)
        splitpunten.append(tot_datum)
        splitpunten = sorted(set(splitpunten))

        for splitpunt in splitpunten:
            if huidige_datum >= splitpunt:
                continue

            # Check if this period is in a pause
            is_in_pauze = vordering.is_in_pauze(huidige_datum)

            dagen = (splitpunt - huidige_datum).days
            rente_pct = vordering.get_rente_pct(huidige_datum)

            if is_in_pauze:
                # No interest during pause
                rente = Decimal("0")
                vordering.periodes_kosten.append({
                    'start': huidige_datum,
                    'eind': splitpunt,
                    'dagen': dagen,
                    'kosten': vordering.openstaande_kosten,
                    'rente_pct': Decimal("0"),
                    'rente': Decimal("0"),
                    'opgebouwd': vordering.opgebouwde_rente_kosten,
                    'is_pauze': True
                })
            else:
                rente = bereken_rente(vordering.openstaande_kosten, rente_pct, dagen)
                vordering.opgebouwde_rente_kosten += rente
                vordering.totale_rente_kosten += rente

                vordering.periodes_kosten.append({
                    'start': huidige_datum,
                    'eind': splitpunt,
                    'dagen': dagen,
                    'kosten': vordering.openstaande_kosten,
                    'rente_pct': rente_pct,
                    'rente': rente,
                    'opgebouwd': vordering.opgebouwde_rente_kosten,
                    'is_pauze': False
                })

            huidige_datum = splitpunt

        vordering.laatst_berekend_tot_kosten = tot_datum

    def bereken_rente_tot_datum(self, vordering: Vordering, tot_datum: date):
        """
        Bereken rente voor een vordering tot een bepaalde datum.
        Splitst periodes op rentewijzigingsdata.
        Berekent ook rente op kosten apart.
        Respecteert pauze periodes (geen rente tijdens pauze).
        """
        if vordering.voldaan or vordering.startdatum >= tot_datum:
            return

        # Bereken rente op kosten apart
        self.bereken_rente_kosten_tot_datum(vordering, tot_datum)

        # Start vanaf laatste berekende datum voor hoofdsom
        huidige_datum = vordering.laatst_berekend_tot

        if huidige_datum >= tot_datum:
            return

        # Haal alle splitpunten op
        splitpunten = self.get_splitpunten(vordering, huidige_datum, tot_datum)
        splitpunten.append(tot_datum)  # Voeg einddatum toe

        for splitpunt in splitpunten:
            if huidige_datum >= splitpunt:
                continue

            # Check if this period starts in a pause
            is_in_pauze = vordering.is_in_pauze(huidige_datum)

            # Check if this is the start of a pause (capitalize accrued interest)
            is_pauze_start = (
                vordering.pauze_start and
                splitpunt == vordering.pauze_start and
                vordering.is_samengesteld and
                vordering.opgebouwde_rente > 0
            )

            # Bepaal of dit een kapitalisatiemoment is (verjaardag)
            is_verjaardag = (
                vordering.is_samengesteld and
                splitpunt.month == vordering.startdatum.month and
                splitpunt.day == vordering.startdatum.day and
                splitpunt < tot_datum and
                not is_in_pauze  # No kapitalisatie during pause
            )

            # Calculate interest for this subperiod (only if not in pause)
            dagen = (splitpunt - huidige_datum).days
            rente_pct = vordering.get_rente_pct(huidige_datum)

            if is_in_pauze:
                # No interest during pause
                rente = Decimal("0")
                vordering.periodes.append({
                    'start': huidige_datum,
                    'eind': splitpunt,
                    'dagen': dagen,
                    'hoofdsom': vordering.hoofdsom,
                    'rente_pct': Decimal("0"),
                    'rente': Decimal("0"),
                    'opgebouwd': vordering.opgebouwde_rente,
                    'is_kapitalisatie': False,
                    'is_pauze': True
                })
            else:
                # Normal interest calculation
                rente = bereken_rente(vordering.hoofdsom, rente_pct, dagen)
                vordering.opgebouwde_rente += rente
                vordering.totale_rente += rente

                vordering.periodes.append({
                    'start': huidige_datum,
                    'eind': splitpunt,
                    'dagen': dagen,
                    'hoofdsom': vordering.hoofdsom,
                    'rente_pct': rente_pct,
                    'rente': rente,
                    'opgebouwd': vordering.opgebouwde_rente,
                    'is_kapitalisatie': is_verjaardag,
                    'is_pauze': False
                })

            # Kapitalisatie at pause start (before entering pause)
            if is_pauze_start and not is_in_pauze:
                vordering.events.append({
                    'type': 'kapitalisatie_pauze',
                    'datum': splitpunt,
                    'rente': vordering.opgebouwde_rente,
                    'oude_hoofdsom': vordering.hoofdsom,
                    'nieuwe_hoofdsom': vordering.hoofdsom + vordering.opgebouwde_rente
                })
                vordering.hoofdsom += vordering.opgebouwde_rente
                vordering.opgebouwde_rente = Decimal("0")

            # Kapitalisatie op verjaardag
            elif is_verjaardag:
                vordering.events.append({
                    'type': 'kapitalisatie',
                    'datum': splitpunt,
                    'rente': vordering.opgebouwde_rente,
                    'oude_hoofdsom': vordering.hoofdsom,
                    'nieuwe_hoofdsom': vordering.hoofdsom + vordering.opgebouwde_rente
                })
                vordering.hoofdsom += vordering.opgebouwde_rente
                vordering.opgebouwde_rente = Decimal("0")

            huidige_datum = splitpunt

        vordering.laatst_berekend_tot = tot_datum

    def _verdeel_evenredig(self, bedrag: Decimal, vorderingen: List[Vordering],
                            get_openstaand, set_openstaand, add_afgelost,
                            betaling: Deelbetaling, toerekening_type: str) -> Decimal:
        """
        Verdeel een bedrag evenredig over meerdere vorderingen.
        Returns: restant na verdeling.
        """
        if bedrag <= 0:
            return bedrag

        # Bereken totaal openstaand voor dit component
        totaal_openstaand = sum(get_openstaand(v) for v in vorderingen)
        if totaal_openstaand <= 0:
            return bedrag

        # Bepaal hoeveel we kunnen aflossen
        te_verdelen = min(bedrag, totaal_openstaand)
        restant = bedrag

        # Verdeel evenredig op basis van aandeel in totaal
        for vordering in vorderingen:
            openstaand = get_openstaand(vordering)
            if openstaand <= 0:
                continue

            # Bereken aandeel (proportioneel)
            aandeel = openstaand / totaal_openstaand
            aflossing = (te_verdelen * aandeel).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            # Zorg dat we niet meer aflossen dan openstaand
            aflossing = min(aflossing, openstaand, restant)

            if aflossing > 0:
                set_openstaand(vordering, get_openstaand(vordering) - aflossing)
                add_afgelost(vordering, aflossing)
                restant -= aflossing
                toerekening = {
                    'vordering': vordering.kenmerk,
                    'type': toerekening_type,
                    'bedrag': aflossing
                }
                # Voor rente-types: voeg opgebouwd_voor toe
                if toerekening_type in ('rente', 'rente_kosten'):
                    toerekening['opgebouwd_voor'] = openstaand
                betaling.toerekeningen.append(toerekening)

        return restant

    def _verwerk_vordering_groep(self, vorderingen: List[Vordering], restant: Decimal,
                                  datum: date, betaling: Deelbetaling) -> Decimal:
        """Verwerk een groep vorderingen met dezelfde prioriteit."""
        if len(vorderingen) == 1:
            # Enkele vordering: verwerk normaal
            vordering = vorderingen[0]
            self.bereken_rente_tot_datum(vordering, datum)

            # Volgorde: rente_kosten → kosten → rente_hoofdsom → hoofdsom

            # 1. Rente op kosten
            if vordering.opgebouwde_rente_kosten > 0:
                opgebouwd_voor = vordering.opgebouwde_rente_kosten
                aflossing = min(restant, vordering.opgebouwde_rente_kosten)
                vordering.opgebouwde_rente_kosten -= aflossing
                vordering.afgelost_rente_kosten += aflossing
                restant -= aflossing
                betaling.toerekeningen.append({
                    'vordering': vordering.kenmerk,
                    'type': 'rente_kosten',
                    'bedrag': aflossing,
                    'opgebouwd_voor': opgebouwd_voor
                })

            # 2. Kosten
            if restant > 0 and vordering.openstaande_kosten > 0:
                aflossing = min(restant, vordering.openstaande_kosten)
                vordering.openstaande_kosten -= aflossing
                vordering.afgelost_kosten += aflossing
                restant -= aflossing
                betaling.toerekeningen.append({
                    'vordering': vordering.kenmerk,
                    'type': 'kosten',
                    'bedrag': aflossing
                })

            # 3. Rente op hoofdsom
            if restant > 0 and vordering.opgebouwde_rente > 0:
                opgebouwd_voor = vordering.opgebouwde_rente
                aflossing = min(restant, vordering.opgebouwde_rente)
                vordering.opgebouwde_rente -= aflossing
                vordering.afgelost_rente += aflossing
                restant -= aflossing
                betaling.toerekeningen.append({
                    'vordering': vordering.kenmerk,
                    'type': 'rente',
                    'bedrag': aflossing,
                    'opgebouwd_voor': opgebouwd_voor
                })

            # 4. Hoofdsom
            if restant > 0 and vordering.hoofdsom > 0:
                aflossing = min(restant, vordering.hoofdsom)
                vordering.hoofdsom -= aflossing
                vordering.afgelost_hoofdsom += aflossing
                restant -= aflossing
                betaling.toerekeningen.append({
                    'vordering': vordering.kenmerk,
                    'type': 'hoofdsom',
                    'bedrag': aflossing
                })
        else:
            # Meerdere vorderingen met zelfde prioriteit: verdeel evenredig
            for v in vorderingen:
                self.bereken_rente_tot_datum(v, datum)

            # 1. Rente op kosten - evenredig
            restant = self._verdeel_evenredig(
                restant, vorderingen,
                lambda v: v.opgebouwde_rente_kosten,
                lambda v, val: setattr(v, 'opgebouwde_rente_kosten', val),
                lambda v, val: setattr(v, 'afgelost_rente_kosten', v.afgelost_rente_kosten + val),
                betaling, 'rente_kosten'
            )

            # 2. Kosten - evenredig
            restant = self._verdeel_evenredig(
                restant, vorderingen,
                lambda v: v.openstaande_kosten,
                lambda v, val: setattr(v, 'openstaande_kosten', val),
                lambda v, val: setattr(v, 'afgelost_kosten', v.afgelost_kosten + val),
                betaling, 'kosten'
            )

            # 3. Rente op hoofdsom - evenredig
            restant = self._verdeel_evenredig(
                restant, vorderingen,
                lambda v: v.opgebouwde_rente,
                lambda v, val: setattr(v, 'opgebouwde_rente', val),
                lambda v, val: setattr(v, 'afgelost_rente', v.afgelost_rente + val),
                betaling, 'rente'
            )

            # 4. Hoofdsom - evenredig
            restant = self._verdeel_evenredig(
                restant, vorderingen,
                lambda v: v.hoofdsom,
                lambda v, val: setattr(v, 'hoofdsom', val),
                lambda v, val: setattr(v, 'afgelost_hoofdsom', v.afgelost_hoofdsom + val),
                betaling, 'hoofdsom'
            )

        # Check of vorderingen voldaan zijn
        for vordering in vorderingen:
            if (vordering.hoofdsom == 0 and vordering.opgebouwde_rente == 0 and
                vordering.openstaande_kosten == 0 and vordering.opgebouwde_rente_kosten == 0):
                if not vordering.voldaan:
                    vordering.voldaan = True
                    vordering.voldaan_datum = datum
                    vordering.events.append({
                        'type': 'voldaan',
                        'datum': datum
                    })

        return restant

    def verwerk_betaling(self, betaling: Deelbetaling):
        """Verwerk een deelbetaling."""
        restant = betaling.bedrag
        datum = betaling.datum

        # Bepaal volgorde van vorderingen
        if betaling.aangewezen_vorderingen:
            # Eerst de aangewezen vorderingen verwerken (geen evenredige verdeling)
            for kenmerk in betaling.aangewezen_vorderingen:
                if restant <= 0:
                    break
                if kenmerk in self.vorderingen:
                    v = self.vorderingen[kenmerk]
                    if not v.voldaan and v.startdatum <= datum:
                        restant = self._verwerk_vordering_groep([v], restant, datum, betaling)

            # Daarna overige actieve vorderingen voor eventueel restant (overflow)
            verwerkte_kenmerken = set(betaling.aangewezen_vorderingen)
            overige = [v for v in self.get_actieve_vorderingen(datum)
                      if v.kenmerk not in verwerkte_kenmerken]
        else:
            overige = self.get_actieve_vorderingen(datum)

        # Groepeer overige vorderingen op prioriteit (rente%, startdatum)
        # en verwerk per groep (evenredig bij gelijke prioriteit)
        from itertools import groupby

        overige_gesorteerd = sorted(
            overige,
            key=lambda v: (-v.get_rente_pct(datum), v.startdatum)
        )

        for _, groep in groupby(overige_gesorteerd, key=lambda v: (v.get_rente_pct(datum), v.startdatum)):
            if restant <= 0:
                break
            groep_list = list(groep)
            restant = self._verwerk_vordering_groep(groep_list, restant, datum, betaling)

        betaling.verwerkt = betaling.bedrag - restant

    def bereken(self) -> Dict:
        """Voer de volledige berekening uit."""
        # Verwerk betalingen chronologisch
        for betaling in self.deelbetalingen:
            self.verwerk_betaling(betaling)

        # Bereken rente tot einddatum voor alle open vorderingen
        for vordering in self.vorderingen.values():
            if not vordering.voldaan:
                self.bereken_rente_tot_datum(vordering, self.einddatum)

        return {
            'vorderingen': self.vorderingen,
            'deelbetalingen': self.deelbetalingen,
            'einddatum': self.einddatum_display  # Originele einddatum voor weergave
        }
