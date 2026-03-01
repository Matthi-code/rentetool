"""
Pydantic models for subscription tiers and user subscriptions.
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class SubscriptionTier(BaseModel):
    """A subscription tier definition."""
    id: str
    naam: str
    max_vorderingen: Optional[int] = None
    max_deelbetalingen: Optional[int] = None
    mag_opslaan: bool = False
    mag_pdf_schoon: bool = False
    mag_snapshots: bool = False
    mag_sharing: bool = False
    prijs_per_maand: Optional[Decimal] = None
    actief: bool = True


class SubscriptionTierUpdate(BaseModel):
    """Update fields for a subscription tier (admin)."""
    naam: Optional[str] = None
    max_vorderingen: Optional[int] = None
    max_deelbetalingen: Optional[int] = None
    mag_opslaan: Optional[bool] = None
    mag_pdf_schoon: Optional[bool] = None
    mag_snapshots: Optional[bool] = None
    mag_sharing: Optional[bool] = None
    prijs_per_maand: Optional[Decimal] = None
    actief: Optional[bool] = None


class UserSubscription(BaseModel):
    """A user's active subscription."""
    id: str
    user_id: str
    tier_id: str
    start_datum: date
    eind_datum: Optional[date] = None
    status: str = 'active'
    toegekend_door: Optional[str] = None
    notitie: Optional[str] = None
    created_at: Optional[datetime] = None


class UserSubscriptionCreate(BaseModel):
    """Assign a subscription to a user (admin action)."""
    user_id: str
    tier_id: str
    notitie: Optional[str] = None


class UserTierResponse(BaseModel):
    """Response with user's tier info for the frontend."""
    tier_id: str
    naam: str
    max_vorderingen: Optional[int] = None
    max_deelbetalingen: Optional[int] = None
    mag_opslaan: bool = False
    mag_pdf_schoon: bool = False
    mag_snapshots: bool = False
    mag_sharing: bool = False
