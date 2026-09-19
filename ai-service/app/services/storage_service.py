"""
BidPilot AI — Supabase Storage Service
Handles RFP PDF uploads to Supabase Storage (rfp-documents bucket).
"""

import logging
import uuid
from typing import Optional

from supabase import Client

from app.config import get_settings

logger = logging.getLogger("bidpilot.storage")


def build_storage_path(organization_id: str, tender_id: str, filename: str) -> str:
    """Build a deterministic, collision-safe storage path."""
    safe_name = filename.replace(" ", "_").replace("/", "_")
    return f"{organization_id}/{tender_id}/{safe_name}"


def upload_pdf(
    supabase: Client,
    file_bytes: bytes,
    filename: str,
    organization_id: str,
    tender_id: str,
) -> dict:
    """
    Upload a PDF to Supabase Storage.
    Returns { path, bucket, size_bytes, public_url }.
    """
    settings = get_settings()
    path = build_storage_path(organization_id, tender_id, filename)

    logger.info(f"Uploading {filename} ({len(file_bytes):,} bytes) → {settings.storage_bucket}/{path}")

    response = supabase.storage.from_(settings.storage_bucket).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )

    logger.info(f"Upload complete: {path}")

    return {
        "path": path,
        "bucket": settings.storage_bucket,
        "size_bytes": len(file_bytes),
    }


def get_signed_url(supabase: Client, path: str, expires_in: int = 3600) -> Optional[str]:
    """Generate a time-limited download URL (default 1 hour)."""
    settings = get_settings()
    try:
        response = supabase.storage.from_(settings.storage_bucket).create_signed_url(
            path=path,
            expires_in=expires_in,
        )
        return response.get("signedURL") or response.get("signedUrl")
    except Exception as e:
        logger.error(f"Failed to generate signed URL for {path}: {e}")
        return None


def delete_document(supabase: Client, path: str) -> bool:
    """Delete a document from storage. Returns True on success."""
    settings = get_settings()
    try:
        supabase.storage.from_(settings.storage_bucket).remove([path])
        logger.info(f"Deleted storage object: {path}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete {path}: {e}")
        return False
