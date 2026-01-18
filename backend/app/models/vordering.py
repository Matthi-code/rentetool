"""
Vordering models
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class VorderingBase(BaseModel):
    """Base vordering model."""
    kenmerk: str = Field(..., description="Unique identifier (e.g., invoice number)")
    bedrag: Decimal = Field(..., gt=0, description="Principal amount in euros")
    datum: date = Field(..., description="Start date of the claim")
    rentetype: int = Field(..., ge=1, le=7, description="Interest type (1-7)")
    kosten: Decimal = Field(default=Decimal("0"), ge=0, description="Additional costs (BIK, legal fees)")
    opslag: Optional[Decimal] = Field(default=None, ge=0, le=1, description="Surcharge for type 6/7 (e.g., 0.02 for 2%)")
    opslag_ingangsdatum: Optional[date] = Field(default=None, description="Start date for surcharge")


class VorderingCreate(VorderingBase):
    """Model for creating a new vordering."""
    pass


class Vordering(VorderingBase):
    """Full vordering model with database fields."""
    id: str
    case_id: str
    volgorde: int = 0

    class Config:
        from_attributes = True


class VorderingResponse(VorderingBase):
    """Response model for vordering."""
    id: str

    class Config:
        from_attributes = True
