"""
Rentetool - Testcase 3 - GECORRIGEERDE VERSIE
==============================================
Correctie: Renteperiodes worden nu gesplitst op:
1. Verjaardagen (kapitalisatie)
2. Rentewijzigingsdata (01-01 en 01-07)
3. Betalingsdata
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

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
    kosten: Decimal = Decimal("0")
    opslag: Decimal = Decimal("0")  # Voor type 6 en 7
    opslag_ingangsdatum: Optional[date] = None  # Default: startdatum
    
    # Huidige staat
    hoofdsom: Decimal = field(default=Decimal("0"))
    openstaande_kosten: Decimal = field(default=Decimal("0"))
    opgebouwde_rente: Decimal = field(default=Decimal("0"))
    totale_rente: Decimal = field(default=Decimal("0"))
    voldaan: bool = False
    voldaan_datum: Optional[date] = None
    
    # Aflossingen
    afgelost_hoofdsom: Decimal = field(default=Decimal("0"))
    afgelost_kosten: Decimal = field(default=Decimal("0"))
    afgelost_rente: Decimal = field(default=Decimal("0"))
    
    # Detail logging
    periodes: List[Dict] = field(default_factory=list)
    events: List[Dict] = field(default_factory=list)
    
    # Track laatste berekende datum
    laatst_berekend_tot: Optional[date] = None
    
    def __post_init__(self):
        self.hoofdsom = self.oorspronkelijk_bedrag
        self.openstaande_kosten = self.kosten
        if self.opslag_ingangsdatum is None:
            self.opslag_ingangsdatum = self.startdatum
        self.laatst_berekend_tot = self.startdatum
    
    @property
    def is_samengesteld(self) -> bool:
        return self.rentetype in (1, 2, 6, 7)
    
    @property
    def is_handelsrente(self) -> bool:
        return self.rentetype in (2, 4, 7)
    
    @property
    def openstaand(self) -> Decimal:
        return self.hoofdsom + self.openstaande_kosten + self.opgebouwde_rente
    
    def get_rente_pct(self, datum: date) -> Decimal:
        """Haal rentepercentage op voor deze vordering op een datum."""
        if self.rentetype in (6, 7):
            opslag = self.opslag if datum >= self.opslag_ingangsdatum else Decimal("0")
            return get_rente_percentage(datum, self.is_handelsrente, opslag)
        else:
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

def format_bedrag(bedrag: Decimal) -> str:
    """Formatteer bedrag als euro."""
    return f"€ {bedrag:>10,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def format_datum(d: date) -> str:
    """Formatteer datum als DD-MM-JJJJ."""
    return d.strftime("%d-%m-%Y")

def format_pct(pct: Decimal) -> str:
    """Formatteer percentage."""
    return f"{pct * 100:.2f}%"

# =============================================================================
# RENTE CALCULATOR - GECORRIGEERDE VERSIE
# =============================================================================

class RenteCalculator:
    def __init__(self, vorderingen: List[Vordering], deelbetalingen: List[Deelbetaling], einddatum: date):
        self.vorderingen = {v.kenmerk: v for v in vorderingen}
        self.deelbetalingen = sorted(deelbetalingen, key=lambda d: d.datum)
        self.einddatum = einddatum
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
        
        return sorted(splitpunten)
    
    def bereken_rente_tot_datum(self, vordering: Vordering, tot_datum: date):
        """
        Bereken rente voor een vordering tot een bepaalde datum.
        GECORRIGEERD: Splitst periodes op rentewijzigingsdata.
        """
        if vordering.voldaan or vordering.startdatum >= tot_datum:
            return
        
        # Start vanaf laatste berekende datum
        huidige_datum = vordering.laatst_berekend_tot
        
        if huidige_datum >= tot_datum:
            return
        
        # Haal alle splitpunten op
        splitpunten = self.get_splitpunten(vordering, huidige_datum, tot_datum)
        splitpunten.append(tot_datum)  # Voeg einddatum toe
        
        for splitpunt in splitpunten:
            if huidige_datum >= splitpunt:
                continue
            
            # Bepaal of dit een kapitalisatiemoment is (verjaardag)
            is_verjaardag = (
                vordering.is_samengesteld and
                splitpunt.month == vordering.startdatum.month and
                splitpunt.day == vordering.startdatum.day and
                splitpunt < tot_datum
            )
            
            # Bereken rente voor deze subperiode
            dagen = (splitpunt - huidige_datum).days
            rente_pct = vordering.get_rente_pct(huidige_datum)
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
                'is_kapitalisatie': is_verjaardag
            })
            
            # Kapitalisatie op verjaardag
            if is_verjaardag:
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
    
    def verwerk_betaling(self, betaling: Deelbetaling):
        """Verwerk een deelbetaling."""
        restant = betaling.bedrag
        datum = betaling.datum
        
        # Bepaal volgorde van vorderingen
        if betaling.aangewezen_vorderingen:
            vorderingen_volgorde = []
            for kenmerk in betaling.aangewezen_vorderingen:
                if kenmerk in self.vorderingen:
                    v = self.vorderingen[kenmerk]
                    if not v.voldaan and v.startdatum <= datum:
                        vorderingen_volgorde.append(v)
        else:
            # Strategie A: meest bezwarend
            actief = self.get_actieve_vorderingen(datum)
            vorderingen_volgorde = sorted(actief, key=lambda v: v.get_rente_pct(datum), reverse=True)
        
        for vordering in vorderingen_volgorde:
            if restant <= 0:
                break
            
            # Bereken rente tot betalingsdatum
            self.bereken_rente_tot_datum(vordering, datum)
            
            # Volgorde: kosten → rente → hoofdsom
            
            # 1. Kosten
            if vordering.openstaande_kosten > 0:
                aflossing = min(restant, vordering.openstaande_kosten)
                vordering.openstaande_kosten -= aflossing
                vordering.afgelost_kosten += aflossing
                restant -= aflossing
                betaling.toerekeningen.append({
                    'vordering': vordering.kenmerk,
                    'type': 'kosten',
                    'bedrag': aflossing
                })
            
            # 2. Rente
            if restant > 0 and vordering.opgebouwde_rente > 0:
                aflossing = min(restant, vordering.opgebouwde_rente)
                vordering.opgebouwde_rente -= aflossing
                vordering.afgelost_rente += aflossing
                restant -= aflossing
                betaling.toerekeningen.append({
                    'vordering': vordering.kenmerk,
                    'type': 'rente',
                    'bedrag': aflossing
                })
            
            # 3. Hoofdsom
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
            
            # Check of vordering voldaan is
            if vordering.hoofdsom == 0 and vordering.opgebouwde_rente == 0 and vordering.openstaande_kosten == 0:
                vordering.voldaan = True
                vordering.voldaan_datum = datum
                vordering.events.append({
                    'type': 'voldaan',
                    'datum': datum
                })
        
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
            'einddatum': self.einddatum
        }

# =============================================================================
# OUTPUT FORMATTING
# =============================================================================

def format_output(result: Dict) -> str:
    """Genereer mooi geformatteerde output."""
    lines = []
    vorderingen = result['vorderingen']
    deelbetalingen = result['deelbetalingen']
    einddatum = result['einddatum']
    
    # Header
    lines.append("=" * 90)
    lines.append("RENTEBEREKENING - TESTCASE 3 - GECORRIGEERDE VERSIE")
    lines.append("=" * 90)
    lines.append(f"Einddatum berekening: {format_datum(einddatum)}")
    lines.append(f"Betalingsstrategie:   A (meest bezwarend)")
    lines.append(f"Correctie:            Renteperiodes gesplitst op wijzigingsdata")
    lines.append("")
    
    # Invoer samenvatting
    lines.append("-" * 90)
    lines.append("INVOER: VORDERINGEN")
    lines.append("-" * 90)
    lines.append(f"{'Kenmerk':<12} {'Bedrag':>12} {'Datum':<12} {'Type':<30} {'Kosten':>10}")
    lines.append("-" * 90)
    
    for v in sorted(vorderingen.values(), key=lambda x: x.startdatum):
        type_str = {
            1: "Wettelijk samengesteld",
            2: "Handelsrente samengesteld",
            3: "Wettelijk enkelvoudig",
            4: "Handelsrente enkelvoudig",
            5: "Contractueel vast",
            6: f"Wettelijk +{v.opslag*100:.0f}% opslag",
            7: f"Handels +{v.opslag*100:.0f}% opslag"
        }.get(v.rentetype, "Onbekend")
        
        lines.append(f"{v.kenmerk:<12} {format_bedrag(v.oorspronkelijk_bedrag):>12} {format_datum(v.startdatum):<12} {type_str:<30} {format_bedrag(v.kosten):>10}")
    
    lines.append("")
    lines.append("-" * 90)
    lines.append("INVOER: DEELBETALINGEN")
    lines.append("-" * 90)
    lines.append(f"{'Kenmerk':<12} {'Bedrag':>12} {'Datum':<12} {'Aangewezen':<40}")
    lines.append("-" * 90)
    
    for d in deelbetalingen:
        aangewezen = ", ".join(d.aangewezen_vorderingen) if d.aangewezen_vorderingen else "(strategie A)"
        lines.append(f"{d.kenmerk:<12} {format_bedrag(d.bedrag):>12} {format_datum(d.datum):<12} {aangewezen:<40}")
    
    lines.append("")
    
    # Verwerking deelbetalingen
    lines.append("=" * 90)
    lines.append("VERWERKING DEELBETALINGEN")
    lines.append("=" * 90)
    
    for d in deelbetalingen:
        lines.append("")
        lines.append(f"► Deelbetaling {d.kenmerk}: {format_bedrag(d.bedrag)} op {format_datum(d.datum)}")
        lines.append("-" * 60)
        lines.append(f"  {'Vordering':<12} {'Type':<10} {'Bedrag':>12}")
        lines.append("  " + "-" * 36)
        
        for t in d.toerekeningen:
            lines.append(f"  {t['vordering']:<12} {t['type']:<10} {format_bedrag(t['bedrag']):>12}")
        
        lines.append("  " + "-" * 36)
        lines.append(f"  {'Totaal verwerkt':<22} {format_bedrag(d.verwerkt):>12}")
        
        for t in d.toerekeningen:
            v = vorderingen[t['vordering']]
            if v.voldaan and v.voldaan_datum == d.datum:
                lines.append(f"  ✓ {t['vordering']} VOLDAAN")
                break
    
    lines.append("")
    
    # Detail per vordering
    lines.append("=" * 90)
    lines.append("DETAIL PER VORDERING")
    lines.append("=" * 90)
    
    for v in sorted(vorderingen.values(), key=lambda x: x.startdatum):
        lines.append("")
        lines.append(f"► {v.kenmerk}")
        lines.append("-" * 70)
        
        status = "VOLDAAN" if v.voldaan else "OPEN"
        lines.append(f"  Status: {status}")
        if v.voldaan:
            lines.append(f"  Voldaan op: {format_datum(v.voldaan_datum)}")
        
        lines.append("")
        lines.append(f"  {'Periode':<25} {'Dagen':>6} {'Hoofdsom':>12} {'Rente%':>8} {'Rente':>12} {'Kap':>4}")
        lines.append("  " + "-" * 70)
        
        for p in v.periodes:
            periode_str = f"{format_datum(p['start'])} - {format_datum(p['eind'])}"
            kap = "→" if p.get('is_kapitalisatie', False) else ""
            lines.append(f"  {periode_str:<25} {p['dagen']:>6} {format_bedrag(p['hoofdsom']):>12} {format_pct(p['rente_pct']):>8} {format_bedrag(p['rente']):>12} {kap:>4}")
        
        # Events (kapitalisaties)
        kap_events = [e for e in v.events if e['type'] == 'kapitalisatie']
        if kap_events:
            lines.append("")
            lines.append("  Kapitalisaties:")
            for e in kap_events:
                lines.append(f"    {format_datum(e['datum'])}: {format_bedrag(e['oude_hoofdsom'])} + {format_bedrag(e['rente'])} = {format_bedrag(e['nieuwe_hoofdsom'])}")
    
    lines.append("")
    
    # Eindresultaat
    lines.append("=" * 90)
    lines.append("EINDRESULTAAT PER VORDERING")
    lines.append("=" * 90)
    lines.append("")
    lines.append(f"{'Kenmerk':<12} {'Oorspronk.':>12} {'Kosten':>10} {'Rente':>12} {'Afl.HS':>12} {'Afl.Kst':>10} {'Afl.Rnt':>10} {'Openstaand':>12} {'Status':<8}")
    lines.append("-" * 110)
    
    totaal_oorspronkelijk = Decimal("0")
    totaal_kosten = Decimal("0")
    totaal_rente = Decimal("0")
    totaal_afl_hs = Decimal("0")
    totaal_afl_kst = Decimal("0")
    totaal_afl_rnt = Decimal("0")
    totaal_openstaand = Decimal("0")
    
    for v in sorted(vorderingen.values(), key=lambda x: x.startdatum):
        status = "VOLDAAN" if v.voldaan else "OPEN"
        openstaand = v.openstaand
        
        lines.append(f"{v.kenmerk:<12} {format_bedrag(v.oorspronkelijk_bedrag):>12} {format_bedrag(v.kosten):>10} {format_bedrag(v.totale_rente):>12} {format_bedrag(v.afgelost_hoofdsom):>12} {format_bedrag(v.afgelost_kosten):>10} {format_bedrag(v.afgelost_rente):>10} {format_bedrag(openstaand):>12} {status:<8}")
        
        totaal_oorspronkelijk += v.oorspronkelijk_bedrag
        totaal_kosten += v.kosten
        totaal_rente += v.totale_rente
        totaal_afl_hs += v.afgelost_hoofdsom
        totaal_afl_kst += v.afgelost_kosten
        totaal_afl_rnt += v.afgelost_rente
        totaal_openstaand += openstaand
    
    lines.append("-" * 110)
    lines.append(f"{'TOTAAL':<12} {format_bedrag(totaal_oorspronkelijk):>12} {format_bedrag(totaal_kosten):>10} {format_bedrag(totaal_rente):>12} {format_bedrag(totaal_afl_hs):>12} {format_bedrag(totaal_afl_kst):>10} {format_bedrag(totaal_afl_rnt):>10} {format_bedrag(totaal_openstaand):>12}")
    
    lines.append("")
    lines.append("=" * 90)
    lines.append("SAMENVATTING")
    lines.append("=" * 90)
    lines.append(f"  Totaal oorspronkelijke hoofdsom:  {format_bedrag(totaal_oorspronkelijk)}")
    lines.append(f"  Totaal kosten:                    {format_bedrag(totaal_kosten)}")
    lines.append(f"  Totaal berekende rente:           {format_bedrag(totaal_rente)}")
    lines.append(f"  Totaal afgelost hoofdsom:         {format_bedrag(totaal_afl_hs)}")
    lines.append(f"  Totaal afgelost kosten:           {format_bedrag(totaal_afl_kst)}")
    lines.append(f"  Totaal afgelost rente:            {format_bedrag(totaal_afl_rnt)}")
    lines.append("-" * 50)
    lines.append(f"  TOTAAL OPENSTAAND:                {format_bedrag(totaal_openstaand)}")
    lines.append("")
    
    # Controle
    totaal_betaald = sum(d.bedrag for d in deelbetalingen)
    controle = totaal_oorspronkelijk + totaal_kosten + totaal_rente - totaal_betaald
    
    lines.append(f"  Controle: {format_bedrag(totaal_oorspronkelijk)} + {format_bedrag(totaal_kosten)} + {format_bedrag(totaal_rente)} - {format_bedrag(totaal_betaald)} = {format_bedrag(controle)}")
    
    if abs(controle - totaal_openstaand) < Decimal("0.02"):
        lines.append("  ✓ CONTROLE OK")
    else:
        verschil = controle - totaal_openstaand
        lines.append(f"  ✗ VERSCHIL: {format_bedrag(verschil)}")
    
    lines.append("")
    lines.append("=" * 90)
    
    return "\n".join(lines)

# =============================================================================
# TESTCASE 3
# =============================================================================

def run_testcase():
    """Voer testcase 3 uit."""
    
    vorderingen = [
        Vordering(
            kenmerk="V1kWR+1",
            oorspronkelijk_bedrag=Decimal("1000.00"),
            startdatum=date(2015, 5, 6),
            rentetype=6,
            kosten=Decimal("0"),
            opslag=Decimal("0.02"),
            opslag_ingangsdatum=date(2015, 5, 6)
        ),
        Vordering(
            kenmerk="V2kHRS",
            oorspronkelijk_bedrag=Decimal("2000.00"),
            startdatum=date(2015, 11, 11),
            rentetype=2,
            kosten=Decimal("400.00")
        ),
        Vordering(
            kenmerk="V3kWRS",
            oorspronkelijk_bedrag=Decimal("3000.00"),
            startdatum=date(2014, 5, 29),
            rentetype=1,
            kosten=Decimal("100.00")
        ),
    ]
    
    deelbetalingen = [
        Deelbetaling(
            kenmerk="D1500",
            bedrag=Decimal("1500.00"),
            datum=date(2014, 12, 12),
            aangewezen_vorderingen=["V3kWRS"]
        ),
        Deelbetaling(
            kenmerk="D2500",
            bedrag=Decimal("2500.00"),
            datum=date(2015, 9, 28),
            aangewezen_vorderingen=["V3kWRS", "V1kWR+1"]
        ),
    ]
    
    einddatum = date(2026, 1, 16)
    
    calc = RenteCalculator(vorderingen, deelbetalingen, einddatum)
    result = calc.bereken()
    
    output = format_output(result)
    print(output)
    
    return output

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    run_testcase()
