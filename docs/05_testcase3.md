# 05 - TESTCASE 3

## Invoer

### Vorderingen (3 stuks)

| # | Kenmerk | Bedrag | Startdatum | Rentetype | Kosten | Opslag |
|---|---------|-------:|------------|-----------|-------:|--------|
| 1 | V3kWRS | € 3.000,00 | 29-05-2014 | 1 (Wettelijk samengesteld) | € 100,00 | - |
| 2 | V1kWR+1 | € 1.000,00 | 06-05-2015 | 6 (Wettelijk + opslag) | € 0,00 | 2% |
| 3 | V2kHRS | € 2.000,00 | 11-11-2015 | 2 (Handelsrente samengesteld) | € 400,00 | - |

### Deelbetalingen (2 stuks)

| # | Kenmerk | Bedrag | Datum | Aangewezen |
|---|---------|-------:|-------|------------|
| 1 | D1500 | € 1.500,00 | 12-12-2014 | V3kWRS |
| 2 | D2500 | € 2.500,00 | 28-09-2015 | V3kWRS → V1kWR+1 |

### Instellingen

| Instelling | Waarde |
|------------|--------|
| Einddatum | 16-01-2026 |
| Strategie | A (meest bezwarend) |

---

## Verwacht resultaat

### Eindresultaat per vordering

| Kenmerk | Oorspronk. | Kosten | Rente | Afl.HS | Afl.Kst | Afl.Rnt | Openstaand | Status |
|---------|----------:|-------:|------:|-------:|--------:|--------:|-----------:|--------|
| V3kWRS | € 3.000,00 | € 100,00 | € 75,79 | € 3.016,08 | € 100,00 | € 59,71 | € 0,00 | VOLDAAN |
| V1kWR+1 | € 1.000,00 | € 0,00 | € 146,41 | € 808,32 | € 0,00 | € 15,89 | € 322,20 | OPEN |
| V2kHRS | € 2.000,00 | € 400,00 | € 2.820,43 | € 0,00 | € 0,00 | € 0,00 | € 5.220,43 | OPEN |
| **TOTAAL** | **€ 6.000,00** | **€ 500,00** | **€ 3.042,63** | **€ 3.824,40** | **€ 100,00** | **€ 75,60** | **€ 5.542,63** | |

### Samenvatting

| Categorie | Bedrag |
|-----------|-------:|
| Totaal oorspronkelijke hoofdsom | € 6.000,00 |
| Totaal kosten | € 500,00 |
| Totaal berekende rente | € 3.042,63 |
| Totaal afgelost hoofdsom | € 3.824,40 |
| Totaal afgelost kosten | € 100,00 |
| Totaal afgelost rente | € 75,60 |
| **TOTAAL OPENSTAAND** | **€ 5.542,63** |

### Controle

```
€ 6.000 + € 500 + € 3.042,63 - € 4.000 = € 5.542,63 ✓
```

---

## Verwerking deelbetalingen

### D1500 op 12-12-2014

| Vordering | Type | Bedrag |
|-----------|------|-------:|
| V3kWRS | kosten | € 100,00 |
| V3kWRS | rente | € 48,58 |
| V3kWRS | hoofdsom | € 1.351,42 |
| **Totaal** | | **€ 1.500,00** |

### D2500 op 28-09-2015

| Vordering | Type | Bedrag |
|-----------|------|-------:|
| V3kWRS | rente | € 11,13 |
| V3kWRS | hoofdsom | € 1.664,66 |
| V1kWR+1 | rente | € 15,89 |
| V1kWR+1 | hoofdsom | € 808,32 |
| **Totaal** | | **€ 2.500,00** |

✓ V3kWRS VOLDAAN

---

## Uitvoeren

```bash
python 04_referentie_implementatie.py
```
