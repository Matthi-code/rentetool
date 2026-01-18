# 02 - REKENLOGICA EN ALGORITMES

## Wettelijke basis

| Artikel | Onderwerp |
|---------|-----------|
| Art. 6:119 BW | Wettelijke rente |
| Art. 6:119a BW | Handelsrente |
| Art. 6:119 lid 2 BW | Samengestelde rente (kapitalisatie) |
| Art. 6:43 BW | Toerekening op meest bezwarende vordering |
| Art. 6:44 BW | Volgorde: kosten → rente → hoofdsom |

---

## Renteberekening

### Basisformule

```
Rente = Hoofdsom × Rentepercentage × (Dagen / 365)
```

### Samengestelde rente (kapitalisatie)

Op elke **verjaardag** van de vordering:

```
Nieuwe_hoofdsom = Oude_hoofdsom + Opgebouwde_rente
Opgebouwde_rente = 0
```

### Enkelvoudige rente

Rente wordt berekend over de **oorspronkelijke** hoofdsom. Geen kapitalisatie.

---

## KRITIEK: Periodesplitsing

Renteperiodes MOETEN worden gesplitst op:

1. **Rentewijzigingsdata** (01-01 en 01-07)
2. **Verjaardagen** (kapitalisatiemomenten)
3. **Betalingsdata**

### Algoritme

```python
def get_splitpunten(van_datum, tot_datum, verjaardag):
    splitpunten = set()
    
    # Voeg rentewijzigingsdata toe
    for wijziging in RENTE_WIJZIGINGSDATA:
        if van_datum < wijziging < tot_datum:
            splitpunten.add(wijziging)
    
    # Voeg verjaardagen toe (samengestelde rente)
    jaar = van_datum.year
    while True:
        jaar += 1
        vj = verjaardag_in_jaar(verjaardag, jaar)
        if vj >= tot_datum:
            break
        if vj > van_datum:
            splitpunten.add(vj)
    
    return sorted(splitpunten)
```

---

## Betalingstoerekening

### Stap 1: Bepaal volgorde vorderingen

**Als aangewezen:**
```
volgorde = [aangewezen_vorderingen in opgegeven volgorde]
```

**Als niet aangewezen (strategie A):**
```
volgorde = sorteer(actieve_vorderingen, key=rente_percentage, reverse=True)
```

**Als niet aangewezen (strategie B):**
```
volgorde = sorteer(actieve_vorderingen, key=startdatum)
```

### Stap 2: Per vordering (art. 6:44 BW)

```python
for vordering in volgorde:
    if restant <= 0:
        break
    
    # 1. Kosten
    if vordering.kosten > 0:
        aflossing = min(restant, vordering.kosten)
        vordering.kosten -= aflossing
        restant -= aflossing
    
    # 2. Rente
    if vordering.opgebouwde_rente > 0:
        aflossing = min(restant, vordering.opgebouwde_rente)
        vordering.opgebouwde_rente -= aflossing
        restant -= aflossing
    
    # 3. Hoofdsom
    if vordering.hoofdsom > 0:
        aflossing = min(restant, vordering.hoofdsom)
        vordering.hoofdsom -= aflossing
        restant -= aflossing
    
    # Check voldaan
    if vordering.openstaand == 0:
        vordering.status = "VOLDAAN"
```

---

## Opslag-rente (type 6 en 7)

### Formule

```
Effectief_percentage = Basis_percentage + Opslag
```

Waarbij:
- Basis_percentage = wettelijke of handelsrente uit tabel
- Opslag = vast percentage (bijv. 2%)

### Ingangsdatum opslag

```python
def get_rente_pct(vordering, datum):
    if datum >= vordering.opslag_ingangsdatum:
        opslag = vordering.opslag
    else:
        opslag = 0
    
    return get_basis_rente(datum) + opslag
```

---

## Verjaardag berekening

```python
def verjaardag(startdatum, jaar):
    try:
        return date(jaar, startdatum.month, startdatum.day)
    except ValueError:
        # 29 februari in niet-schrikkeljaar
        return date(jaar, startdatum.month, 28)
```

---

## Afronding

- Rentebedragen: 2 decimalen, HALF_UP
- Percentages: uit tabel (niet afronden)
- Dagen: geheel getal

```python
from decimal import Decimal, ROUND_HALF_UP

rente = rente.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

---

## Chronologische verwerking

```python
def bereken(vorderingen, deelbetalingen, einddatum):
    # Sorteer betalingen chronologisch
    betalingen = sorted(deelbetalingen, key=lambda d: d.datum)
    
    # Verwerk elke betaling
    for betaling in betalingen:
        # Bereken rente tot betalingsdatum
        for vordering in actieve_vorderingen(betaling.datum):
            bereken_rente_tot(vordering, betaling.datum)
        
        # Verwerk betaling
        verwerk_betaling(betaling)
    
    # Bereken rente tot einddatum
    for vordering in actieve_vorderingen(einddatum):
        bereken_rente_tot(vordering, einddatum)
```

---

## Validatie

### Controleformule

```
Totaal_openstaand = 
    Σ(oorspronkelijk) + Σ(kosten) + Σ(rente) 
    - Σ(afgelost_hoofdsom) - Σ(afgelost_kosten) - Σ(afgelost_rente)
```

### Per vordering

```
Als VOLDAAN:
    hoofdsom == 0
    opgebouwde_rente == 0
    openstaande_kosten == 0

Als OPEN:
    openstaand == hoofdsom + opgebouwde_rente + openstaande_kosten
```

---

## Edge cases

| Situatie | Oplossing |
|----------|-----------|
| Schrikkeljaar 29 feb | Gebruik 28 feb in niet-schrikkeljaren |
| Betaling op verjaardag | Eerst kapitaliseren, dan betaling |
| Betaling > schuld | Restant ongebruikt laten |
| Vordering in toekomst | Geen rente vóór startdatum |
| Meerdere betalingen zelfde dag | Verwerk in invoervolgorde |
| Rentewijziging midden periode | Split periode |
