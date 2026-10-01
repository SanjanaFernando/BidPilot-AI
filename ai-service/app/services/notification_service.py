"""
BidPilot AI — Enterprise Notifications & Webhook Dispatch Service (Phase 15)

Handles:
  - In-app notification generation & persistence
  - Slack & Microsoft Teams webhook payload formatting & dispatch
"""

import logging
import urllib.request
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from supabase import Client

logger = logging.getLogger("bidpilot.notifications")


def create_notification(
    supabase: Client,
    organization_id: str,
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    user_id: Optional[str] = None,
    severity: str = "info",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Create an in-app notification record.
    """
    row = {
        "organization_id": organization_id,
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "link": link,
        "severity": severity,
        "is_read": False,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        inserted = supabase.table("notifications").insert(row).execute()
        return inserted.data[0] if inserted.data else row
    except Exception as e:
        logger.warning(f"Could not insert notification into database: {e}")
        return row


def dispatch_webhook(
    webhook_url: str,
    service_type: str,
    event_type: str,
    payload: Dict[str, Any],
) -> bool:
    """
    Format and dispatch an outbound event to Slack, Microsoft Teams, or custom webhook endpoint.
    """
    try:
        title = payload.get("title", f"BidPilot Alert: {event_type}")
        message = payload.get("message", "New event triggered in BidPilot AI")
        link = payload.get("link", "http://localhost:3000")

        if service_type == "slack":
            body = {
                "text": f"*{title}*\n{message}\n<{link}|View in BidPilot>",
                "blocks": [
                    {
                        "type": "header",
                        "text": {"type": "plain_text", "text": f"🚀 BidPilot AI: {title}"},
                    },
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": f"{message}\n\n*Action:* <{link}|Open Proposal & Dashboard>"},
                    },
                ],
            }
        elif service_type == "teams":
            body = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": "0076D7",
                "summary": title,
                "sections": [
                    {
                        "activityTitle": title,
                        "activitySubtitle": f"Event: {event_type}",
                        "text": message,
                    }
                ],
                "potentialAction": [
                    {
                        "@type": "OpenUri",
                        "name": "Open in BidPilot",
                        "targets": [{"os": "default", "uri": link}],
                    }
                ],
            }
        else:
            body = {
                "event": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": payload,
            }

        req_data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=req_data,
            headers={"Content-Type": "application/json", "User-Agent": "BidPilot-Webhook-Dispatcher/1.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
            logger.info(f"Dispatched webhook to {service_type} ({webhook_url[:25]}...) → HTTP {status_code}")
            return status_code in (200, 201, 204)

    except Exception as e:
        logger.warning(f"Webhook dispatch failed to {webhook_url}: {e}")
        return False
