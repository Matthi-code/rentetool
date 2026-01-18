# 01 - FUNCTIONELE SPECIFICATIE

## Doel

Een wettelijke rente calculator voor het Nederlands recht, bedoeld als B2B SaaS-tool voor advocaten, incassobureaus en juridische afdelingen.

---

## Scope

### In scope

- Berekening wettelijke rente (art. 6:119 BW)
- Berekening handelsrente (art. 6:119a BW)
- Samengestelde rente met jaarlijkse kapitalisatie
- Enkelvoudige rente
- Contractuele rente (vast percentage)
- Wettelijke/handelsrente met opslag
- Verwerking deelbetalingen
- Meerdere vorderingen tegelijk
- Kosten (BIK, proceskosten)
- Aangewezen vorderingen bij betaling

### Buiten scope (v1)

- Valutaomrekening
- Buitenlandse rente
- Automatische dagvaarding generatie

---

## Invoer

### Vordering (type V)

| Veld | Type | Verplicht | Toelichting |
|------|------|-----------|-------------|
| type | string | Ja | "V" |
| bedrag | decimal | Ja | Hoofdsom in euro's |
| datum | date | Ja | Startdatum vordering |
| rentetype | integer | Ja | 1-7 (zie rentetypes) |
| kosten | decimal | Nee | BIK, proceskosten etc. |
| kenmerk | string | Nee | Factuurnummer of ID |
| opslag | decimal | Nee* | Alleen bij type 6/7 |
| opslag_ingangsdatum | date | Nee | Default: startdatum |

### Deelbetaling (type D)

| Veld | Type | Verplicht | Toelichting |
|------|------|-----------|-------------|
| type | string | Ja | "D" |
| bedrag | decimal | Ja | Ontvangen bedrag |
| datum | date | Ja | Datum ontvangst |
| kenmerk | string | Nee | Referentie |
| aangewezen | list | Nee | Lijst van vordering-kenmerken |

### Instellingen

| Veld | Type | Default | Opties |
|------|------|---------|--------|
| einddatum | date | Vandaag | - |
| strategie | string | "A" | A (meest bezwarend) / B (oudste) |

---

## Rentetypes

| Code | Naam | Basis | Kapitalisatie | Extra invoer |
|------|------|-------|---------------|--------------|
| 1 | Wettelijke samengesteld | Wettelijk tabel | Jaarlijks | - |
| 2 | Handelsrente samengesteld | Handels tabel | Jaarlijks | - |
| 3 | Wettelijke enkelvoudig | Wettelijk tabel | Geen | - |
| 4 | Handelsrente enkelvoudig | Handels tabel | Geen | - |
| 5 | Contractueel vast | Invoer | Keuze | percentage |
| 6 | Wettelijke + opslag | Wettelijk + opslag | Keuze | opslag%, ingangsdatum |
| 7 | Handelsrente + opslag | Handels + opslag | Keuze | opslag%, ingangsdatum |

---

## Betalingstoerekening

### Strategie A: Meest bezwarend (DEFAULT)

Betaling wordt eerst toegerekend aan vordering met hoogste rentepercentage.

**Wettelijke basis:** Art. 6:43 BW

### Strategie B: Oudste eerst

Betaling wordt eerst toegerekend aan oudste vordering (vroegste startdatum).

### Binnen een vordering (art. 6:44 BW)

Vaste volgorde:
1. Kosten
2. Rente
3. Hoofdsom

### Aangewezen vorderingen

Als schuldenaar een vordering aanwijst, gaat dit voor op de strategie.

---

## Output

### Per vordering

| Veld | Toelichting |
|------|-------------|
| kenmerk | Identificatie |
| oorspronkelijk_bedrag | Startbedrag |
| kosten | Ingevoerde kosten |
| totale_rente | Berekende rente |
| afgelost_hoofdsom | Afgelost via betalingen |
| afgelost_kosten | Afgeloste kosten |
| afgelost_rente | Afgeloste rente |
| openstaand | Huidig saldo |
| status | OPEN / VOLDAAN |

### Detail per periode

| Veld | Toelichting |
|------|-------------|
| start | Begindatum periode |
| eind | Einddatum periode |
| dagen | Aantal dagen |
| hoofdsom | Hoofdsom in periode |
| rente_pct | Rentepercentage |
| rente | Berekende rente |

### Totalen

| Veld | Toelichting |
|------|-------------|
| totaal_oorspronkelijk | Som hoofdsommen |
| totaal_kosten | Som kosten |
| totaal_rente | Som berekende rente |
| totaal_afgelost | Som alle aflossingen |
| totaal_openstaand | Eindsaldo |

---

## Validatie

### Controleformule

```
Openstaand = Oorspronkelijk + Kosten + Rente - Afgelost
```

Deze controle moet altijd kloppen (verschil < € 0,02).

---

## Edge cases

| Situatie | Gedrag |
|----------|--------|
| Verjaardag 29 februari | Gebruik 28 februari in niet-schrikkeljaren |
| Betaling op verjaardag | Eerst kapitaliseren, dan betaling verwerken |
| Betaling > schuld | Restant blijft ongebruikt |
| Vordering in toekomst | Geen rente vóór startdatum |
| Meerdere betalingen zelfde dag | Verwerk in invoervolgorde |
| Rentewijziging midden periode | Split periode op wijzigingsdatum |
