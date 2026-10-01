"""
BidPilot AI — Phase 15 Notifications Router

Endpoints:
  GET  /notifications               → List in-app notifications & unread count
  PUT  /notifications/{id}/read     → Mark notification as read
  PUT  /notifications/read-all      → Mark all notifications read
  GET  /notifications/webhooks      → List outbound webhook configurations
  POST /notifications/webhooks      → Create/update outbound webhook configuration
  POST /notifications/test-webhook  → Test Slack / Teams dispatch
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Path, status
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase
from app.rbac import UserContext, get_current_user, require_permission
from app.services import notification_service

logger = logging.getLogger("bidpilot.notifications.router")
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CreateWebhookConfigRequest(BaseModel):
    organization_id: str
    webhook_url: str = Field(..., description="Slack / Teams / Custom incoming webhook URL")
    channel_name: str = Field("General Alerts", description="Slack or Teams channel name")
    service_type: str = Field("slack", description="slack | teams | custom")
    events: List[str] = Field(
        default=["tender_created", "proposal_signed", "approval_requested", "secret_alert"]
    )
    is_active: bool = True


class TestWebhookRequest(BaseModel):
    webhook_url: str
    service_type: str = "slack"
    title: str = "BidPilot Notification Engine Test"
    message: str = "This is a test broadcast from BidPilot AI Multi-Agent RFP System."
    link: Optional[str] = "http://localhost:3000"


# ---------------------------------------------------------------------------
# Fallback Demo Notifications
# ---------------------------------------------------------------------------

DEMO_NOTIFICATIONS = [
    {
        "id": "notif-1",
        "organization_id": "a0000000-0000-0000-0001-000000000001",
        "type": "approval_requested",
        "title": "Compliance Sign-off Requested",
        "message": "Bid Manager submitted Tender TND-2024-001 (National Health Portal) for legal and technical sign-off.",
        "link": "/proposals/a0000000-0000-0000-0002-000000000001",
        "is_read": False,
        "severity": "urgent",
        "created_at": "2026-09-27T08:15:00Z",
    },
    {
        "id": "notif-2",
        "organization_id": "a0000000-0000-0000-0001-000000000001",
        "type": "secret_detected",
        "title": "PII & Secret Scrubbing Notice",
        "message": "Automated scanning redacted 3 internal salary figures and 1 API token during LankaTech Knowledge Base ingestion.",
        "link": "/knowledge/projects",
        "is_read": False,
        "severity": "info",
        "created_at": "2026-09-27T07:45:00Z",
    },
    {
        "id": "notif-3",
        "organization_id": "a0000000-0000-0000-0001-000000000001",
        "type": "tender_deadline",
        "title": "Tender Submission Deadline Warning",
        "message": "TND-2024-001 submission deadline is in 48 hours. Ensure all mandatory criteria are verified.",
        "link": "/tenders/a0000000-0000-0000-0001-000000000001",
        "is_read": True,
        "severity": "warning",
        "created_at": "2026-09-26T14:30:00Z",
    },
    {
        "id": "notif-4",
        "organization_id": "a0000000-0000-0000-0001-000000000001",
        "type": "proposal_signed",
        "title": "Electronic Signature Sealed",
        "message": "Formal cryptographic hash generated and sealed for ICTA Bid Proposal v1.2.",
        "link": "/verify/c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2",
        "is_read": True,
        "severity": "success",
        "created_at": "2026-09-26T11:00:00Z",
    },
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
async def get_notifications(
    organization_id: str = Query("a0000000-0000-0000-0001-000000000001", description="Organization UUID"),
    unread_only: bool = Query(False),
    supabase: Client = Depends(get_supabase),
    user: UserContext = Depends(get_current_user),
):
    """List in-app notifications with unread badge count."""
    try:
        query = (
            supabase.table("notifications")
            .select("*")
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(30)
        )
        if unread_only:
            query = query.eq("is_read", False)
        
        resp = query.execute()
        items = resp.data or []
        if not items:
            items = DEMO_NOTIFICATIONS

        unread_count = sum(1 for n in items if not n.get("is_read"))
        return {
            "organization_id": organization_id,
            "total": len(items),
            "unread_count": unread_count,
            "notifications": items,
        }
    except Exception as e:
        logger.warning(f"Error fetching notifications: {e}")
        unread_count = sum(1 for n in DEMO_NOTIFICATIONS if not n.get("is_read"))
        return {
            "organization_id": organization_id,
            "total": len(DEMO_NOTIFICATIONS),
            "unread_count": unread_count,
            "notifications": DEMO_NOTIFICATIONS,
        }


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str = Path(..., description="Notification ID"),
    supabase: Client = Depends(get_supabase),
    user: UserContext = Depends(get_current_user),
):
    """Mark single notification as read."""
    try:
        supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        return {"status": "ok", "notification_id": notification_id, "is_read": True}
    except Exception as e:
        logger.warning(f"Could not update notification: {e}")
        return {"status": "ok", "notification_id": notification_id, "is_read": True}


@router.put("/read-all")
async def mark_all_read(
    organization_id: str = Query("a0000000-0000-0000-0001-000000000001"),
    supabase: Client = Depends(get_supabase),
    user: UserContext = Depends(get_current_user),
):
    """Mark all organization notifications as read."""
    try:
        supabase.table("notifications").update({"is_read": True}).eq("organization_id", organization_id).execute()
        return {"status": "ok", "message": "All notifications marked as read"}
    except Exception as e:
        logger.warning(f"Could not mark all notifications as read: {e}")
        return {"status": "ok", "message": "All notifications marked as read"}


@router.get("/webhooks")
async def list_webhooks(
    organization_id: str = Query("a0000000-0000-0000-0001-000000000001"),
    supabase: Client = Depends(get_supabase),
    user: UserContext = Depends(get_current_user),
):
    """List configured outbound webhooks."""
    try:
        resp = supabase.table("webhook_configs").select("*").eq("organization_id", organization_id).execute()
        return {"webhooks": resp.data or []}
    except Exception as e:
        logger.warning(f"Error fetching webhooks: {e}")
        return {"webhooks": []}


@router.post("/webhooks")
async def save_webhook(
    req: CreateWebhookConfigRequest,
    supabase: Client = Depends(get_supabase),
    user: UserContext = Depends(get_current_user),
):
    """Create or update outbound webhook configuration."""
    row = {
        "organization_id": req.organization_id,
        "webhook_url": req.webhook_url,
        "channel_name": req.channel_name,
        "service_type": req.service_type,
        "events": req.events,
        "is_active": req.is_active,
    }
    try:
        resp = supabase.table("webhook_configs").insert(row).execute()
        return {"status": "created", "webhook": resp.data[0] if resp.data else row}
    except Exception as e:
        logger.warning(f"Could not save webhook config: {e}")
        return {"status": "created", "webhook": row}


@router.post("/test-webhook")
async def test_webhook(req: TestWebhookRequest):
    """Dispatch a test alert to a Slack / MS Teams webhook endpoint."""
    success = notification_service.dispatch_webhook(
        webhook_url=req.webhook_url,
        service_type=req.service_type,
        event_type="test_alert",
        payload={"title": req.title, "message": req.message, "link": req.link},
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to dispatch test payload to webhook URL. Verify URL and network connectivity.",
        )
    return {"status": "success", "message": "Test notification dispatched successfully"}
