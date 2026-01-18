"""
Berekening (calculation) models
"""
from datetime import date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class VorderingInput(BaseModel):
    """Input model for vordering in calculation."""
    kenmerk: str
    bedrag: Decimal
    datum: date
    rentetype: int = Field(ge=1, le=7)
    kosten: Decimal = Decimal("0")
    opslag: Optional[Decimal] = None
    opslag_ingangsdatum: Optional[date] = None


class DeelbetalingInput(BaseModel):
    """Input model for deelbetaling in calculation."""
    kenmerk: Optional[str] = None
    bedrag: Decimal
    datum: date
    aangewezen: List[str] = Field(default_factory=list)


class BerekeningRequest(BaseModel):
    """Request model for calculation."""
    einddatum: date
    strategie: str = Field(default="A", pattern="^[AB]$")
    vorderingen: List[VorderingInput]
    deelbetalingen: List[DeelbetalingInput] = Field(default_factory=list)


class Periode(BaseModel):
    """Interest period detail."""
    start: date
    eind: date
    dagen: int
    hoofdsom: Decimal
    rente_pct: Decimal
    rente: Decimal
    is_kapitalisatie: bool = False


class Toerekening(BaseModel):
    """Payment allocation detail."""
    vordering: str
    type: str  # 'kosten', 'rente', 'hoofdsom'
    bedrag: Decimal


class VorderingResultaat(BaseModel):
    """Result for a single vordering."""
    kenmerk: str
    oorspronkelijk_bedrag: Decimal
    kosten: Decimal
    totale_rente: Decimal
    afgelost_hoofdsom: Decimal
    afgelost_kosten: Decimal
    afgelost_rente: Decimal
    openstaand: Decimal
    status: str  # 'OPEN' or 'VOLDAAN'
    voldaan_datum: Optional[date] = None
    periodes: List[Periode] = []


class DeelbetalingResultaat(BaseModel):
    """Result for a single deelbetaling."""
    kenmerk: Optional[str]
    bedrag: Decimal
    datum: date
    verwerkt: Decimal
    toerekeningen: List[Toerekening] = []


class Totalen(BaseModel):
    """Total amounts summary."""
    oorspronkelijk: Decimal
    kosten: Decimal
    rente: Decimal
    afgelost_hoofdsom: Decimal
    afgelost_kosten: Decimal
    afgelost_rente: Decimal
    openstaand: Decimal


class BerekeningResponse(BaseModel):
    """Response model for calculation."""
    einddatum: date
    strategie: str
    vorderingen: List[VorderingResultaat]
    deelbetalingen: List[DeelbetalingResultaat]
    totalen: Totalen
    controle_ok: bool
