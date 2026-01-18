# RENTETOOL - COMPLETE PROJECTDOCUMENTATIE

## Voor Claude Code CLI

Dit pakket bevat alle documentatie en werkende code om de wettelijke rente calculator verder te ontwikkelen.

---

## Bestanden

| # | Bestand | Beschrijving |
|---|---------|--------------|
| 1 | `README.md` | Dit bestand - overzicht en instructies |
| 2 | `01_specificatie.md` | Functionele eisen en scope |
| 3 | `02_rekenlogica.md` | Algoritmes, formules en wettelijke basis |
| 4 | `03_rentetabel.csv` | Historische rentepercentages 1999-2027 |
| 5 | `04_referentie_implementatie.py` | **WERKENDE Python code (gecorrigeerd)** |
| 6 | `05_testcase3.md` | Testcase met 3 vorderingen en 2 deelbetalingen |
| 7 | `06_api_specificatie.md` | Input/output JSON formaat |
| 8 | `07_rentetypes.md` | Alle 7 rentetypes met opties |
| 9 | `08_expertcontrole.md` | Validatie en correcties |

---

## Direct starten

```bash
# Test de berekening
python 04_referentie_implementatie.py

# Output: volledig gespecificeerde renteberekening
```

---

## Kernfunctionaliteit

### 7 Rentetypes

| Code | Type | Kapitalisatie |
|------|------|---------------|
| 1 | Wettelijke rente | Samengesteld |
| 2 | Handelsrente | Samengesteld |
| 3 | Wettelijke rente | Enkelvoudig |
| 4 | Handelsrente | Enkelvoudig |
| 5 | Contractueel vast % | Keuze |
| 6 | Wettelijke + opslag | Keuze |
| 7 | Handelsrente + opslag | Keuze |

### Betalingstoerekening

**Default: Strategie A (meest bezwarend / hoogste rente%)**

Conform art. 6:43 BW - binnen vordering: kosten → rente → hoofdsom (art. 6:44 BW)

### Wettelijke basis

- Art. 6:119 BW: Wettelijke rente
- Art. 6:119a BW: Handelsrente  
- Art. 6:119 lid 2 BW: Samengestelde rente (kapitalisatie)
- Art. 6:43 BW: Toerekening op meest bezwarende vordering
- Art. 6:44 BW: Volgorde: kosten → rente → hoofdsom

---

## Belangrijke correctie

De code splitst renteperiodes op **wijzigingsdata** (01-01 en 01-07). Dit is essentieel voor juridisch correcte berekeningen.

---

## Tech Stack (aanbevolen)

| Component | Technologie |
|-----------|-------------|
| Frontend | Next.js 14 |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |

---

## Testcase 3 - Verwacht resultaat

| Vordering | Openstaand | Status |
|-----------|----------:|--------|
| V3kWRS | € 0,00 | VOLDAAN |
| V1kWR+1 | € 322,20 | OPEN |
| V2kHRS | € 5.220,43 | OPEN |
| **TOTAAL** | **€ 5.542,63** | |

---

*Laatst bijgewerkt: 16-01-2026*
