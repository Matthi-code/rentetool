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

## 2026-03-02

### Supabase Client: @supabase/supabase-js ipv @supabase/ssr
- **Beslissing:** Singleton `createClient` van @supabase/supabase-js gebruiken ipv `createBrowserClient` van @supabase/ssr
- **Reden:** @supabase/ssr detecteert geen hash tokens (#access_token=...) in de URL, nodig voor magic link flow
- **Config:** `detectSessionInUrl: true`, `flowType: 'implicit'`

### Site URL: rentetool.jmtest.nl (zonder cijfer)
- **Beslissing:** rentetool1.jmtest.nl hernoemd naar rentetool.jmtest.nl
- **Reden:** Cleaner URL, cijfer was legacy

### Freemium: Pauze/Schorsing als Pro Feature
- **Beslissing:** Schorsing/uitstel van betaling alleen voor Pro gebruikers
- **Reden:** Waardevolle feature voor conversie, free users zien badge maar moeten upgraden

### Free Tier Dashboard: Geen Case Lijst
- **Beslissing:** Free users zien geen opgeslagen cases op dashboard, alleen "Nieuwe Zaak" knop
- **Reden:** Free kan niet opslaan, cases in backend blijven voor statistieken

## 2026-03-06

### Rentetabellen: Database als Single Source of Truth
- **Beslissing:** Hardcoded fallback rentetabel (`RENTETABEL_FALLBACK`) verwijderd
- **Reden:** Rentepercentages worden beheerd via admin panel → database is de enige bron
- **Effect:** Als database onbereikbaar is, geeft de API een duidelijke error ipv stale data

### dagen_jaar: Kapitalisatiejaar bepaalt 365 of 366
- **Beslissing:** Bij samengestelde rente wordt `dagen_jaar` bepaald op basis van het kapitalisatiejaar (verjaardag tot verjaardag), niet per subperiode
- **Reden:** Conform de wet is de kapitalisatieperiode altijd 1 jaar; alle tussenberekeningen horen bij dat jaar
- **Implementatie:** `dagen_in_kapitalisatiejaar(vordering_startdatum, subperiode_start)` functie

## 2026-01-22

### Toerekening Volgorde bij Betaling
- **Beslissing:** rente kosten → kosten → rente hoofdsom → hoofdsom
- **Reden:** Gebruiker preferentie; rente op kosten eerst aflossen voordat kosten zelf worden afgelost

### Evenredige Verdeling bij Gelijke Vorderingen
- **Beslissing:** Bij vorderingen met exact dezelfde rente% én startdatum wordt betaling evenredig verdeeld
- **Implementatie:** `_verdeel_evenredig()` en `_verwerk_vordering_groep()` helpers in RenteCalculator
- **Reden:** Eerlijke verdeling wanneer geen prioriteit kan worden bepaald
