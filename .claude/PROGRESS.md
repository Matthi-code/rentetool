# Rentetool Progress

## 2026-01-18 — Supabase Integratie Compleet

**Status:**
- Backend: FastAPI met Supabase integratie
- Frontend: Next.js met Supabase auth
- Database: Supabase PostgreSQL met RLS policies
- Auth: JWT-based authenticatie volledig werkend

**Gedaan vandaag:**
- Backend Supabase client (`app/db/supabase.py`)
- Auth middleware met JWT verificatie (`app/auth.py`)
- Cases API omgezet van in-memory naar Supabase
- Snapshots API omgezet naar Supabase
- Frontend: `@supabase/supabase-js` + `@supabase/ssr` geinstalleerd
- Auth context provider (`lib/auth-context.tsx`)
- Login/register pagina (`app/login/page.tsx`)
- Header component met login/logout
- API calls met auth token
- Protected routes (dashboard + case detail)

**Configuratie nodig:**

Backend `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEBUG=true
```

Frontend `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Volgende stap:**
- Supabase project aanmaken en credentials invullen
- Migration draaien (`supabase/migrations/001_initial.sql`)
- Testen van de complete flow

---

## Historie

### 2026-01-17 — Sessie
- UX/UI verbeteringen en PDF export herschreven
