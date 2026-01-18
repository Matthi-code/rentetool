"""
Case models
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

from .vordering import VorderingResponse
from .deelbetaling import DeelbetalingResponse


class CaseBase(BaseModel):
    """Base case model."""
    naam: str = Field(..., min_length=1, max_length=255, description="Case name (e.g., client name)")
    klant_referentie: Optional[str] = Field(default=None, max_length=255, description="Optional client reference number")
    einddatum: date = Field(default_factory=date.today, description="End date for calculation")
    strategie: str = Field(default="A", pattern="^[AB]$", description="Payment allocation strategy (A or B)")


class CaseCreate(CaseBase):
    """Model for creating a new case."""
    pass


class Case(CaseBase):
    """Full case model with database fields."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaseResponse(CaseBase):
    """Response model for case."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaseWithLines(CaseResponse):
    """Case with all vorderingen and deelbetalingen."""
    vorderingen: List[VorderingResponse] = []
    deelbetalingen: List[DeelbetalingResponse] = []
    sharing: Optional[Any] = None  # CaseShareInfo, avoid circular import


class CaseListResponse(CaseResponse):
    """Response model for case list with counts and sharing info."""
    vorderingen_count: int = 0
    deelbetalingen_count: int = 0
    sharing: Optional[Any] = None  # CaseShareInfo, avoid circular import
