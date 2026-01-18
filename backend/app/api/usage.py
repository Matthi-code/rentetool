"""
Usage tracking API endpoints.
Logs calculation and PDF view events per user.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.auth import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter(prefix="/api/usage", tags=["usage"])


class UsageLogCreate(BaseModel):
    action_type: str  # 'calculation' or 'pdf_view'
    case_id: Optional[str] = None
    case_name: Optional[str] = None


class UsageLog(BaseModel):
    id: str
    user_id: str
    action_type: str
    case_id: Optional[str]
    case_name: Optional[str]
    created_at: datetime


class UsageStats(BaseModel):
    total_calculations: int
    total_pdf_views: int
    last_calculation: Optional[datetime]
    last_pdf_view: Optional[datetime]


@router.post("/log")
async def log_usage(log: UsageLogCreate, user_id: str = Depends(get_current_user)):
    """Log a usage event (calculation or PDF view)."""
    if log.action_type not in ['calculation', 'pdf_view']:
        raise HTTPException(status_code=400, detail="Invalid action_type. Must be 'calculation' or 'pdf_view'")

    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "action_type": log.action_type,
    }

    if log.case_id:
        data["case_id"] = log.case_id
    if log.case_name:
        data["case_name"] = log.case_name

    result = supabase.table("usage_logs").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to log usage")

    return {"status": "ok", "logged": log.action_type}


@router.get("/stats", response_model=UsageStats)
async def get_usage_stats(user_id: str = Depends(get_current_user)):
    """Get usage statistics for the current user."""
    supabase = get_supabase_client()

    # Get all logs for user
    result = supabase.table("usage_logs").select("*").eq("user_id", user_id).execute()

    logs = result.data or []

    calculations = [l for l in logs if l["action_type"] == "calculation"]
    pdf_views = [l for l in logs if l["action_type"] == "pdf_view"]

    last_calc = max([l["created_at"] for l in calculations]) if calculations else None
    last_pdf = max([l["created_at"] for l in pdf_views]) if pdf_views else None

    return UsageStats(
        total_calculations=len(calculations),
        total_pdf_views=len(pdf_views),
        last_calculation=last_calc,
        last_pdf_view=last_pdf
    )


@router.get("/logs", response_model=List[UsageLog])
async def get_usage_logs(
    limit: int = 100,
    action_type: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get usage logs for the current user."""
    supabase = get_supabase_client()

    query = supabase.table("usage_logs").select("*").eq("user_id", user_id)

    if action_type:
        query = query.eq("action_type", action_type)

    result = query.order("created_at", desc=True).limit(limit).execute()

    return result.data or []
