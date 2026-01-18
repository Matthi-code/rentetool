# 07 - RENTETYPES

## Overzicht

| Code | Naam | Basis | Kapitalisatie | Extra invoer |
|------|------|-------|---------------|--------------|
| **1** | Wettelijke rente samengesteld | Wettelijk tabel | Jaarlijks | - |
| **2** | Handelsrente samengesteld | Handels tabel | Jaarlijks | - |
| **3** | Wettelijke rente enkelvoudig | Wettelijk tabel | Geen | - |
| **4** | Handelsrente enkelvoudig | Handels tabel | Geen | - |
| **5** | Contractueel vast | Invoer | Keuze | percentage |
| **6** | Wettelijke + opslag | Wettelijk + opslag | Keuze | opslag%, ingangsdatum |
| **7** | Handelsrente + opslag | Handels + opslag | Keuze | opslag%, ingangsdatum |

---

## Type 1: Wettelijke rente samengesteld

**Wettelijke basis:** Art. 6:119 en 6:119 lid 2 BW

- Percentage uit wettelijke tabel
- Kapitalisatie: jaarlijks op verjaardag vordering
- Gebruik: particuliere vorderingen

**Huidig percentage (2026):** 4%

---

## Type 2: Handelsrente samengesteld

**Wettelijke basis:** Art. 6:119a BW

- Percentage uit handelsrente tabel (ECB-rente + opslag)
- Kapitalisatie: jaarlijks op verjaardag vordering
- Gebruik: B2B vorderingen

**Huidig percentage (2026):** 10,15%

---

## Type 3: Wettelijke rente enkelvoudig

- Percentage uit wettelijke tabel
- Geen kapitalisatie (rente alleen over oorspronkelijke hoofdsom)
- Gebruik: wanneer geen samengestelde rente gewenst

---

## Type 4: Handelsrente enkelvoudig

- Percentage uit handelsrente tabel
- Geen kapitalisatie
- Gebruik: B2B zonder samengestelde rente

---

## Type 5: Contractueel vast percentage

**Invoer vereist:**
- `percentage`: vast rentepercentage (bijv. 0.05 voor 5%)
- `kapitalisatie`: "samengesteld" of "enkelvoudig"

**Gebruik:** wanneer partijen contractueel een ander percentage hebben afgesproken

---

## Type 6: Wettelijke rente + opslag

**Invoer vereist:**
- `opslag`: extra percentage bovenop wettelijke rente
- `opslag_ingangsdatum`: (optioneel) wanneer opslag ingaat, default = startdatum
- `kapitalisatie`: (optioneel) default = samengesteld

**Werking:**
```
Effectief% = Wettelijke_rente% + Opslag%
```

De opslag beweegt mee met wijzigingen in de wettelijke rente.

**Voorbeeld:**
```
Vordering: € 10.000 op 01-01-2023
Opslag: 2% vanaf 01-04-2023

01-01-2023 - 31-03-2023: 4% + 0% = 4%
01-04-2023 - 30-06-2023: 4% + 2% = 6%
01-07-2023 - 31-12-2023: 6% + 2% = 8%
01-01-2024 - heden:      7% + 2% = 9%
```

---

## Type 7: Handelsrente + opslag

**Invoer vereist:**
- `opslag`: extra percentage bovenop handelsrente
- `opslag_ingangsdatum`: (optioneel) wanneer opslag ingaat
- `kapitalisatie`: (optioneel) default = samengesteld

**Werking:**
```
Effectief% = Handelsrente% + Opslag%
```

---

## Kapitalisatie

### Samengesteld (type 1, 2, 6, 7 default)

Op elke verjaardag van de vordering:
1. Opgebouwde rente wordt bij hoofdsom opgeteld
2. Nieuwe rente wordt berekend over hogere hoofdsom

**Formule:**
```
Nieuwe_hoofdsom = Oude_hoofdsom + Opgebouwde_rente
```

### Enkelvoudig (type 3, 4)

- Rente wordt alleen berekend over oorspronkelijke hoofdsom
- Geen kapitalisatie

---

## Beslisschema

```
Welk type rente?
      │
      ├─► Wettelijk/Handels (geen opslag)
      │         │
      │         ├─► Particulier ──► Samengesteld? ──► Type 1 (ja) / Type 3 (nee)
      │         └─► B2B ──────────► Samengesteld? ──► Type 2 (ja) / Type 4 (nee)
      │
      ├─► Contractueel vast percentage ──────────────► Type 5
      │
      └─► Wettelijk/Handels + opslag
                │
                ├─► Wettelijk basis ──► Type 6
                └─► Handels basis ────► Type 7
```

---

## Invoervelden samenvatting

| Type | percentage | opslag | opslag_ingangsdatum | kapitalisatie |
|------|------------|--------|---------------------|---------------|
| 1 | Automatisch | - | - | Samengesteld (vast) |
| 2 | Automatisch | - | - | Samengesteld (vast) |
| 3 | Automatisch | - | - | Enkelvoudig (vast) |
| 4 | Automatisch | - | - | Enkelvoudig (vast) |
| 5 | Invoer | - | - | Keuze |
| 6 | Automatisch | Invoer | Optioneel | Keuze (default: samengesteld) |
| 7 | Automatisch | Invoer | Optioneel | Keuze (default: samengesteld) |
