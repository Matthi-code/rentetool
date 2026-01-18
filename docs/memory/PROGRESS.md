# Progress Log

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
