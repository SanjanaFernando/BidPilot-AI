"""
BidPilot AI Service — Dependencies
FastAPI dependency injection: Supabase client, DB session.
"""

from typing import AsyncGenerator
from functools import lru_cache
import re

import supabase._sync.client as _sync_client
from supabase import create_client, Client
from app.config import get_settings

# Patch supabase-py regex to support Supabase's new sb_secret_* and sb_publishable_* format
if not getattr(_sync_client, "_bidpilot_re_patched", False):
    _orig_re_match = _sync_client.re.match
    def _patched_re_match(pattern, string, *args, **kwargs):
        if isinstance(string, str) and string.startswith(("sb_secret_", "sb_publishable_")):
            return True
        return _orig_re_match(pattern, string, *args, **kwargs)

    _sync_client.re.match = _patched_re_match
    _sync_client._bidpilot_re_patched = True


@lru_cache()
def get_supabase() -> Client:
    """Return a Supabase service-role client (bypasses RLS for backend ops)."""
    settings = get_settings()
    if not settings.is_supabase_configured:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env"
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


# Re-export get_current_user and UserContext from RBAC engine for convenience
def get_current_user():
    """Convenience alias pointing to app.rbac.get_current_user."""
    from app.rbac import get_current_user as _get_user
    return _get_user


