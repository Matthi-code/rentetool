# Beslissingen Log

## 2026-01-18

### PDF Library: ReportLab ipv WeasyPrint
- **Beslissing:** ReportLab gebruiken voor PDF generatie
- **Reden:** WeasyPrint vereist veel systeem dependencies (cairo, pango, etc). ReportLab is pure Python en werkt out-of-the-box.

### Deployment Stack
- **Backend:** Fly.io (Python/FastAPI)
- **Frontend:** Vercel (Next.js)
- **Database:** Supabase (PostgreSQL + Auth)
- **Reden:** Gratis tiers, goede DX, automatische deployments via GitHub

### Font Keuzes
- **Sans:** Inter (algemene tekst)
- **Serif:** Merriweather (headers)
- **Mono:** JetBrains Mono (bedragen/cijfers)
- **Reden:** Professionele uitstraling, goede leesbaarheid voor financiële data

### Gans Logo
- **Bestand:** Gans_Trans.png
- **Locatie:** Header links (vervangt "R" icoon)
- **Reden:** Gebruiker branding/identiteit

### Usage Tracking
- **Implementatie:** Supabase tabel `usage_logs` met RLS policies
- **Wat wordt gelogd:** `calculation` en `pdf_view` events per gebruiker
- **Data:** user_id, action_type, case_id, case_name, timestamp
- **Reden:** Inzicht in gebruik van de tool per gebruiker

### Case Sharing Architectuur
- **Tabellen:** `user_profiles` (email/domein), `case_shares` (case-user koppeling)
- **Permissies:** 'view' (alleen lezen) of 'edit' (bewerken)
- **Collega-detectie:** Zelfde email domein (bijv. @gcon.nl)
- **Graceful degradation:** Backend werkt ook zonder sharing tabellen
- **Reden:** Samenwerking binnen organisaties mogelijk maken

## 2026-01-22

### Toerekening Volgorde bij Betaling
- **Beslissing:** rente kosten → kosten → rente hoofdsom → hoofdsom
- **Reden:** Gebruiker preferentie; rente op kosten eerst aflossen voordat kosten zelf worden afgelost

### Evenredige Verdeling bij Gelijke Vorderingen
- **Beslissing:** Bij vorderingen met exact dezelfde rente% én startdatum wordt betaling evenredig verdeeld
- **Implementatie:** `_verdeel_evenredig()` en `_verwerk_vordering_groep()` helpers in RenteCalculator
- **Reden:** Eerlijke verdeling wanneer geen prioriteit kan worden bepaald
