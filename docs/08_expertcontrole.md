# 08 - EXPERTCONTROLE EN CORRECTIES

## Samenvatting

De renteberekening is gecontroleerd en gecorrigeerd door een expert in wettelijke rente.

---

## Gevonden issue

### Probleem

De oorspronkelijke code berekende rente per periode tussen kapitalisatiedata, maar **splitste niet op rentewijzigingsdata**. 

Wanneer het rentepercentage wijzigt midden in een periode (bijv. op 01-01 of 01-07), werd het oude percentage voor de hele periode gebruikt.

### Voorbeeld

Periode 12-12-2014 t/m 29-05-2015 voor V3kWRS:

| Versie | Berekening | Rente |
|--------|------------|------:|
| OUD | 168 dagen @ 3% | € 22,76 |
| NIEUW | 20 dagen @ 3% + 148 dagen @ 2% | € 16,08 |

De wettelijke rente wijzigde op 01-01-2015 van 3% naar 2%.

---

## Oplossing

### Nieuwe logica

De code splitst nu elke periode op:
1. **Rentewijzigingsdata** (01-01 en 01-07 van elk jaar)
2. **Verjaardagen** (kapitalisatiemomenten)
3. **Betalingsdata**

### Implementatie

```python
def get_splitpunten(self, vordering, van_datum, tot_datum):
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
```

---

## Impact van correctie

### Vergelijking totalen

| Categorie | OUD | NIEUW | Verschil |
|-----------|----:|------:|----------:|
| Totaal rente | € 2.971,25 | € 3.042,63 | + € 71,38 |
| **TOTAAL OPENSTAAND** | **€ 5.471,25** | **€ 5.542,63** | **+ € 71,38** |

### Per vordering

| Vordering | Rente OUD | Rente NIEUW | Verschil |
|-----------|----------:|------------:|----------:|
| V3kWRS | € 82,51 | € 75,79 | - € 6,72 |
| V1kWR+1 | € 143,81 | € 146,41 | + € 2,60 |
| V2kHRS | € 2.744,93 | € 2.820,43 | + € 75,50 |

---

## Validatie gecorrigeerde berekening

### V3kWRS - Handmatige controle

**Periode 12-12-2014 t/m 01-01-2015 (20 dagen @ 3%):**
```
€ 1.648,58 × 0,03 × 20/365 = € 2,71 ✓
```

**Periode 01-01-2015 t/m 29-05-2015 (148 dagen @ 2%):**
```
€ 1.648,58 × 0,02 × 148/365 = € 13,37 ✓
```

### V2kHRS - Handmatige controle

**Periode 11-11-2023 t/m 01-01-2024 (51 dagen @ 12%):**
```
€ 3.796,99 × 0,12 × 51/365 = € 63,66 ✓
```

**Periode 01-01-2024 t/m 01-07-2024 (182 dagen @ 12,50%):**
```
€ 3.796,99 × 0,125 × 182/365 = € 236,66 ✓
```

---

## Checklist

| Aspect | Status |
|--------|--------|
| Renteperiodes gesplitst op wijzigingsdata | ✓ Gecorrigeerd |
| Kapitalisatie op verjaardagen | ✓ Correct |
| Betalingstoerekening (kosten → rente → hoofdsom) | ✓ Correct |
| Aangewezen vorderingen | ✓ Correct |
| Controleberekening sluit | ✓ Correct |

---

## Conclusie

**De gecorrigeerde berekening is juridisch correct conform Nederlands recht.**

Alle rentepercentages worden nu correct toegepast per periode, inclusief wijzigingen halverwege een jaar.
