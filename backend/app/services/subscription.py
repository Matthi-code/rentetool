"""
Subscription service - handles tier lookups and limit checks.
"""
import logging
from typing import Optional

from app.models.subscription import SubscriptionTier, UserTierResponse

logger = logging.getLogger(__name__)

# Default free tier (used when tables don't exist yet or query fails)
DEFAULT_FREE_TIER = SubscriptionTier(
    id='free',
    naam='Starter',
    max_vorderingen=3,
    max_deelbetalingen=1,
    mag_opslaan=False,
    mag_pdf_schoon=False,
    mag_snapshots=False,
    mag_sharing=False,
    prijs_per_maand=0,
)


def _subscription_tables_exist(db) -> bool:
    """Check if subscription tables exist."""
    try:
        db.table('subscription_tiers').select('id').limit(1).execute()
        return True
    except:
        return False


def get_user_tier(user_id: str, db) -> SubscriptionTier:
    """
    Get the active subscription tier for a user.

    Returns the free tier if:
    - No subscription exists
    - Subscription tables don't exist yet
    - Any error occurs
    """
    if user_id == "demo-user":
        # Demo user gets pro tier for development
        return SubscriptionTier(
            id='pro',
            naam='Professional',
            max_vorderingen=None,
            max_deelbetalingen=None,
            mag_opslaan=True,
            mag_pdf_schoon=True,
            mag_snapshots=True,
            mag_sharing=True,
        )

    if not _subscription_tables_exist(db):
        return DEFAULT_FREE_TIER

    try:
        # Get active subscription for user
        sub = db.table('user_subscriptions').select(
            'tier_id'
        ).eq('user_id', user_id).eq('status', 'active').order(
            'created_at', desc=True
        ).limit(1).execute()

        if sub.data:
            tier_id = sub.data[0]['tier_id']
        else:
            tier_id = 'free'

        # Get tier details
        tier = db.table('subscription_tiers').select('*').eq('id', tier_id).execute()

        if tier.data:
            return SubscriptionTier(**tier.data[0])

        return DEFAULT_FREE_TIER

    except Exception as e:
        logger.warning(f"Failed to get user tier for {user_id}: {e}")
        return DEFAULT_FREE_TIER


def get_user_tier_response(user_id: str, db) -> UserTierResponse:
    """Get user tier info formatted for frontend response."""
    tier = get_user_tier(user_id, db)
    return UserTierResponse(
        tier_id=tier.id,
        naam=tier.naam,
        max_vorderingen=tier.max_vorderingen,
        max_deelbetalingen=tier.max_deelbetalingen,
        mag_opslaan=tier.mag_opslaan,
        mag_pdf_schoon=tier.mag_pdf_schoon,
        mag_snapshots=tier.mag_snapshots,
        mag_sharing=tier.mag_sharing,
    )


def check_vordering_limit(user_id: str, case_id: str, db) -> Optional[str]:
    """
    Check if user can add another vordering.
    Returns error message if limit reached, None if OK.
    """
    tier = get_user_tier(user_id, db)

    if tier.max_vorderingen is None:
        return None  # Unlimited

    # Count current vorderingen for this case
    count = db.table('vorderingen').select('id', count='exact').eq('case_id', case_id).execute()
    current = count.count or 0

    if current >= tier.max_vorderingen:
        return f"Je hebt het maximum van {tier.max_vorderingen} vorderingen bereikt. Upgrade naar Pro voor onbeperkt."

    return None


def check_deelbetaling_limit(user_id: str, case_id: str, db) -> Optional[str]:
    """
    Check if user can add another deelbetaling.
    Returns error message if limit reached, None if OK.
    """
    tier = get_user_tier(user_id, db)

    if tier.max_deelbetalingen is None:
        return None  # Unlimited

    # Count current deelbetalingen for this case
    count = db.table('deelbetalingen').select('id', count='exact').eq('case_id', case_id).execute()
    current = count.count or 0

    if current >= tier.max_deelbetalingen:
        return f"Je hebt het maximum van {tier.max_deelbetalingen} deelbetaling(en) bereikt. Upgrade naar Pro voor onbeperkt."

    return None


def check_feature(user_id: str, feature: str, db) -> Optional[str]:
    """
    Check if user has access to a feature.
    Returns error message if not allowed, None if OK.

    Features: 'opslaan', 'pdf_schoon', 'snapshots', 'sharing'
    """
    tier = get_user_tier(user_id, db)

    feature_map = {
        'opslaan': (tier.mag_opslaan, "Dossiers opslaan"),
        'pdf_schoon': (tier.mag_pdf_schoon, "PDF zonder watermerk"),
        'snapshots': (tier.mag_snapshots, "Snapshots opslaan"),
        'sharing': (tier.mag_sharing, "Zaken delen"),
    }

    if feature not in feature_map:
        return None

    allowed, label = feature_map[feature]

    if not allowed:
        return f"{label} is alleen beschikbaar in de Pro versie. Upgrade naar Pro om deze functie te gebruiken."

    return None
