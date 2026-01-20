"""
Admin API routes - restricted to admin and org_admin users
"""
from typing import List, Literal
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()


def get_db():
    """Get Supabase client."""
    return get_supabase_client()


def get_user_roles(db, user_id: str) -> list[str]:
    """Get all roles for a user."""
    try:
        roles = db.table('user_roles').select('role').eq('user_id', user_id).execute()
        return [r['role'] for r in roles.data] if roles.data else []
    except:
        return []


def get_user_domain(db, user_id: str) -> str | None:
    """Get email domain for a user."""
    try:
        profile = db.table('user_profiles').select('email_domain').eq('id', user_id).execute()
        return profile.data[0]['email_domain'] if profile.data else None
    except:
        return None


async def require_admin(user_id: str = Depends(get_current_user)) -> str:
    """Verify user is an admin."""
    db = get_db()
    roles = get_user_roles(db, user_id)

    if 'admin' not in roles:
        raise HTTPException(status_code=403, detail="Geen admin rechten")

    return user_id


async def require_admin_or_org_admin(user_id: str = Depends(get_current_user)) -> tuple[str, list[str], str | None]:
    """Verify user is admin or org_admin. Returns (user_id, roles, domain)."""
    db = get_db()
    roles = get_user_roles(db, user_id)
    domain = get_user_domain(db, user_id)

    if 'admin' not in roles and 'org_admin' not in roles:
        raise HTTPException(status_code=403, detail="Geen beheerrechten")

    return (user_id, roles, domain)


class AdminStats(BaseModel):
    total_users: int
    total_cases: int
    total_calculations: int
    total_pdf_views: int


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(admin_id: str = Depends(require_admin)):
    """Get overall system statistics."""
    db = get_db()

    # Count users
    users = db.table('user_profiles').select('id', count='exact').execute()
    total_users = users.count or 0

    # Count cases
    cases = db.table('cases').select('id', count='exact').execute()
    total_cases = cases.count or 0

    # Count usage logs
    try:
        calculations = db.table('usage_logs').select('id', count='exact').eq('action_type', 'calculation').execute()
        total_calculations = calculations.count or 0

        pdf_views = db.table('usage_logs').select('id', count='exact').eq('action_type', 'pdf_view').execute()
        total_pdf_views = pdf_views.count or 0
    except:
        total_calculations = 0
        total_pdf_views = 0

    return AdminStats(
        total_users=total_users,
        total_cases=total_cases,
        total_calculations=total_calculations,
        total_pdf_views=total_pdf_views
    )


class UserStats(BaseModel):
    id: str
    email: str
    display_name: str | None
    email_domain: str
    created_at: datetime
    roles: list[str]
    cases_count: int
    shared_with_count: int
    calculations_count: int
    pdf_views_count: int
    last_activity: datetime | None


@router.get("/users", response_model=List[UserStats])
async def list_users(auth_info: tuple = Depends(require_admin_or_org_admin)):
    """List users with their statistics. Admin sees all, org_admin sees own domain."""
    user_id, roles, domain = auth_info
    db = get_db()
    is_admin = 'admin' in roles

    # Get user profiles (filtered by domain for org_admin)
    query = db.table('user_profiles').select('*')
    if not is_admin:
        query = query.eq('email_domain', domain)
    profiles = query.order('created_at', desc=True).execute()

    # Get all usage counts in bulk
    try:
        all_usage = db.table('usage_logs').select('user_id, action_type').execute()
        usage_by_user: dict[str, dict[str, int]] = {}
        for log in all_usage.data:
            uid = log.get('user_id')
            if uid:
                if uid not in usage_by_user:
                    usage_by_user[uid] = {'calculation': 0, 'pdf_view': 0}
                action = log.get('action_type')
                if action in usage_by_user[uid]:
                    usage_by_user[uid][action] += 1
    except:
        usage_by_user = {}

    # Get all roles in bulk
    try:
        all_roles = db.table('user_roles').select('user_id, role').execute()
        roles_by_user: dict[str, list[str]] = {}
        for r in all_roles.data:
            uid = r.get('user_id')
            if uid:
                if uid not in roles_by_user:
                    roles_by_user[uid] = []
                roles_by_user[uid].append(r['role'])
    except:
        roles_by_user = {}

    result = []
    for profile in profiles.data:
        uid = profile['id']

        # Count cases owned by this user
        cases = db.table('cases').select('id', count='exact').eq('user_id', uid).execute()
        cases_count = cases.count or 0

        # Count cases shared with this user
        try:
            shares = db.table('case_shares').select('id', count='exact').eq('shared_with_user_id', uid).execute()
            shared_with_count = shares.count or 0
        except:
            shared_with_count = 0

        # Get usage counts
        user_usage = usage_by_user.get(uid, {'calculation': 0, 'pdf_view': 0})

        # Get last activity from usage_logs
        try:
            last_log = db.table('usage_logs').select('created_at').eq('user_id', uid).order('created_at', desc=True).limit(1).execute()
            last_activity = last_log.data[0]['created_at'] if last_log.data else None
        except:
            last_activity = None

        result.append(UserStats(
            id=uid,
            email=profile['email'],
            display_name=profile.get('display_name'),
            email_domain=profile['email_domain'],
            created_at=profile['created_at'],
            roles=roles_by_user.get(uid, ['user']),
            cases_count=cases_count,
            shared_with_count=shared_with_count,
            calculations_count=user_usage['calculation'],
            pdf_views_count=user_usage['pdf_view'],
            last_activity=last_activity
        ))

    return result


@router.get("/check")
async def check_admin(user_id: str = Depends(get_current_user)):
    """Check user's admin/org_admin status and roles."""
    db = get_db()
    roles = get_user_roles(db, user_id)
    domain = get_user_domain(db, user_id)

    return {
        "is_admin": 'admin' in roles,
        "is_org_admin": 'org_admin' in roles,
        "roles": roles,
        "domain": domain
    }


class AdminCase(BaseModel):
    id: str
    naam: str
    klant_referentie: str | None
    einddatum: str
    owner_email: str
    vorderingen_count: int
    deelbetalingen_count: int
    created_at: datetime


@router.get("/cases", response_model=List[AdminCase])
async def list_all_cases(admin_id: str = Depends(require_admin)):
    """List all cases with owner info."""
    db = get_db()

    cases = db.table('cases').select(
        '*, vorderingen(count), deelbetalingen(count)'
    ).order('created_at', desc=True).execute()

    # Get owner emails
    user_ids = list(set(c['user_id'] for c in cases.data))
    users = db.table('user_profiles').select('id, email').in_('id', user_ids).execute()
    users_map = {u['id']: u['email'] for u in users.data}

    result = []
    for c in cases.data:
        vord_count = c.get('vorderingen', [{}])[0].get('count', 0) if c.get('vorderingen') else 0
        deel_count = c.get('deelbetalingen', [{}])[0].get('count', 0) if c.get('deelbetalingen') else 0

        result.append(AdminCase(
            id=c['id'],
            naam=c['naam'],
            klant_referentie=c.get('klant_referentie'),
            einddatum=c['einddatum'],
            owner_email=users_map.get(c['user_id'], 'onbekend'),
            vorderingen_count=vord_count,
            deelbetalingen_count=deel_count,
            created_at=c['created_at']
        ))

    return result


class AdminUsageLog(BaseModel):
    id: str
    user_email: str
    user_domain: str | None
    action_type: str
    case_id: str | None
    case_name: str | None
    created_at: datetime


@router.get("/usage-logs", response_model=List[AdminUsageLog])
async def list_usage_logs(admin_id: str = Depends(require_admin)):
    """List all usage logs with user info."""
    db = get_db()

    logs = db.table('usage_logs').select('*').order('created_at', desc=True).limit(500).execute()

    # Get user emails and domains
    user_ids = list(set(l['user_id'] for l in logs.data if l.get('user_id')))
    users = db.table('user_profiles').select('id, email, email_domain').in_('id', user_ids).execute() if user_ids else type('obj', (object,), {'data': []})()
    users_map = {u['id']: {'email': u['email'], 'domain': u.get('email_domain')} for u in users.data}

    result = []
    for l in logs.data:
        user_info = users_map.get(l.get('user_id'), {'email': 'onbekend', 'domain': None})
        result.append(AdminUsageLog(
            id=l['id'],
            user_email=user_info['email'],
            user_domain=user_info['domain'],
            action_type=l['action_type'],
            case_id=l.get('case_id'),
            case_name=l.get('case_name'),
            created_at=l['created_at']
        ))

    return result


@router.post("/sync-profiles")
async def sync_user_profiles(admin_id: str = Depends(require_admin)):
    """Sync user_profiles with auth.users - create missing profiles."""
    db = get_db()

    # Get all existing profile IDs
    profiles = db.table('user_profiles').select('id').execute()
    profile_ids = {p['id'] for p in profiles.data}

    # We can't directly query auth.users from the API, but we can use the
    # Supabase admin API. For now, return the count of existing profiles.
    # The proper fix is to run the backfill SQL in Supabase dashboard.

    return {
        "profiles_count": len(profile_ids),
        "message": "Run this SQL in Supabase Dashboard to sync profiles: INSERT INTO public.user_profiles (id, email, display_name) SELECT id, email, split_part(email, '@', 1) FROM auth.users ON CONFLICT (id) DO NOTHING;"
    }


# =============
# Role Management Endpoints
# =============

class RoleAssignment(BaseModel):
    user_id: str
    role: Literal['user', 'org_admin', 'admin']


class UserRole(BaseModel):
    id: str
    user_id: str
    role: str
    granted_by: str | None
    granted_at: datetime


@router.get("/users/{user_id}/roles", response_model=List[str])
async def get_user_roles_endpoint(user_id: str, auth_info: tuple = Depends(require_admin_or_org_admin)):
    """Get roles for a specific user."""
    current_user_id, roles, domain = auth_info
    db = get_db()
    is_admin = 'admin' in roles

    # Check if org_admin has access to this user
    if not is_admin:
        target_domain = get_user_domain(db, user_id)
        if target_domain != domain:
            raise HTTPException(status_code=403, detail="Geen toegang tot deze gebruiker")

    user_roles = get_user_roles(db, user_id)
    return user_roles


@router.post("/users/{user_id}/roles")
async def assign_role(user_id: str, assignment: RoleAssignment, auth_info: tuple = Depends(require_admin_or_org_admin)):
    """Assign a role to a user."""
    current_user_id, roles, domain = auth_info
    db = get_db()
    is_admin = 'admin' in roles

    # Validate role assignment permissions
    target_domain = get_user_domain(db, user_id)

    # Only admin can assign admin role
    if assignment.role == 'admin' and not is_admin:
        raise HTTPException(status_code=403, detail="Alleen admin kan admin-rol toekennen")

    # Org_admin can only assign roles within own domain
    if not is_admin:
        if target_domain != domain:
            raise HTTPException(status_code=403, detail="Kan alleen rollen toekennen aan gebruikers in eigen domein")

    # Check if role already exists
    existing = db.table('user_roles').select('id').eq('user_id', user_id).eq('role', assignment.role).execute()
    if existing.data:
        return {"message": f"Gebruiker heeft al de rol '{assignment.role}'", "success": True}

    # Assign role
    result = db.table('user_roles').insert({
        'user_id': user_id,
        'role': assignment.role,
        'granted_by': current_user_id
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Kon rol niet toekennen")

    return {"message": f"Rol '{assignment.role}' toegekend", "success": True}


@router.delete("/users/{user_id}/roles/{role}")
async def remove_role(user_id: str, role: str, auth_info: tuple = Depends(require_admin_or_org_admin)):
    """Remove a role from a user."""
    current_user_id, roles, domain = auth_info
    db = get_db()
    is_admin = 'admin' in roles

    # Validate role removal permissions
    target_domain = get_user_domain(db, user_id)

    # Only admin can remove admin role
    if role == 'admin' and not is_admin:
        raise HTTPException(status_code=403, detail="Alleen admin kan admin-rol verwijderen")

    # Org_admin can only remove roles within own domain
    if not is_admin:
        if target_domain != domain:
            raise HTTPException(status_code=403, detail="Kan alleen rollen verwijderen van gebruikers in eigen domein")

    # Prevent removing last role
    current_roles = get_user_roles(db, user_id)
    if len(current_roles) <= 1 and role in current_roles:
        raise HTTPException(status_code=400, detail="Kan laatste rol niet verwijderen")

    # Remove role
    result = db.table('user_roles').delete().eq('user_id', user_id).eq('role', role).execute()

    return {"message": f"Rol '{role}' verwijderd", "success": True}


# =============
# Case Transfer Endpoint (org_admin takes over a case)
# =============

# =============
# Domain Statistics Endpoint
# =============

# List of known consumer/free email domains
CONSUMER_DOMAINS = {
    # Google
    'gmail.com', 'googlemail.com',
    # Microsoft
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'hotmail.nl', 'live.nl', 'outlook.nl',
    # Yahoo
    'yahoo.com', 'yahoo.nl', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
    # Apple
    'icloud.com', 'me.com', 'mac.com',
    # Telecom NL
    'kpnmail.nl', 'kpnplanet.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'ziggo.nl', 'upcmail.nl',
    'xs4all.nl', 'casema.nl', 'chello.nl', 'quicknet.nl', 'tele2.nl', 'online.nl', 'solcon.nl',
    # Telecom international
    'btinternet.com', 'sky.com', 'virgin.net', 'aol.com', 'comcast.net', 'verizon.net', 'att.net',
    # European providers
    'gmx.com', 'gmx.de', 'gmx.net', 'web.de', 'freenet.de', 't-online.de', 'arcor.de',
    'orange.fr', 'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr',
    'libero.it', 'virgilio.it', 'alice.it', 'tin.it', 'tiscali.it',
    # Privacy/secure email
    'protonmail.com', 'proton.me', 'tutanota.com', 'tutamail.com',
    # Other free providers
    'mail.com', 'email.com', 'usa.com', 'consultant.com', 'europe.com',
    'post.com', 'techie.com', 'writeme.com', 'dr.com', 'engineer.com',
    'zoho.com', 'yandex.com', 'yandex.ru', 'mail.ru', 'inbox.com',
}


class DomainStats(BaseModel):
    domain: str
    is_consumer: bool
    users_count: int
    cases_count: int
    calculations_count: int
    pdf_views_count: int
    has_org_admin: bool


class DomainOverview(BaseModel):
    total_domains: int
    organization_domains: int
    consumer_domains: int
    domains: List[DomainStats]


@router.get("/domains", response_model=DomainOverview)
async def get_domain_stats(admin_id: str = Depends(require_admin)):
    """Get domain statistics overview (admin only)."""
    db = get_db()

    # Get all user profiles with their domains
    profiles = db.table('user_profiles').select('id, email_domain').execute()

    # Count users per domain
    domain_users: dict[str, list[str]] = {}
    for p in profiles.data:
        domain = p['email_domain']
        if domain not in domain_users:
            domain_users[domain] = []
        domain_users[domain].append(p['id'])

    # Get all roles to check for org_admins
    all_roles = db.table('user_roles').select('user_id, role').execute()
    org_admins_by_domain: dict[str, bool] = {}
    for r in all_roles.data:
        if r['role'] == 'org_admin':
            # Find domain for this user
            for p in profiles.data:
                if p['id'] == r['user_id']:
                    org_admins_by_domain[p['email_domain']] = True
                    break

    # Get cases count per user
    cases = db.table('cases').select('user_id').execute()
    cases_by_user: dict[str, int] = {}
    for c in cases.data:
        uid = c['user_id']
        cases_by_user[uid] = cases_by_user.get(uid, 0) + 1

    # Get usage logs
    try:
        usage = db.table('usage_logs').select('user_id, action_type').execute()
        calcs_by_user: dict[str, int] = {}
        pdfs_by_user: dict[str, int] = {}
        for u in usage.data:
            uid = u.get('user_id')
            if uid:
                if u['action_type'] == 'calculation':
                    calcs_by_user[uid] = calcs_by_user.get(uid, 0) + 1
                elif u['action_type'] == 'pdf_view':
                    pdfs_by_user[uid] = pdfs_by_user.get(uid, 0) + 1
    except:
        calcs_by_user = {}
        pdfs_by_user = {}

    # Build domain stats
    domains: list[DomainStats] = []
    for domain, user_ids in domain_users.items():
        is_consumer = domain.lower() in CONSUMER_DOMAINS
        cases_count = sum(cases_by_user.get(uid, 0) for uid in user_ids)
        calcs_count = sum(calcs_by_user.get(uid, 0) for uid in user_ids)
        pdfs_count = sum(pdfs_by_user.get(uid, 0) for uid in user_ids)

        domains.append(DomainStats(
            domain=domain,
            is_consumer=is_consumer,
            users_count=len(user_ids),
            cases_count=cases_count,
            calculations_count=calcs_count,
            pdf_views_count=pdfs_count,
            has_org_admin=org_admins_by_domain.get(domain, False),
        ))

    # Sort: organizations first, then by user count
    domains.sort(key=lambda d: (d.is_consumer, -d.users_count))

    org_count = sum(1 for d in domains if not d.is_consumer)
    consumer_count = sum(1 for d in domains if d.is_consumer)

    return DomainOverview(
        total_domains=len(domains),
        organization_domains=org_count,
        consumer_domains=consumer_count,
        domains=domains,
    )


@router.get("/consumer-domains")
async def get_consumer_domains(admin_id: str = Depends(require_admin)):
    """Get list of known consumer/free email domains."""
    return {"domains": sorted(CONSUMER_DOMAINS)}


# =============
# View as User Endpoints (Admin only)
# =============

class UserProfile(BaseModel):
    id: str
    email: str
    display_name: str | None
    email_domain: str
    created_at: datetime
    roles: list[str]


class UserCaseDetail(BaseModel):
    id: str
    naam: str
    klant_referentie: str | None
    einddatum: str
    strategie: str
    vorderingen_count: int
    deelbetalingen_count: int
    created_at: datetime
    updated_at: datetime


class ViewAsUserResponse(BaseModel):
    user: UserProfile
    cases: list[UserCaseDetail]
    stats: dict


@router.get("/view-as-user/{user_id}", response_model=ViewAsUserResponse)
async def view_as_user(user_id: str, admin_id: str = Depends(require_admin)):
    """Get full view of a user's data (admin only). Used to see what a user sees."""
    db = get_db()

    # Get user profile
    profile = db.table('user_profiles').select('*').eq('id', user_id).execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")

    user_data = profile.data[0]

    # Get user roles
    roles = get_user_roles(db, user_id)

    # Get user's cases with counts
    cases = db.table('cases').select(
        '*, vorderingen(count), deelbetalingen(count)'
    ).eq('user_id', user_id).order('updated_at', desc=True).execute()

    case_list = []
    for c in cases.data:
        vord_count = c.get('vorderingen', [{}])[0].get('count', 0) if c.get('vorderingen') else 0
        deel_count = c.get('deelbetalingen', [{}])[0].get('count', 0) if c.get('deelbetalingen') else 0

        case_list.append(UserCaseDetail(
            id=c['id'],
            naam=c['naam'],
            klant_referentie=c.get('klant_referentie'),
            einddatum=c['einddatum'],
            strategie=c.get('strategie', 'A'),
            vorderingen_count=vord_count,
            deelbetalingen_count=deel_count,
            created_at=c['created_at'],
            updated_at=c['updated_at'],
        ))

    # Get user stats
    try:
        calcs = db.table('usage_logs').select('id', count='exact').eq('user_id', user_id).eq('action_type', 'calculation').execute()
        pdfs = db.table('usage_logs').select('id', count='exact').eq('user_id', user_id).eq('action_type', 'pdf_view').execute()
        stats = {
            'calculations_count': calcs.count or 0,
            'pdf_views_count': pdfs.count or 0,
            'cases_count': len(case_list),
        }
    except:
        stats = {
            'calculations_count': 0,
            'pdf_views_count': 0,
            'cases_count': len(case_list),
        }

    return ViewAsUserResponse(
        user=UserProfile(
            id=user_data['id'],
            email=user_data['email'],
            display_name=user_data.get('display_name'),
            email_domain=user_data['email_domain'],
            created_at=user_data['created_at'],
            roles=roles,
        ),
        cases=case_list,
        stats=stats,
    )


@router.post("/cases/{case_id}/transfer")
async def transfer_case(case_id: str, auth_info: tuple = Depends(require_admin_or_org_admin)):
    """Transfer a case to the current user (org_admin takes over)."""
    current_user_id, roles, domain = auth_info
    db = get_db()
    is_admin = 'admin' in roles

    # Get case info
    case = db.table('cases').select('user_id').eq('id', case_id).execute()
    if not case.data:
        raise HTTPException(status_code=404, detail="Zaak niet gevonden")

    original_owner_id = case.data[0]['user_id']

    # Check if org_admin has access to this case
    if not is_admin:
        owner_domain = get_user_domain(db, original_owner_id)
        if owner_domain != domain:
            raise HTTPException(status_code=403, detail="Geen toegang tot deze zaak")

    # Check if already owner
    if original_owner_id == current_user_id:
        return {"message": "U bent al eigenaar van deze zaak", "success": True}

    # Transfer case
    result = db.table('cases').update({
        'user_id': current_user_id
    }).eq('id', case_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Kon zaak niet overdragen")

    return {"message": "Zaak overgedragen", "success": True, "previous_owner_id": original_owner_id}
