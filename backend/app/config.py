"""
Application configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""  # Fallback for single key setup
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # App
    app_name: str = "Rentetool"
    debug: bool = True  # Default to debug for development
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    @property
    def effective_service_key(self) -> str:
        """Get service role key, falling back to general key."""
        return self.supabase_service_role_key or self.supabase_key or self.supabase_anon_key

    @property
    def effective_anon_key(self) -> str:
        """Get anon key, falling back to general key."""
        return self.supabase_anon_key or self.supabase_key

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
