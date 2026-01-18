# 06 - API SPECIFICATIE

## Endpoint

```
POST /api/bereken
```

---

## Request

```json
{
  "einddatum": "2026-01-16",
  "strategie": "A",
  "vorderingen": [
    {
      "kenmerk": "V3kWRS",
      "bedrag": 3000.00,
      "datum": "2014-05-29",
      "rentetype": 1,
      "kosten": 100.00
    },
    {
      "kenmerk": "V1kWR+1",
      "bedrag": 1000.00,
      "datum": "2015-05-06",
      "rentetype": 6,
      "kosten": 0,
      "opslag": 0.02,
      "opslag_ingangsdatum": "2015-05-06"
    },
    {
      "kenmerk": "V2kHRS",
      "bedrag": 2000.00,
      "datum": "2015-11-11",
      "rentetype": 2,
      "kosten": 400.00
    }
  ],
  "deelbetalingen": [
    {
      "kenmerk": "D1500",
      "bedrag": 1500.00,
      "datum": "2014-12-12",
      "aangewezen": ["V3kWRS"]
    },
    {
      "kenmerk": "D2500",
      "bedrag": 2500.00,
      "datum": "2015-09-28",
      "aangewezen": ["V3kWRS", "V1kWR+1"]
    }
  ]
}
```

---

## Response

```json
{
  "einddatum": "2026-01-16",
  "strategie": "A",
  "vorderingen": [
    {
      "kenmerk": "V3kWRS",
      "oorspronkelijk_bedrag": 3000.00,
      "kosten": 100.00,
      "totale_rente": 75.79,
      "afgelost_hoofdsom": 3016.08,
      "afgelost_kosten": 100.00,
      "afgelost_rente": 59.71,
      "openstaand": 0.00,
      "status": "VOLDAAN",
      "voldaan_datum": "2015-09-28",
      "periodes": [
        {
          "start": "2014-05-29",
          "eind": "2014-07-01",
          "dagen": 33,
          "hoofdsom": 3000.00,
          "rente_pct": 0.03,
          "rente": 8.14
        }
      ]
    }
  ],
  "deelbetalingen": [
    {
      "kenmerk": "D1500",
      "bedrag": 1500.00,
      "datum": "2014-12-12",
      "verwerkt": 1500.00,
      "toerekeningen": [
        {"vordering": "V3kWRS", "type": "kosten", "bedrag": 100.00},
        {"vordering": "V3kWRS", "type": "rente", "bedrag": 48.58},
        {"vordering": "V3kWRS", "type": "hoofdsom", "bedrag": 1351.42}
      ]
    }
  ],
  "totalen": {
    "oorspronkelijk": 6000.00,
    "kosten": 500.00,
    "rente": 3042.63,
    "afgelost_hoofdsom": 3824.40,
    "afgelost_kosten": 100.00,
    "afgelost_rente": 75.60,
    "openstaand": 5542.63
  },
  "controle_ok": true
}
```

---

## Velden

### Vordering (request)

| Veld | Type | Verplicht | Default |
|------|------|-----------|---------|
| kenmerk | string | Ja | - |
| bedrag | decimal | Ja | - |
| datum | date (ISO) | Ja | - |
| rentetype | integer | Ja | - |
| kosten | decimal | Nee | 0 |
| opslag | decimal | Nee* | - |
| opslag_ingangsdatum | date | Nee | datum |

*Verplicht bij rentetype 6 of 7

### Deelbetaling (request)

| Veld | Type | Verplicht | Default |
|------|------|-----------|---------|
| kenmerk | string | Nee | - |
| bedrag | decimal | Ja | - |
| datum | date (ISO) | Ja | - |
| aangewezen | array | Nee | [] |

### Rentetype codes

| Code | Beschrijving |
|------|--------------|
| 1 | Wettelijke rente samengesteld |
| 2 | Handelsrente samengesteld |
| 3 | Wettelijke rente enkelvoudig |
| 4 | Handelsrente enkelvoudig |
| 5 | Contractueel vast percentage |
| 6 | Wettelijke rente + opslag |
| 7 | Handelsrente + opslag |

### Strategie codes

| Code | Beschrijving |
|------|--------------|
| A | Meest bezwarend (hoogste rente%) - DEFAULT |
| B | Oudste eerst (vroegste datum) |

---

## Errors

```json
{
  "error": true,
  "code": "INVALID_DATE",
  "message": "Datum moet in ISO formaat (YYYY-MM-DD)"
}
```

| Code | Beschrijving |
|------|--------------|
| INVALID_DATE | Ongeldige datum |
| INVALID_RENTETYPE | Onbekend rentetype |
| MISSING_OPSLAG | Opslag verplicht bij type 6/7 |
| NEGATIVE_AMOUNT | Negatief bedrag |
| UNKNOWN_VORDERING | Aangewezen vordering niet gevonden |
