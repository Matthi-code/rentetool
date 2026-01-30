# Progress Log

## 2026-01-22 — Sessie (15:00)

**Gedaan:**
- Specificatie per vordering verbeterd:
  - Subtotaal regel toegevoegd vóór betaling (cumulatieve rente tot dat punt)
  - Resterende rente na betaling wordt getoond als niet alles is afgelost
  - Totaal regel toegevoegd onderaan elke specificatie tabel
  - Backend: `opgebouwd_voor` veld toegevoegd aan rente-toerekeningen
- Help pagina uitgebreid:
  - Uitleg evenredige/proportionele verdeling met concreet voorbeeld
  - Verduidelijkt waarom niet alle rente van één vordering wordt afgelost bij meerdere vorderingen
- Build fix: ongebruikte variabelen verwijderd (STRATEGIE_LABELS, handleUpdateStrategie)
- Vercel deploy geforceerd (--force) na eerdere build errors
- Cleanup: oude screenshots verwijderd, migrations toegevoegd

**Commits:**
- `21f9679` Add subtotaal and totaal rows to specification tables
- `cced981` Cleanup and add migrations
- `79fef21` Fix: remove unused STRATEGIE_LABELS and handleUpdateStrategie

**Huidige staat:**
- Productie live op https://rentetool1.jmtest.nl
- Backend live op https://rentetool-api.fly.dev

**Known issue:**
- Chrome heeft soms problemen met login/backend (cache?), Brave en Firefox werken wel

**Volgende stap:**
- Chrome login/backend probleem onderzoeken
- Dependencies updaten (ESLint 9, etc.) - voorzichtig, major versions
- RBAC/Sharing feature implementeren

---

## 2026-01-22 — Checkpoint (01:00)

**Gedaan deze sessie:**
- Help pagina aangepast:
  - Strategie B verwijderd (alleen strategie "Meest Bezwarend" over)
  - "A" weggehaald uit strategie naam
  - "1 januari en 1 juli" vervangen door "rentewijzigingen"
- PDF generator aangepast:
  - "Kosten" en "Afg. Kst" kolommen verwijderd uit overzichtstabel
  - Datum formaat gewijzigd naar "van t/m" (inclusieve einddatum)
  - `format_datum_tm()` functie toegevoegd

**Huidige staat:**
- Frontend en backend wijzigingen klaar voor deploy

---

## 2026-01-22 — Checkpoint (00:30)

**Gedaan deze sessie:**
- UI verbeteringen overzicht per vordering:
  - Samenvatting toont nu "X vorderingen, Y kostenposten" apart (ipv "Z vorderingen")
  - Groene balk bij betaling zachter gemaakt (bg-green-100 ipv bg-green-600)
  - Euro uitlijning verbeterd: gap-2 tussen € en bedrag, vaste breedte (5rem) voor bedragen
  - Kolommen "Kosten" en "Afg. Kst" verwijderd uit overzicht tabel
  - Euro uitlijning ook toegepast op vorderingen en deelbetalingen tabellen
- Backend toerekening aangepast:
  - Volgorde nu: rente kosten → kosten → rente hoofdsom → hoofdsom
  - Evenredige verdeling geïmplementeerd bij gelijke vorderingen (zelfde rente% én startdatum)

**Huidige staat:**
- App volledig functioneel
- Commit 60d4b2b gepusht naar GitHub
- Auto-deploy naar Vercel en Fly.io

**Volgende stap:**
- RBAC feature verder implementeren

---

## 2026-01-21 — Checkpoint (00:15)

**Gedaan deze sessie:**
- `kosten_rentedatum` feature geïmplementeerd (aparte rentedatum voor kosten)
- `periodes_kosten` toegevoegd aan API response en frontend (detail renteperiodes kosten)
- UI verbeteringen:
  - Euro-teken uitlijning met `formatBedragParts` in tabellen
  - Monospace fonts voor kenmerken
  - Klokje (⏱) voor kosten met afwijkende rentedatum
  - Groene betaling-balk leesbaarder (donkergroen + wit)
  - Kosten veld placeholder fix
- Performance: localStorage caching voor dashboard/cases
- Einddatum input fix (onBlur ipv onChange)

**Status:**
- Rente-bug gefixed met `Number()` wrappers

---

## 2026-01-18 — Checkpoint (22:45)

**Gedaan deze sessie:**
- Case sharing feature database migratie uitgevoerd:
  - `user_profiles` tabel aangemaakt (email domein voor collega-detectie)
  - `case_shares` tabel aangemaakt (delen met view/edit permissies)
  - RLS policies voor beveiliging
  - Backfill bestaande users
- Backend graceful degradation toegevoegd:
  - `list_cases()` en `get_case()` werken nu ook zonder sharing tabellen
  - `_sharing_tables_exist()` helper functie
- Frontend .env.local gefixed (wees naar localhost ipv productie)
- PDF verbeteringen:
  - Nieuwe iconen voor kapitalisatie en betaling toegevoegd
  - Lettergrootte resultaatblokken verkleind (10/11 ipv 12/14)
- Versienummer v0.1 toegevoegd in footer

**Huidige staat:**
- App volledig functioneel lokaal
- Sharing tabellen aangemaakt in Supabase
- 2 users in user_profiles (zelfde domein gcon.nl)
- PDF layout verbeterd en getest

**Volgende stap:**
- Sharing UI implementeren (ShareCaseDialog component)
- SharedBadge in dashboard toevoegen
- Deploy naar productie met nieuwe sharing feature

---

## 2026-01-18 — Checkpoint (20:00)

**Gedaan tot nu toe:**
- Supabase integratie compleet (auth, cases, vorderingen, deelbetalingen)
- Backend deployed naar Fly.io (https://rentetool-api.fly.dev)
- Frontend deployed naar Vercel (https://rentetool1.jmtest.nl)
- PDF generatie werkend met ReportLab
- PDF preview functionaliteit in webapp (dialog met download optie)
- Banner gewijzigd naar "TEST-versie - Alleen voor test doeleinden"
- Gans logo toegevoegd in header (vervangt de "R")
- JetBrains Mono font toegevoegd voor betere leesbaarheid cijfers
- Rentetype badge per vordering (bijv. "Wettelijk +1%")
- PDF layout gelijk getrokken met webapp:
  - Monospace font (Courier) in samenvatting blokken
  - Monospace font in Totaal Afgelost blok
  - Monospace font in invoertabellen
  - Legenda: ↻ = kapitalisatie, 💰 = betaling
- **Usage tracking geïmplementeerd:**
  - Database tabel `usage_logs` aangemaakt in Supabase
  - Backend API endpoints: `/api/usage/log`, `/api/usage/stats`, `/api/usage/logs`
  - Frontend logging bij berekening en PDF view
  - Per gebruiker worden berekeningen en PDF views gelogd met datum/tijdstip
