"""
BidPilot AI — Phase 12 RBAC Router

Endpoints:
  GET    /rbac/me                                     → Current user's role + permissions
  GET    /rbac/team                                   → List org members with roles
  POST   /rbac/team/invite                            → Invite a user (requires team:manage)
  PUT    /rbac/team/{user_id}/role                    → Change a member's role
  DELETE /rbac/team/{user_id}                         → Remove a member
  GET    /rbac/tenders/{tender_id}/collaborators      → List tender collaborators
  POST   /rbac/tenders/{tender_id}/collaborators      → Assign collaborator to tender
  PUT    /rbac/proposals/sections/{id}/lock           → Acquire / renew section lock
  DELETE /rbac/proposals/sections/{id}/lock           → Release section lock
  GET    /rbac/proposals/sections/{id}/lock           → Check lock status
  GET    /rbac/roles                                  → List all system roles
  GET    /rbac/permissions                            → List all permissions (grouped by category)
"""

from __future__ import annotations

import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, EmailStr, Field
from supabase import Client

from app.dependencies import get_supabase
from app.rbac import (
    UserContext,
    get_current_user,
    require_permission,
    require_role,
    acquire_section_lock,
    release_section_lock,
)

logger = logging.getLogger("bidpilot.rbac.router")
router = APIRouter()


# ===========================================================================
# Pydantic Schemas
# ===========================================================================

class RoleOut(BaseModel):
    id: str
    name: str
    display_name: str
    description: Optional[str]
    color: str


class PermissionOut(BaseModel):
    id: str
    code: str
    category: str
    description: Optional[str]


class PermissionGroupOut(BaseModel):
    category: str
    permissions: List[PermissionOut]


class UserContextOut(BaseModel):
    user_id: str
    org_id: str
    role: str
    permissions: List[str]
    full_name: str
    email: str
    is_demo: bool


class OrgMemberOut(BaseModel):
    id: str
    user_id: str
    organization_id: str
    role_name: str
    role_display_name: str
    role_color: str
    status: str
    joined_at: Optional[str]
    invited_at: Optional[str]
    # Denormalized user fields (from users table if available, else None)
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None


class InviteMemberRequest(BaseModel):
    email: str = Field(..., description="Email address of the user to invite")
    role_name: str = Field(..., description="Role to assign (e.g. 'bid_manager')")
    full_name: Optional[str] = None


class ChangeRoleRequest(BaseModel):
    role_name: str = Field(..., description="New role name")


class AssignCollaboratorRequest(BaseModel):
    user_id: str
    assigned_role: str
    can_sign_off: bool = False


class CollaboratorOut(BaseModel):
    id: str
    tender_id: str
    user_id: str
    assigned_role: str
    can_sign_off: bool
    assigned_at: str
    full_name: Optional[str] = None
    email: Optional[str] = None


class SectionLockOut(BaseModel):
    section_id: str
    locked: bool
    locked_by: Optional[str] = None
    locked_by_user_id: Optional[str] = None
    expires_at: Optional[str] = None
    acquired: Optional[bool] = None
    is_mine: bool = False


# ===========================================================================
# GET /rbac/me
# ===========================================================================
@router.get("/me", response_model=UserContextOut)
async def get_me(user: UserContext = Depends(get_current_user)):
    """Return the current authenticated user's role and full permission list."""
    return UserContextOut(
        user_id=user.user_id,
        org_id=user.org_id,
        role=user.role,
        permissions=sorted(user.permissions),
        full_name=user.full_name,
        email=user.email,
        is_demo=user.is_demo,
    )


# ===========================================================================
# GET /rbac/roles
# ===========================================================================
@router.get("/roles", response_model=List[RoleOut])
async def list_roles(supabase: Client = Depends(get_supabase)):
    """Return all system-defined roles."""
    try:
        resp = supabase.table("roles").select("*").order("name").execute()
        return [
            RoleOut(
                id=r["id"],
                name=r["name"],
                display_name=r["display_name"],
                description=r.get("description"),
                color=r.get("color", "#64748B"),
            )
            for r in (resp.data or [])
        ]
    except Exception as exc:
        logger.warning(f"Could not fetch roles from DB, returning hardcoded defaults: {exc}")
        # Hardcoded fallback for demo mode
        return [
            RoleOut(id="r1", name="org_admin", display_name="Org Admin", description="Full org control", color="#7A1C2C"),
            RoleOut(id="r2", name="bid_manager", display_name="Bid Manager", description="RFP lifecycle management", color="#1D4ED8"),
            RoleOut(id="r3", name="solution_architect", display_name="Solution Architect", description="Technical sections", color="#0F766E"),
            RoleOut(id="r4", name="compliance_officer", display_name="Compliance Officer", description="Legal & compliance sign-off", color="#B45309"),
            RoleOut(id="r5", name="domain_sme", display_name="Domain SME / Contributor", description="Section editing & evidence", color="#6D28D9"),
            RoleOut(id="r6", name="executive_viewer", display_name="Executive Viewer / Auditor", description="Read-only access", color="#374151"),
        ]


# ===========================================================================
# GET /rbac/permissions
# ===========================================================================
@router.get("/permissions", response_model=List[PermissionGroupOut])
async def list_permissions(supabase: Client = Depends(get_supabase)):
    """Return all permissions grouped by category."""
    try:
        resp = supabase.table("permissions").select("*").order("category,code").execute()
        rows = resp.data or []
    except Exception:
        rows = []

    groups: dict[str, List[PermissionOut]] = {}
    for r in rows:
        cat = r.get("category", "Other")
        if cat not in groups:
            groups[cat] = []
        groups[cat].append(PermissionOut(
            id=r["id"], code=r["code"], category=cat,
            description=r.get("description"),
        ))

    return [PermissionGroupOut(category=cat, permissions=perms)
            for cat, perms in sorted(groups.items())]


# ===========================================================================
# GET /rbac/team
# ===========================================================================
@router.get("/team", response_model=List[OrgMemberOut])
async def list_team_members(
    organization_id: str = Query(..., description="Organization UUID"),
    user: UserContext = Depends(require_permission("team:view")),
    supabase: Client = Depends(get_supabase),
):
    """List all members of the organization with their roles."""
    try:
        resp = (
            supabase.table("organization_members")
            .select("*, roles(name, display_name, color)")
            .eq("organization_id", organization_id)
            .order("joined_at", desc=False)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:
        logger.warning(f"Could not fetch team members: {exc}")
        rows = []

    # Try to enrich with user profile data
    user_ids = [r["user_id"] for r in rows]
    user_profiles: dict[str, dict] = {}
    if user_ids:
        try:
            u_resp = (
                supabase.table("users")
                .select("id, full_name, email, avatar_url, job_title")
                .in_("id", user_ids)
                .execute()
            )
            for u in (u_resp.data or []):
                user_profiles[u["id"]] = u
        except Exception:
            pass

    result = []
    for r in rows:
        role_data = r.get("roles") or {}
        profile = user_profiles.get(r["user_id"], {})
        result.append(OrgMemberOut(
            id=r["id"],
            user_id=r["user_id"],
            organization_id=r["organization_id"],
            role_name=role_data.get("name", "executive_viewer"),
            role_display_name=role_data.get("display_name", "Executive Viewer"),
            role_color=role_data.get("color", "#374151"),
            status=r.get("status", "active"),
            joined_at=r.get("joined_at"),
            invited_at=r.get("invited_at"),
            full_name=profile.get("full_name"),
            email=profile.get("email"),
            avatar_url=profile.get("avatar_url"),
            job_title=profile.get("job_title"),
        ))
    return result


# ===========================================================================
# POST /rbac/team/invite
# ===========================================================================
@router.post("/team/invite", status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    body: InviteMemberRequest,
    organization_id: str = Query(...),
    user: UserContext = Depends(require_permission("team:manage")),
    supabase: Client = Depends(get_supabase),
):
    """Invite a new member to the organization with a specified role."""
    # Resolve role_id
    try:
        role_resp = (
            supabase.table("roles")
            .select("id, name")
            .eq("name", body.role_name)
            .limit(1)
            .execute()
        )
        roles = role_resp.data or []
        if not roles:
            raise HTTPException(status_code=404, detail=f"Role '{body.role_name}' not found.")
        role_id = roles[0]["id"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not resolve role: {exc}")

    # Create a placeholder organization_members row in 'invited' status
    # In production this would trigger a Supabase Auth invite email
    import uuid
    synthetic_user_id = str(uuid.uuid4())

    try:
        supabase.table("organization_members").insert({
            "organization_id": organization_id,
            "user_id": synthetic_user_id,
            "role_id": role_id,
            "status": "invited",
            "invited_by": user.user_id,
        }).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not create invitation: {exc}")

    return {
        "message": f"Invitation sent to {body.email} as {body.role_name}.",
        "invited_user_id": synthetic_user_id,
        "role": body.role_name,
        "status": "invited",
    }


# ===========================================================================
# PUT /rbac/team/{user_id}/role
# ===========================================================================
@router.put("/team/{user_id}/role")
async def change_member_role(
    user_id: str = Path(...),
    body: ChangeRoleRequest = ...,
    organization_id: str = Query(...),
    user: UserContext = Depends(require_permission("team:manage")),
    supabase: Client = Depends(get_supabase),
):
    """Change the role of an existing organization member."""
    try:
        role_resp = supabase.table("roles").select("id").eq("name", body.role_name).limit(1).execute()
        roles = role_resp.data or []
        if not roles:
            raise HTTPException(status_code=404, detail=f"Role '{body.role_name}' not found.")
        role_id = roles[0]["id"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    try:
        supabase.table("organization_members").update({
            "role_id": role_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("organization_id", organization_id).eq("user_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not update role: {exc}")

    return {"message": f"User {user_id} role updated to '{body.role_name}'.", "new_role": body.role_name}


# ===========================================================================
# DELETE /rbac/team/{user_id}
# ===========================================================================
@router.delete("/team/{user_id}", status_code=status.HTTP_200_OK)
async def remove_team_member(
    user_id: str = Path(...),
    organization_id: str = Query(...),
    user: UserContext = Depends(require_permission("team:manage")),
    supabase: Client = Depends(get_supabase),
):
    """Remove a member from the organization."""
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself from the organization.")
    try:
        supabase.table("organization_members").delete().eq(
            "organization_id", organization_id
        ).eq("user_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not remove member: {exc}")
    return {"message": f"Member {user_id} removed from organization."}


# ===========================================================================
# GET /rbac/tenders/{tender_id}/collaborators
# ===========================================================================
@router.get("/tenders/{tender_id}/collaborators", response_model=List[CollaboratorOut])
async def list_collaborators(
    tender_id: str = Path(...),
    organization_id: str = Query(...),
    user: UserContext = Depends(require_permission("tenders:view")),
    supabase: Client = Depends(get_supabase),
):
    """List collaborators assigned to a specific tender."""
    try:
        resp = (
            supabase.table("tender_collaborators")
            .select("*")
            .eq("tender_id", tender_id)
            .eq("organization_id", organization_id)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:
        logger.warning(f"Could not fetch tender collaborators: {exc}")
        rows = []

    return [
        CollaboratorOut(
            id=r["id"], tender_id=r["tender_id"], user_id=r["user_id"],
            assigned_role=r["assigned_role"], can_sign_off=r.get("can_sign_off", False),
            assigned_at=r["assigned_at"],
        )
        for r in rows
    ]


# ===========================================================================
# POST /rbac/tenders/{tender_id}/collaborators
# ===========================================================================
@router.post("/tenders/{tender_id}/collaborators", status_code=status.HTTP_201_CREATED)
async def assign_collaborator(
    tender_id: str = Path(...),
    body: AssignCollaboratorRequest = ...,
    organization_id: str = Query(...),
    user: UserContext = Depends(require_permission("tenders:assign_collaborators")),
    supabase: Client = Depends(get_supabase),
):
    """Assign a team member as a collaborator on a tender."""
    try:
        supabase.table("tender_collaborators").upsert({
            "tender_id": tender_id,
            "user_id": body.user_id,
            "organization_id": organization_id,
            "assigned_role": body.assigned_role,
            "can_sign_off": body.can_sign_off,
            "assigned_by": user.user_id,
        }, on_conflict="tender_id,user_id").execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not assign collaborator: {exc}")
    return {"message": "Collaborator assigned successfully.", "tender_id": tender_id, "user_id": body.user_id}


# ===========================================================================
# PUT /rbac/proposals/sections/{id}/lock  — Acquire / renew lock
# ===========================================================================
@router.put("/proposals/sections/{section_id}/lock", response_model=SectionLockOut)
async def lock_section(
    section_id: str = Path(...),
    organization_id: str = Query(...),
    user: UserContext = Depends(require_permission("proposals:edit_own")),
    supabase: Client = Depends(get_supabase),
):
    """Acquire or renew a 5-minute optimistic section lock to prevent concurrent writes."""
    result = acquire_section_lock(supabase, section_id, organization_id, user)
    return SectionLockOut(
        section_id=section_id,
        locked=result.get("locked", True),
        locked_by=result.get("locked_by"),
        locked_by_user_id=result.get("locked_by_user_id"),
        expires_at=result.get("expires_at"),
        acquired=result.get("acquired"),
        is_mine=result.get("locked_by_user_id") == user.user_id,
    )


# ===========================================================================
# DELETE /rbac/proposals/sections/{id}/lock  — Release lock
# ===========================================================================
@router.delete("/proposals/sections/{section_id}/lock")
async def unlock_section(
    section_id: str = Path(...),
    user: UserContext = Depends(require_permission("proposals:edit_own")),
    supabase: Client = Depends(get_supabase),
):
    """Release a section lock held by the current user."""
    released = release_section_lock(supabase, section_id, user)
    return {"released": released, "section_id": section_id}


# ===========================================================================
# GET /rbac/proposals/sections/{id}/lock  — Check lock status
# ===========================================================================
@router.get("/proposals/sections/{section_id}/lock", response_model=SectionLockOut)
async def get_section_lock(
    section_id: str = Path(...),
    user: UserContext = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Check whether a proposal section is currently locked and by whom."""
    try:
        now = datetime.now(timezone.utc)
        resp = (
            supabase.table("section_locks")
            .select("*")
            .eq("section_id", section_id)
            .execute()
        )
        rows = resp.data or []
        if rows:
            lock = rows[0]
            expires_at_str = lock["expires_at"]
            expires_dt = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            if expires_dt > now:
                return SectionLockOut(
                    section_id=section_id,
                    locked=True,
                    locked_by=lock.get("locked_by_name"),
                    locked_by_user_id=lock["locked_by_user_id"],
                    expires_at=expires_at_str,
                    is_mine=lock["locked_by_user_id"] == user.user_id,
                )
    except Exception as exc:
        logger.warning(f"Could not check section lock status: {exc}")

    return SectionLockOut(section_id=section_id, locked=False, is_mine=False)
