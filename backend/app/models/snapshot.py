"""
Snapshot models
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, Field


class SnapshotBase(BaseModel):
    """Base snapshot model."""
    einddatum: date
    totaal_openstaand: Decimal


class SnapshotCreate(SnapshotBase):
    """Model for creating a new snapshot."""
    invoer_json: dict
    resultaat_json: dict


class Snapshot(SnapshotBase):
    """Full snapshot model with database fields."""
    id: str
    case_id: str
    created_at: datetime
    pdf_url: Optional[str] = None
    invoer_json: dict
    resultaat_json: dict

    class Config:
        from_attributes = True


class SnapshotResponse(BaseModel):
    """Response model for snapshot list."""
    id: str
    created_at: datetime
    einddatum: date
    totaal_openstaand: Decimal

    class Config:
        from_attributes = True
