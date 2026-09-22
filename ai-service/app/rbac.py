"""
BidPilot AI Service — Phase 12 RBAC Engine

Provides:
  - JWT verification via Supabase JWT secret
  - UserContext dataclass with user_id, org_id, role, permissions
  - Permission/role lookup from organization_members + role_permissions tables
  - FastAPI dependency factories: require_permission(), require_role(), require_section_access()
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Set
from datetime import datetime, timezone, timedelta

from fastapi import Depends, HTTPException, Request, status
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings

logger = logging.getLogger("bidpilot.rbac")

# ---------------------------------------------------------------------------
# Demo default — used when no JWT is present and rbac_strict_mode is False
# ---------------------------------------------------------------------------
DEMO_ORG_ID = "a0000000-0000-0000-0001-000000000001"
DEMO_USER_ID = "u0000000-0000-0000-0001-000000000001"
DEMO_ROLE = "org_admin"

# Full permission set granted to the demo org_admin fallback
ALL_PERMISSIONS: Set[str] = {
    "tenders:create", "tenders:edit", "tenders:delete", "tenders:view",
    "tenders:assign_collaborators",
    "agents:run", "agents:view_results",
    "proposals:create", "proposals:edit_own", "proposals:edit_any",
    "proposals:approve_section", "proposals:sign_off", "proposals:export",
    "proposals:view",
    "requirements:view", "requirements:edit",
    "compliance:view", "compliance:verify", "compliance:sign_off",
    "knowledge:view", "knowledge:create", "knowledge:edit",
    "knowledge:delete", "knowledge:ingest",
    "team:view", "team:manage",
    "audit:view",
    "settings:view", "settings:edit",
}


# ---------------------------------------------------------------------------
# UserContext — the resolved, verified identity for a single request
# ---------------------------------------------------------------------------
@dataclass
class UserContext:
    user_id: str
    org_id: str
    role: str
    permissions: Set[str] = field(default_factory=set)
    full_name: str = "Demo User"
    email: str = "admin@lankatech.lk"
    is_demo: bool = False  # True when falling back to demo mode (no JWT)

    def has_permission(self, code: str) -> bool:
        return code in self.permissions

    def has_any_role(self, roles: List[str]) -> bool:
        return self.role in roles


# ---------------------------------------------------------------------------
# JWT Verification
# ---------------------------------------------------------------------------
def _extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _verify_jwt(token: str) -> dict:
    """
    Decode and verify a Supabase JWT.
    Uses python-jose with HS256 (Supabase project JWT secret).
    Returns the decoded payload dict.
    """
    settings = get_settings()
    jwt_secret = settings.supabase_jwt_secret

    if not jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT verification not configured. Set SUPABASE_JWT_SECRET in .env",
        )

    try:
        from jose import jwt as jose_jwt, JWTError
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="python-jose not installed. Run: pip install python-jose",
        )

    try:
        payload = jose_jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase tokens don't always set aud
        )
        return payload
    except Exception as exc:
        logger.warning(f"JWT decode failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Permission resolution from database
# ---------------------------------------------------------------------------
def _load_user_permissions(
    supabase: Client,
    org_id: str,
    user_id: str,
) -> tuple[str, Set[str]]:
    """
    Look up the user's role and permissions from organization_members + role_permissions.
    Returns (role_name, set_of_permission_codes).
    Falls back to empty role/permissions on any DB error.
    """
    try:
        # Get user's role in the org
        member_resp = (
            supabase.table("organization_members")
            .select("role_id, roles(name)")
            .eq("organization_id", org_id)
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        members = member_resp.data or []
        if not members:
            return "executive_viewer", set()

        role_data = members[0].get("roles", {})
        role_name = role_data.get("name", "executive_viewer") if isinstance(role_data, dict) else "executive_viewer"
        role_id_from_member = members[0].get("role_id")

        # Get permissions for this role
        perm_resp = (
            supabase.table("role_permissions")
            .select("permissions(code)")
            .eq("role_id", role_id_from_member)
            .execute()
        )
        perms_data = perm_resp.data or []
        permissions: Set[str] = set()
        for row in perms_data:
            perm_obj = row.get("permissions", {})
            if isinstance(perm_obj, dict) and perm_obj.get("code"):
                permissions.add(perm_obj["code"])

        return role_name, permissions

    except Exception as exc:
        logger.warning(f"Could not load permissions for user {user_id} in org {org_id}: {exc}")
        return "executive_viewer", set()


# ---------------------------------------------------------------------------
# Core dependency: get_current_user
# ---------------------------------------------------------------------------
async def get_current_user(
    request: Request,
    supabase: Client = Depends(get_supabase),
) -> UserContext:
    """
    FastAPI dependency. Extracts and verifies the Bearer JWT.
    In dev mode (rbac_strict_mode=False), requests without a token get
    the demo org_admin context so all existing endpoints keep working.
    """
    settings = get_settings()
    token = _extract_bearer_token(request)

    # --- Dev fallback (no token + strict mode OFF) ---
    if not token:
        if settings.rbac_strict_mode:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization token required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Return demo admin context
        return UserContext(
            user_id=DEMO_USER_ID,
            org_id=DEMO_ORG_ID,
            role=DEMO_ROLE,
            permissions=ALL_PERMISSIONS,
            full_name="Ashan Perera (Demo Admin)",
            email="admin@lankatech.lk",
            is_demo=True,
        )

    # --- Real JWT path ---
    payload = _verify_jwt(token)
    user_id: str = payload.get("sub", "")
    app_metadata: dict = payload.get("app_metadata", {})

    # Try to get org_id from JWT app_metadata first (Supabase Auth Hook approach)
    org_id: str = app_metadata.get("org_id", "") or app_metadata.get("organization_id", "")
    role_from_jwt: str = app_metadata.get("role", "")
    permissions_from_jwt: List[str] = app_metadata.get("permissions", [])

    if not org_id:
        # Fall back: look up org from organization_members table
        try:
            resp = (
                supabase.table("organization_members")
                .select("organization_id")
                .eq("user_id", user_id)
                .eq("status", "active")
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            org_id = rows[0]["organization_id"] if rows else DEMO_ORG_ID
        except Exception:
            org_id = DEMO_ORG_ID

    # Resolve role + permissions (DB is authoritative over JWT claims for security)
    role, permissions = _load_user_permissions(supabase, org_id, user_id)

    # If JWT had explicit permissions AND DB lookup returned nothing, trust JWT claims
    if not permissions and permissions_from_jwt:
        permissions = set(permissions_from_jwt)
    if not role and role_from_jwt:
        role = role_from_jwt

    user_email = payload.get("email", "")

    return UserContext(
        user_id=user_id,
        org_id=org_id,
        role=role,
        permissions=permissions,
        full_name=payload.get("user_metadata", {}).get("full_name", user_email),
        email=user_email,
        is_demo=False,
    )


# ---------------------------------------------------------------------------
# Permission / Role dependency factories
# ---------------------------------------------------------------------------
def require_permission(permission_code: str):
    """
    Dependency factory.
    Usage:
        @router.post("/sign-off")
        async def sign_off(user: UserContext = Depends(require_permission("proposals:sign_off"))):
    """
    async def _check(user: UserContext = Depends(get_current_user)) -> UserContext:
        if not user.has_permission(permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permission denied. Required permission: '{permission_code}'. "
                    f"Your role '{user.role}' does not have this permission."
                ),
            )
        return user
    return _check


def require_role(allowed_roles: List[str]):
    """
    Dependency factory.
    Usage:
        @router.delete("/member/{user_id}")
        async def remove(user: UserContext = Depends(require_role(["org_admin"]))):
    """
    async def _check(user: UserContext = Depends(get_current_user)) -> UserContext:
        if not user.has_any_role(allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role required: {allowed_roles}. "
                    f"Your current role is '{user.role}'."
                ),
            )
        return user
    return _check


def require_section_access(action: str = "edit"):
    """
    Dependency factory for section-level access checks.
    Validates that the user can perform `action` on a section.
    Reads section_id from path params.
    """
    async def _check(
        request: Request,
        supabase: Client = Depends(get_supabase),
        user: UserContext = Depends(get_current_user),
    ) -> UserContext:
        section_id = request.path_params.get("section_id") or request.path_params.get("id")

        # org_admin and bid_manager can always access any section
        if user.has_any_role(["org_admin", "bid_manager"]):
            return user

        if action == "edit":
            if not user.has_permission("proposals:edit_any"):
                # Check section_assignments table
                if section_id:
                    try:
                        resp = (
                            supabase.table("section_assignments")
                            .select("id")
                            .eq("section_id", section_id)
                            .eq("assigned_user_id", user.user_id)
                            .limit(1)
                            .execute()
                        )
                        if not (resp.data or []):
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="You are not assigned to this proposal section.",
                            )
                    except HTTPException:
                        raise
                    except Exception:
                        pass  # DB error — allow with warning

        return user
    return _check


# ---------------------------------------------------------------------------
# Section locking helpers (used by the /rbac/proposals/sections/{id}/lock endpoints)
# ---------------------------------------------------------------------------
LOCK_DURATION_MINUTES = 5


def acquire_section_lock(
    supabase: Client,
    section_id: str,
    org_id: str,
    user: UserContext,
) -> dict:
    """
    Acquire or renew a 5-minute section lock.
    Returns the lock record.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=LOCK_DURATION_MINUTES)

    # Check if section is locked by someone else
    try:
        lock_resp = (
            supabase.table("section_locks")
            .select("*")
            .eq("section_id", section_id)
            .execute()
        )
        existing = lock_resp.data or []
        if existing:
            lock = existing[0]
            lock_expires = datetime.fromisoformat(lock["expires_at"].replace("Z", "+00:00"))
            if lock_expires > now and lock["locked_by_user_id"] != user.user_id:
                return {
                    "locked": True,
                    "locked_by": lock.get("locked_by_name", "Another user"),
                    "expires_at": lock["expires_at"],
                    "acquired": False,
                }
    except Exception as exc:
        logger.warning(f"Could not check section lock for {section_id}: {exc}")

    # Upsert lock
    lock_data = {
        "section_id": section_id,
        "organization_id": org_id,
        "locked_by_user_id": user.user_id,
        "locked_by_name": user.full_name,
        "locked_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    try:
        supabase.table("section_locks").upsert(lock_data, on_conflict="section_id").execute()
    except Exception as exc:
        logger.warning(f"Could not upsert section lock: {exc}")

    return {
        "locked": True,
        "locked_by": user.full_name,
        "locked_by_user_id": user.user_id,
        "expires_at": expires_at.isoformat(),
        "acquired": True,
    }


def release_section_lock(
    supabase: Client,
    section_id: str,
    user: UserContext,
) -> bool:
    """Release a section lock. Returns True if released."""
    try:
        supabase.table("section_locks").delete().eq("section_id", section_id).eq(
            "locked_by_user_id", user.user_id
        ).execute()
        return True
    except Exception as exc:
        logger.warning(f"Could not release lock for section {section_id}: {exc}")
        return False
