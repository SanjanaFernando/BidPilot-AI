"""
BidPilot AI — RAG Router (Phase 5)
POST /rag/search           → semantic search over RFP document chunks
POST /rag/knowledge-search → semantic search over company knowledge base
GET  /rag/stats            → chunk counts for the organization
GET  /rag/health           → Gemini embedding API health check
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings
from app.services import embedding_service, vector_service

logger = logging.getLogger("bidpilot.rag")
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000, description="Natural language search query")
    organization_id: str = Field(..., description="UUID of the organization")
    tender_id: Optional[str] = Field(None, description="Filter results to a specific tender")
    top_k: int = Field(5, ge=1, le=20, description="Number of results to return")
    similarity_threshold: float = Field(0.3, ge=0.0, le=1.0)


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000, description="Natural language search query")
    organization_id: str = Field(..., description="UUID of the organization")
    source_type: Optional[str] = Field(
        None,
        description="Filter by KB record type: 'project', 'employee', 'technology', 'certification'",
    )
    top_k: int = Field(5, ge=1, le=20, description="Number of results to return")
    similarity_threshold: float = Field(0.3, ge=0.0, le=1.0)


class RAGChunkResult(BaseModel):
    chunk_id: str
    content: str
    page_number: int
    section: str
    similarity: float
    document_id: str
    source_filename: Optional[str] = None
    metadata: dict = {}


class KnowledgeChunkResult(BaseModel):
    chunk_id: str
    content: str
    source_type: str
    source_id: str
    source_name: str
    similarity: float
    metadata: dict = {}


class RAGSearchResponse(BaseModel):
    query: str
    results: List[RAGChunkResult]
    total_found: int
    organization_id: str
    tender_id: Optional[str] = None


class KnowledgeSearchResponse(BaseModel):
    query: str
    results: List[KnowledgeChunkResult]
    total_found: int
    organization_id: str
    source_type: Optional[str] = None


class RAGStatsResponse(BaseModel):
    organization_id: str
    rfp_chunks: int
    knowledge_chunks: int
    total_chunks: int


# ---------------------------------------------------------------------------
# POST /rag/search — RFP document chunks
# ---------------------------------------------------------------------------

@router.post("/search", response_model=RAGSearchResponse)
async def rag_search(
    request: RAGSearchRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Semantic search over all ingested RFP document chunks.

    Steps:
    1. Embed the search query with Gemini text-embedding (RETRIEVAL_QUERY task)
    2. Run pgvector cosine similarity search via match_document_chunks RPC
    3. Return ranked results with page, section, and similarity score
    """
    logger.info(
        f"RAG search: query='{request.query[:80]}', org={request.organization_id}, "
        f"tender={request.tender_id}, top_k={request.top_k}"
    )

    # ── 1. Embed the query ────────────────────────────────────────────────────
    try:
        query_embedding = embedding_service.get_query_embedding(request.query)
    except Exception as e:
        logger.error(f"Query embedding failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Embedding service unavailable: {str(e)}. Check your GEMINI_API_KEY.",
        )

    # ── 2. Similarity search ──────────────────────────────────────────────────
    raw_results = vector_service.similarity_search(
        supabase=supabase,
        query_embedding=query_embedding,
        organization_id=request.organization_id,
        top_k=request.top_k,
        tender_id=request.tender_id,
        similarity_threshold=request.similarity_threshold,
    )

    # ── 3. Shape results ──────────────────────────────────────────────────────
    results: List[RAGChunkResult] = []
    for row in raw_results:
        results.append(
            RAGChunkResult(
                chunk_id=row.get("id", ""),
                content=row.get("content", ""),
                page_number=row.get("page_number", 0),
                section=row.get("section_heading") or row.get("section") or "",
                similarity=round(float(row.get("similarity", 0.0)), 4),
                document_id=row.get("document_id", ""),
                source_filename=row.get("source_filename"),
                metadata=row.get("metadata") or {},
            )
        )

    logger.info(f"Returning {len(results)} results for query: '{request.query[:60]}'")

    return RAGSearchResponse(
        query=request.query,
        results=results,
        total_found=len(results),
        organization_id=request.organization_id,
        tender_id=request.tender_id,
    )


# ---------------------------------------------------------------------------
# POST /rag/knowledge-search — Company Knowledge Base
# ---------------------------------------------------------------------------

@router.post("/knowledge-search", response_model=KnowledgeSearchResponse)
async def knowledge_search(
    request: KnowledgeSearchRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Semantic search over the company knowledge base (projects, employees,
    technologies, certifications) stored in knowledge_chunks.

    Steps:
    1. Embed the search query
    2. Run pgvector cosine similarity search via match_knowledge_chunks RPC
    3. Return ranked KB records with source type and similarity score
    """
    logger.info(
        f"KB search: query='{request.query[:80]}', org={request.organization_id}, "
        f"type={request.source_type}, top_k={request.top_k}"
    )

    # ── 1. Embed the query ─────────────────────────────────────────────────
    try:
        query_embedding = embedding_service.get_query_embedding(request.query)
    except Exception as e:
        logger.error(f"Query embedding failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Embedding service unavailable: {str(e)}.",
        )

    # ── 2. Similarity search ─────────────────────────────────────────────────
    raw_results = vector_service.knowledge_similarity_search(
        supabase=supabase,
        query_embedding=query_embedding,
        organization_id=request.organization_id,
        top_k=request.top_k,
        source_type=request.source_type,
        similarity_threshold=request.similarity_threshold,
    )

    # ── 3. Shape results ─────────────────────────────────────────────────────
    results: List[KnowledgeChunkResult] = []
    for row in raw_results:
        meta = row.get("metadata") or {}
        results.append(
            KnowledgeChunkResult(
                chunk_id=row.get("id", ""),
                content=row.get("content", ""),
                source_type=row.get("source_type") or meta.get("source_type", "unknown"),
                source_id=row.get("source_id") or meta.get("source_id", ""),
                source_name=row.get("source_name") or meta.get("source_name", ""),
                similarity=round(float(row.get("similarity", 0.0)), 4),
                metadata=meta,
            )
        )

    logger.info(f"KB search returning {len(results)} results")

    return KnowledgeSearchResponse(
        query=request.query,
        results=results,
        total_found=len(results),
        organization_id=request.organization_id,
        source_type=request.source_type,
    )


# ---------------------------------------------------------------------------
# GET /rag/stats — Chunk counts
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=RAGStatsResponse)
async def rag_stats(
    organization_id: str,
    supabase: Client = Depends(get_supabase),
):
    """Return aggregate chunk counts for an organization (RFP + KB)."""
    stats = vector_service.get_rag_stats(supabase, organization_id)
    return RAGStatsResponse(**stats)


# ---------------------------------------------------------------------------
# GET /rag/health — Embedding API health check
# ---------------------------------------------------------------------------

@router.get("/health")
async def rag_health():
    """
    Check Gemini embedding API availability.
    Returns model name, dimensions, and latency.
    """
    import time
    start = time.time()
    health = embedding_service.check_gemini_health()
    latency_ms = round((time.time() - start) * 1000, 1)

    return {
        **health,
        "latency_ms": latency_ms,
        "endpoint": "POST /rag/search",
    }
