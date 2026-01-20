# SPEC: RBAC Feature — Rentetool

## Overzicht
Hiërarchisch rechtensysteem met cascading rechten: admin ziet alles, org_admin ziet eigen domein, user ziet eigen data.

## Context
- **Type:** Feature toevoeging aan bestaande app
- **Doel:** Toegangscontrole en gebruikersbeheer per organisatie
- **Doelgroep:** Mix intern (superadmin) + klanten (advocatenkantoren met eigen beheerders)
- **Authenticatie:** Supabase Auth (al geïmplementeerd)

## Rollen & Rechten

| Rol | Ziet | Kan doen |
|-----|------|----------|
| **admin** | Alle users, alle cases, alle domeinen | Alles + rollen toekennen aan iedereen |
| **org_admin** | Users van eigen domein, alle cases van domein | Rollen toekennen binnen domein, cases overnemen |
| **user** | Eigen cases + gedeelde cases | Cases aanmaken/bewerken, delen met collega's |

## Features

### Must Have (MVP) - IMPLEMENTED
- [x] Rollen toekennen via UI (admin + org_admin)
- [x] RLS policies per rol in database
- [x] Rol-indicator in UI (gebruiker ziet eigen rol)
- [x] Admin dashboard: alle users van alle domeinen zien
- [x] Org_admin: users van eigen domein zien en beheren
- [x] Case transfer: org_admin kan case overnemen van collega

### Nice to Have (v1.1)
- [ ] Audit log van rol-wijzigingen
- [ ] Bulk rol-toekenning

## Data Model

### Nieuwe tabel: user_roles
```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'org_admin', 'user')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);
```

### Relaties
```
auth.users 1──1 user_profiles (email, domein)
auth.users 1──N user_roles (meerdere rollen mogelijk)
user_profiles.email_domain ──── org_admin scope
```

### Helper Functions
- `has_role(user_id, role)` - Check if user has a specific role
- `is_admin(user_id)` - Check if user is admin
- `is_org_admin_for_domain(user_id, domain)` - Check org_admin status
- `get_user_domain(user_id)` - Get user's email domain

## API Endpoints

### Admin Check
- `GET /api/admin/check` - Returns `{is_admin, is_org_admin, roles, domain}`

### User Management
- `GET /api/admin/users` - List users (filtered by domain for org_admin)
- `GET /api/admin/users/{id}/roles` - Get user's roles
- `POST /api/admin/users/{id}/roles` - Assign role
- `DELETE /api/admin/users/{id}/roles/{role}` - Remove role

### Case Transfer
- `POST /api/admin/cases/{id}/transfer` - Transfer case ownership

## User Flows

### Admin kent org_admin toe
1. Admin logt in → ziet alle users gegroepeerd per domein
2. Klikt op user → ziet profiel + huidige rol in dropdown
3. Selecteert "Org Beheerder" uit dropdown
4. Bevestigt wijziging → rol opgeslagen
5. User krijgt org_admin rechten

### Org_admin beheert team
1. Org_admin logt in → ziet "Beheer" link in header
2. Gaat naar /admin → ziet alleen eigen domein users
3. Kan rollen wijzigen (user ↔ org_admin)
4. Kan alle cases van domein inzien (read-only)
5. Kan case "overnemen" (transfer naar zichzelf) om te bewerken

## Constraints & Regels
- User mag NOOIT data van ander domein zien
- Org_admin mag NOOIT admin-rol toekennen
- Rol wijzigen ALTIJD met bevestigingsdialog
- Default rol voor nieuwe users: 'user'
- Eigen rol kan niet gewijzigd worden

## Technische Context
- Backend: FastAPI (Python) + Supabase
- Frontend: Next.js 14
- Database: PostgreSQL (Supabase)
- Auth: Supabase Auth

## Kritieke Bestanden
- `/supabase/migrations/004_rbac.sql` - Database migratie
- `/backend/app/api/admin.py` - Admin API endpoints
- `/frontend/src/lib/api.ts` - Frontend API functies
- `/frontend/src/app/admin/page.tsx` - Admin UI
- `/frontend/src/components/header.tsx` - Header met Beheer link

## Verificatie
1. Maak testuser aan → default rol = 'user'
2. Als admin: ken org_admin rol toe
3. Log in als org_admin → zie "Beheer" link in header
4. Ga naar /admin → zie alleen eigen domein
5. Als org_admin: ken user rol toe aan collega
6. Probeer als org_admin admin-rol te geven → moet falen
7. Als user: geen "Beheer" link zichtbaar
