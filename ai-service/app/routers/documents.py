"""
BidPilot AI — Documents Router
POST /documents/upload  → full pipeline: upload → extract → chunk → embed → store
GET  /documents/{id}    → document metadata + chunk count
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings
from app.services import storage_service, pdf_service, embedding_service, vector_service

logger = logging.getLogger("bidpilot.documents")
router = APIRouter()

MAX_FILE_SIZE_MB = 50
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/octet-stream"}


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    document_id: str
    tender_id: str
    organization_id: str
    filename: str
    storage_path: str
    page_count: int
    chunk_count: int
    embedded_count: int
    status: str
    message: str


class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    storage_path: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_rfp(
    file: UploadFile = File(..., description="RFP document (PDF only)"),
    tender_id: str = Form(..., description="UUID of the tender this document belongs to"),
    organization_id: str = Form(..., description="UUID of the organization"),
    supabase: Client = Depends(get_supabase),
):
    """
    Full RFP ingestion pipeline:
    1. Validate and upload PDF to Supabase Storage
    2. Extract text page-by-page with pdfplumber
    3. Chunk text with sliding window (1200 chars, 200 overlap)
    4. Generate 768-dim embeddings via Gemini text-embedding-004
    5. Store chunks + embeddings in document_chunks (pgvector)
    6. Register document record in knowledge_documents table
    """
    settings = get_settings()

    # ── Validate ──────────────────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB.",
        )

    document_id = str(uuid.uuid4())
    filename = file.filename
    logger.info(f"Processing upload: {filename} ({size_mb:.2f} MB) → doc={document_id}")

    # ── 1. Upload to Supabase Storage ─────────────────────────────────────────
    try:
        storage_result = storage_service.upload_pdf(
            supabase=supabase,
            file_bytes=file_bytes,
            filename=filename,
            organization_id=organization_id,
            tender_id=tender_id,
        )
        storage_path = storage_result["path"]
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # ── 2 & 3. Extract text + chunk ───────────────────────────────────────────
    try:
        pages, chunks = pdf_service.process_pdf(
            file_bytes=file_bytes,
            document_id=document_id,
            tender_id=tender_id,
            organization_id=organization_id,
        )
        page_count = len(pages)
        chunk_count = len(chunks)
    except Exception as e:
        logger.error(f"PDF processing failed: {e}")
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {str(e)}")

    # ── 4. Generate embeddings ────────────────────────────────────────────────
    try:
        texts = [c.text for c in chunks]
        embeddings = embedding_service.get_embeddings_batch(texts)
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        # Proceed without embeddings — store chunks only
        embeddings = [None] * len(chunks)

    # ── 5. Register parent document in knowledge_documents ──────────────────
    full_text = "\n\n".join(p.raw_text for p in pages)
    try:
        supabase.table("knowledge_documents").insert({
            "id": document_id,
            "organization_id": organization_id,
            "title": filename.replace(".pdf", "").replace("_", " ").title(),
            "document_type": "rfp",
            "file_path": storage_path,
            "file_size_bytes": len(file_bytes),
            "mime_type": "application/pdf",
            "extracted_text": full_text,
            "is_processed": False,
            "chunk_count": chunk_count,
            "metadata": {
                "tender_id": tender_id,
                "size_mb": round(size_mb, 2),
                "source_filename": filename,
                "page_count": page_count,
                "processing_status": "processing",
            },
        }).execute()
    except Exception as e:
        logger.error(f"Failed to create document record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create document record: {str(e)}")

    # ── 6. Store chunks in pgvector (requires document_id foreign key) ─────────
    embedded_count = vector_service.store_chunks(
        supabase=supabase,
        chunks=chunks,
        embeddings=embeddings,
        document_id=document_id,
        organization_id=organization_id,
    )

    # ── 7. Mark document as processed ─────────────────────────────────────────
    try:
        supabase.table("knowledge_documents").update({
            "is_processed": embedded_count > 0,
            "metadata": {
                "tender_id": tender_id,
                "size_mb": round(size_mb, 2),
                "embedded_chunks": embedded_count,
                "source_filename": filename,
                "page_count": page_count,
                "processing_status": "completed" if embedded_count > 0 else "partial",
            },
        }).eq("id", document_id).execute()
    except Exception as e:
        logger.warning(f"Failed to update document status: {e}")

    logger.info(
        f"✅ Upload complete: doc={document_id}, pages={page_count}, "
        f"chunks={chunk_count}, embedded={embedded_count}"
    )

    return UploadResponse(
        document_id=document_id,
        tender_id=tender_id,
        organization_id=organization_id,
        filename=filename,
        storage_path=storage_path,
        page_count=page_count,
        chunk_count=chunk_count,
        embedded_count=embedded_count,
        status="completed" if embedded_count > 0 else "partial",
        message=(
            f"Successfully processed {page_count} pages into {embedded_count} "
            f"embedded chunks ready for semantic search."
        ),
    )


@router.get("/{document_id}", response_model=DocumentInfo)
async def get_document(
    document_id: str,
    supabase: Client = Depends(get_supabase),
):
    """Get document metadata and chunk count."""
    try:
        response = (
            supabase.table("knowledge_documents")
            .select("*")
            .eq("id", document_id)
            .single()
            .execute()
        )
        doc = response.data
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        chunk_count = vector_service.get_document_chunk_count(supabase, document_id)
        meta = doc.get("metadata") or {}

        return DocumentInfo(
            document_id=document_id,
            filename=meta.get("source_filename", doc.get("file_path", "")),
            page_count=meta.get("page_count", 0),
            chunk_count=chunk_count,
            storage_path=doc.get("file_path", ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
