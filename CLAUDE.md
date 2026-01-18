# CLAUDE.md - Rentetool Project

## Project Overview

Nederlandse wettelijke rente calculator conform Burgerlijk Wetboek. Berekent rente op vorderingen met ondersteuning voor deelbetalingen, kapitalisatie en meerdere rentetypes.

## Quick Start

```bash
# Test de huidige implementatie
python 04_referentie_implementatie.py
```

## Kernregels

### Wettelijke basis
- **Art. 6:119 BW**: Wettelijke rente (particulier)
- **Art. 6:119a BW**: Handelsrente (B2B)
- **Art. 6:119 lid 2 BW**: Samengestelde rente (kapitalisatie op verjaardag)
- **Art. 6:43 BW**: Toerekening op meest bezwarende vordering
- **Art. 6:44 BW**: Volgorde binnen vordering: kosten → rente → hoofdsom

### Default betalingsstrategie
**Strategie A: Meest bezwarend (hoogste rente%)** - dit is de wettelijke default conform art. 6:43 BW.

### Renteformule
```
Rente = Hoofdsom × Rentepercentage × (Dagen / 365)
```

### KRITIEK: Periodesplitsing
Renteperiodes MOETEN worden gesplitst op:
1. Rentewijzigingsdata (01-01 en 01-07)
2. Verjaardagen (kapitalisatiemomenten)
3. Betalingsdata

**Dit is gecorrigeerd in de huidige code - niet terugdraaien!**

## 7 Rentetypes

| Code | Type | Kapitalisatie |
|------|------|---------------|
| 1 | Wettelijke rente | Samengesteld |
| 2 | Handelsrente | Samengesteld |
| 3 | Wettelijke rente | Enkelvoudig |
| 4 | Handelsrente | Enkelvoudig |
| 5 | Contractueel vast % | Keuze |
| 6 | Wettelijke + opslag | Keuze |
| 7 | Handelsrente + opslag | Keuze |

## Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `04_referentie_implementatie.py` | **WERKENDE CODE** - start hier |
| `03_rentetabel.csv` | Rentepercentages 1999-2027 |
| `01_specificatie.md` | Functionele eisen |
| `02_rekenlogica.md` | Algoritmes |
| `05_testcase3.md` | Testcase met verwacht resultaat |
| `06_api_specificatie.md` | API JSON formaat |
| `07_rentetypes.md` | Details alle rentetypes |
| `08_expertcontrole.md` | Validatie en correcties |

## Testcase 3 - Verwacht resultaat

**Einddatum:** 16-01-2026

| Vordering | Openstaand | Status |
|-----------|----------:|--------|
| V3kWRS | € 0,00 | VOLDAAN |
| V1kWR+1 | € 322,20 | OPEN |
| V2kHRS | € 5.220,43 | OPEN |
| **TOTAAL** | **€ 5.542,63** | |

## Tech Stack (aanbevolen)

- **Backend**: FastAPI (Python) - past bij bestaande code
- **Frontend**: Next.js 14
- **Database**: Supabase (PostgreSQL)

## Code conventies

- Decimals voor alle geldbedragen (geen floats!)
- Afronding: 2 decimalen, ROUND_HALF_UP
- Datums: ISO formaat (YYYY-MM-DD)
- Bedragen in euro's

## Validatie

Controleformule moet altijd kloppen:
```
Openstaand = Oorspronkelijk + Kosten + Rente - Afgelost
```

## Belangrijke edge cases

| Situatie | Oplossing |
|----------|-----------|
| 29 februari | Gebruik 28 feb in niet-schrikkeljaren |
| Betaling op verjaardag | Eerst kapitaliseren, dan betaling |
| Betaling > schuld | Restant ongebruikt |
| Rentewijziging midden periode | Split periode op wijzigingsdatum |

## Niet doen

- Floats gebruiken voor geldbedragen
- Renteperiodes NIET splitsen op wijzigingsdata
- Enkelvoudige rente kapitaliseren
- Betalingen in verkeerde volgorde verwerken (altijd chronologisch)
