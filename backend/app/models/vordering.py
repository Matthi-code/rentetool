"""
Vordering models
"""
from datetime import date
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field


# Item types for vorderingen
ItemType = Literal['vordering', 'kosten']


class VorderingBase(BaseModel):
    """Base vordering model."""
    item_type: ItemType = Field(default='vordering', description="Type: 'vordering' (claim) or 'kosten' (costs)")
    kenmerk: str = Field(..., description="Unique identifier (e.g., invoice number)")
    bedrag: Decimal = Field(..., gt=0, description="Principal amount in euros")
    datum: date = Field(..., description="Start date of the claim")
    rentetype: int = Field(..., ge=1, le=7, description="Interest type (1-7)")
    kosten: Decimal = Field(default=Decimal("0"), ge=0, description="DEPRECATED: Additional costs (BIK, legal fees)")
    kosten_rentedatum: Optional[date] = Field(default=None, description="DEPRECATED: Interest start date for costs")
    opslag: Optional[Decimal] = Field(default=None, ge=0, le=1, description="Surcharge for type 6/7 (e.g., 0.02 for 2%)")
    opslag_ingangsdatum: Optional[date] = Field(default=None, description="Start date for surcharge")
    pauze_start: Optional[date] = Field(default=None, description="Start date of interest pause")
    pauze_eind: Optional[date] = Field(default=None, description="End date of interest pause")


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
