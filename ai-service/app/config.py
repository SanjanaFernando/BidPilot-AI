"""
BidPilot AI Service — Configuration
Reads all settings from environment variables via pydantic-settings.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_key: str = ""
    database_url: str = ""

    # --- Google Gemini ---
    gemini_api_key: str = ""
    gemini_embed_model: str = "text-embedding-004"
    gemini_generate_model: str = "gemini-3.6-flash"

    # --- Storage ---
    storage_bucket: str = "rfp-documents"

    # --- Demo org ---
    default_org_id: str = "a0000000-0000-0000-0001-000000000001"

    # --- CORS ---
    frontend_url: str = "http://localhost:3000"

    # --- App ---
    app_env: str = "development"
    log_level: str = "INFO"

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
