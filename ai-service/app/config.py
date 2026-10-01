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
    supabase_jwt_secret: str = ""  # For Phase 12 JWT Bearer verification
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

    # --- RBAC ---
    rbac_strict_mode: bool = False  # When False, missing JWT falls back to demo org_admin in dev

    # --- Rate Limiting (Upstash Redis — Phase 16) ---
    upstash_redis_rest_url: str = ""   # e.g. https://xxxxx.upstash.io
    upstash_redis_rest_token: str = "" # Upstash REST token

    # --- App ---
    app_env: str = "development"
    log_level: str = "INFO"

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)

    @property
    def is_redis_configured(self) -> bool:
        return bool(self.upstash_redis_rest_url and self.upstash_redis_rest_token)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
