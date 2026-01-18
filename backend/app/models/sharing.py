"""
Sharing models for case collaboration
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class ColleagueResponse(BaseModel):
    """Response model for a colleague (user from same domain)."""
    id: str
    email: str
    display_name: Optional[str] = None


class ColleagueWithPermission(ColleagueResponse):
    """Colleague with their permission level for a shared case."""
    permission: Literal['view', 'edit'] = 'view'


class CaseShareCreate(BaseModel):
    """Request to share a case with a colleague."""
    shared_with_user_id: str
    permission: Literal['view', 'edit'] = Field(default='view', description="Permission level: 'view' or 'edit'")


class CaseShareResponse(BaseModel):
    """Response model for a case share."""
    id: str
    case_id: str
    shared_with_user_id: str
    shared_by_user_id: str
    permission: str
    created_at: datetime
    shared_with_user: Optional[ColleagueResponse] = None

    class Config:
        from_attributes = True


class CaseShareInfo(BaseModel):
    """Sharing info attached to case responses."""
    is_shared: bool = False
    is_owner: bool = True
    shared_by: Optional[ColleagueResponse] = None
    shared_with: List[ColleagueWithPermission] = []
    my_permission: Optional[Literal['view', 'edit']] = None


class ColleagueCountResponse(BaseModel):
    """Response for colleague count check."""
    count: int
    domain: Optional[str] = None
