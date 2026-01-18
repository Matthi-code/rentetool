"""
Deelbetaling models
"""
from datetime import date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class DeelbetalingBase(BaseModel):
    """Base deelbetaling model."""
    kenmerk: Optional[str] = Field(default=None, description="Payment reference")
    bedrag: Decimal = Field(..., gt=0, description="Payment amount in euros")
    datum: date = Field(..., description="Payment date")
    aangewezen: List[str] = Field(default_factory=list, description="Designated vordering kenmerken")


class DeelbetalingCreate(DeelbetalingBase):
    """Model for creating a new deelbetaling."""
    pass


class Deelbetaling(DeelbetalingBase):
    """Full deelbetaling model with database fields."""
    id: str
    case_id: str
    volgorde: int = 0

    class Config:
        from_attributes = True


class DeelbetalingResponse(DeelbetalingBase):
    """Response model for deelbetaling."""
    id: str

    class Config:
        from_attributes = True
