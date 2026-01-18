"""
Supabase client setup
"""
from functools import lru_cache
from supabase import create_client, Client

from app.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client with service role key (for backend operations)."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.effective_service_key
    )


def get_supabase_anon_client() -> Client:
    """Get Supabase client with anon key (respects RLS)."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.effective_anon_key
    )
