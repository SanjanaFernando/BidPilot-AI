"""
BidPilot AI — Vector Store Service
Stores document chunks with embeddings in Supabase pgvector and performs
cosine similarity search via match_document_chunks (RFP chunks) and
match_knowledge_chunks (KB records) RPCs.
"""

import logging
import uuid
from typing import List, Optional

from supabase import Client

from app.services.pdf_service import DocumentChunk

logger = logging.getLogger("bidpilot.vector")


# ---------------------------------------------------------------------------
# Store RFP document chunks
# ---------------------------------------------------------------------------

def store_chunks(
    supabase: Client,
    chunks: List[DocumentChunk],
    embeddings: List[Optional[List[float]]],
    document_id: str,
    organization_id: str,
) -> int:
    """
    Bulk-insert document chunks with embeddings into the document_chunks table.
    Skips chunks where embedding is None (embedding failed).
    Returns the number of successfully stored chunks.
    """
    rows = []
    for chunk, embedding in zip(chunks, embeddings):
        if embedding is None:
            logger.warning(f"Skipping chunk {chunk.chunk_index} — embedding failed")
            continue

        rows.append({
            "id": str(uuid.uuid4()),
            "organization_id": organization_id,
            "document_id": document_id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.text,
            "page_number": chunk.page_number,
            "section_heading": chunk.section_hint,
            "embedding": embedding,
            "metadata": chunk.metadata,
        })

    if not rows:
        logger.warning("No chunks to store — all embeddings failed")
        return 0

    # Supabase insert in batches of 50 to stay within request size limits
    batch_size = 50
    stored = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase.table("document_chunks").insert(batch).execute()
        stored += len(batch)
        logger.info(f"Stored chunks {i+1}–{i+len(batch)} / {len(rows)}")

    logger.info(f"Total stored: {stored} chunks for document {document_id}")
    return stored


# ---------------------------------------------------------------------------
# Store a single knowledge base chunk
# ---------------------------------------------------------------------------

def store_knowledge_chunk(
    supabase: Client,
    content: str,
    embedding: List[float],
    organization_id: str,
    source_type: str,
    source_id: str,
    source_name: str,
    extra_metadata: Optional[dict] = None,
    clearance_level: str = "public_org_wide",
    is_scrubbed: bool = False,
) -> str:
    """
    Insert a single knowledge-base record (project, employee, tech, cert) as an
    embedded vector into the knowledge_chunks table.
    Includes Phase 13 enterprise governance metadata (clearance_level, is_scrubbed).
    """
    chunk_id = str(uuid.uuid4())
    row = {
        "id": chunk_id,
        "organization_id": organization_id,
        "source_type": source_type,
        "source_id": source_id,
        "source_name": source_name,
        "content": content,
        "embedding": embedding,
        "clearance_level": clearance_level,
        "is_scrubbed": is_scrubbed,
        "metadata": {
            "source_type": source_type,
            "source_id": source_id,
            "source_name": source_name,
            "clearance_level": clearance_level,
            "is_scrubbed": is_scrubbed,
            **(extra_metadata or {}),
        },
    }
    supabase.table("knowledge_chunks").insert(row).execute()
    logger.info(f"Stored KB chunk {chunk_id} (type={source_type}, name={source_name}, clearance={clearance_level})")
    return chunk_id


# ---------------------------------------------------------------------------
# Similarity search — RFP document chunks
# ---------------------------------------------------------------------------

def similarity_search(
    supabase: Client,
    query_embedding: List[float],
    organization_id: str,
    top_k: int = 5,
    tender_id: Optional[str] = None,
    similarity_threshold: float = 0.3,
) -> List[dict]:
    """
    Search for the most relevant RFP document chunks using pgvector cosine similarity.
    Calls the match_document_chunks RPC defined in schema.sql.

    Returns a list of result dicts, each containing:
      - id, content, page_number, section_heading / section, similarity
      - document_id, metadata
    """
    params = {
        "query_embedding": query_embedding,
        "match_threshold": similarity_threshold,
        "match_count": top_k,
        "filter_organization_id": organization_id,
    }

    logger.info(
        f"RAG search: org={organization_id}, tender={tender_id}, top_k={top_k}"
    )

    try:
        response = supabase.rpc("match_document_chunks", params).execute()
        results = response.data or []
        # Support both section and section_heading in returned data
        for r in results:
            if "section_heading" in r and "section" not in r:
                r["section"] = r["section_heading"]
        logger.info(f"RAG search returned {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Similarity search — Knowledge Base chunks with Clearance Filtering (Phase 13)
# ---------------------------------------------------------------------------

CLEARANCE_HIERARCHY = {
    "restricted_nda_only": ["public_org_wide", "confidential_leadership", "restricted_nda_only"],
    "confidential_leadership": ["public_org_wide", "confidential_leadership"],
    "public_org_wide": ["public_org_wide"],
}

def knowledge_similarity_search(
    supabase: Client,
    query_embedding: List[float],
    organization_id: str,
    top_k: int = 5,
    source_type: Optional[str] = None,
    similarity_threshold: float = 0.3,
    user_clearance_level: str = "restricted_nda_only",
) -> List[dict]:
    """
    Search knowledge_chunks for the most relevant KB records.
    Applies Phase 13 Enterprise Clearance Filtering so users only retrieve chunks
    permitted for their clearance tier.
    """
    allowed_levels = CLEARANCE_HIERARCHY.get(
        user_clearance_level, ["public_org_wide"]
    )

    # First attempt governed RPC if available
    try:
        params_gov = {
            "query_embedding": query_embedding,
            "match_threshold": similarity_threshold,
            "match_count": top_k,
            "filter_organization_id": organization_id,
            "filter_source_type": source_type,
            "filter_clearance_levels": allowed_levels,
        }
        response = supabase.rpc("match_knowledge_chunks_governed", params_gov).execute()
        if response.data is not None and len(response.data) > 0:
            logger.info(f"Governed KB search returned {len(response.data)} results (clearance={user_clearance_level})")
            return response.data
    except Exception as e:
        logger.debug(f"Governed RPC not available, using standard RPC with client filter: {e}")

    params = {
        "query_embedding": query_embedding,
        "match_threshold": similarity_threshold,
        "match_count": top_k * 2,
        "filter_organization_id": organization_id,
        "filter_source_type": source_type,
    }

    try:
        response = supabase.rpc("match_knowledge_chunks", params).execute()
        results = response.data or []
        filtered = [
            r for r in results
            if r.get("clearance_level") in allowed_levels
            or (r.get("metadata") or {}).get("clearance_level") in allowed_levels
            or not r.get("clearance_level")
        ][:top_k]
        logger.info(f"KB search returned {len(filtered)} clearance-filtered results")
        return filtered
    except Exception as e:
        logger.error(f"Knowledge search failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Document metadata helpers
# ---------------------------------------------------------------------------

def get_document_chunk_count(supabase: Client, document_id: str) -> int:
    """Return the number of stored RFP chunks for a document."""
    response = (
        supabase.table("document_chunks")
        .select("id", count="exact")
        .eq("document_id", document_id)
        .execute()
    )
    return response.count or 0


# ---------------------------------------------------------------------------
# RAG stats
# ---------------------------------------------------------------------------

def get_rag_stats(supabase: Client, organization_id: str) -> dict:
    """Return aggregate chunk counts for an organization across both tables."""
    try:
        doc_resp = (
            supabase.table("document_chunks")
            .select("id", count="exact")
            .eq("organization_id", organization_id)
            .execute()
        )
        rfp_chunks = doc_resp.count or 0
    except Exception:
        rfp_chunks = 0

    try:
        kb_resp = (
            supabase.table("knowledge_chunks")
            .select("id", count="exact")
            .eq("organization_id", organization_id)
            .execute()
        )
        kb_chunks = kb_resp.count or 0
    except Exception:
        kb_chunks = 0

    return {
        "organization_id": organization_id,
        "rfp_chunks": rfp_chunks,
        "knowledge_chunks": kb_chunks,
        "total_chunks": rfp_chunks + kb_chunks,
    }
