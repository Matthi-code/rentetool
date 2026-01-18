# Progress Log

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

**Huidige staat:**
- App is volledig functioneel
- Beide omgevingen (backend + frontend) zijn live
- Usage tracking werkt (getest en gevalideerd)

**Volgende stap:**
- Wachten op gebruiker feedback over PDF layout verbeteringen
- Eventuele verdere UI/UX verbeteringen
