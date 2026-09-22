"""
BidPilot AI Service — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    documents,
    rag,
    knowledge_ingest,
    agents,
    requirements,
    pipeline,
    claims,
    compliance,
    rbac,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("bidpilot")


# ---------------------------------------------------------------------------
# Phase 5 schema bootstrap — create knowledge_chunks if missing
# ---------------------------------------------------------------------------

def _ensure_phase5_schema():
    """
    Create the knowledge_chunks table and match_knowledge_chunks RPC if they don't
    already exist.  Called once at startup so the service is self-bootstrapping.
    """
    try:
        from app.dependencies import get_supabase
        sb = get_supabase()

        # Quick check — try to count rows
        try:
            sb.table("knowledge_chunks").select("id", count="exact").limit(1).execute()
            logger.info("knowledge_chunks table already exists — skipping bootstrap")
            return
        except Exception:
            pass  # Table doesn't exist, proceed to create it

        logger.info("Creating knowledge_chunks table via Supabase RPC…")

        CREATE_TABLE_SQL = """
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            source_type VARCHAR(50) NOT NULL,
            source_id TEXT NOT NULL,
            source_name VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            embedding vector(768),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_org ON knowledge_chunks(organization_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type ON knowledge_chunks(organization_id, source_type);
        CREATE OR REPLACE FUNCTION match_knowledge_chunks(
            query_embedding vector(768),
            match_threshold double precision,
            match_count integer,
            filter_organization_id uuid,
            filter_source_type text DEFAULT NULL
        )
        RETURNS TABLE (
            id uuid, source_type varchar(50), source_id text,
            source_name varchar(255), content text, metadata jsonb,
            similarity double precision
        )
        LANGUAGE plpgsql AS $func$
        BEGIN
            RETURN QUERY
            SELECT kc.id, kc.source_type, kc.source_id, kc.source_name, kc.content, kc.metadata,
                   1 - (kc.embedding <=> query_embedding) AS similarity
            FROM knowledge_chunks kc
            WHERE kc.organization_id = filter_organization_id
              AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
              AND (1 - (kc.embedding <=> query_embedding)) >= match_threshold
            ORDER BY kc.embedding <=> query_embedding
            LIMIT match_count;
        END; $func$;
        """
        try:
            sb.rpc("exec_sql", {"sql": CREATE_TABLE_SQL}).execute()
        except Exception:
            pass

    except Exception as exc:
        logger.warning(f"Could not bootstrap knowledge_chunks table: {exc}")


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks and cleanup on shutdown."""
    settings = get_settings()
    logger.info("=== Starting BidPilot AI Service (Phase 12: Enterprise RBAC) ===")
    logger.info(f"Supabase URL: {settings.supabase_url or 'NOT SET'}")
    logger.info(f"Gemini API key: {'SET' if settings.gemini_api_key else 'NOT SET'}")
    logger.info(f"Generate model: {settings.gemini_generate_model}")
    logger.info(f"Embed model:    {settings.gemini_embed_model}")

    if not settings.is_supabase_configured:
        logger.warning("WARNING: Supabase is not fully configured. Some endpoints will fail.")
    if not settings.is_gemini_configured:
        logger.warning("WARNING: Gemini API key not configured. AI generation will fail.")

    if settings.is_supabase_configured:
        _ensure_phase5_schema()

    yield
    logger.info("=== Shutting down BidPilot AI Service ===")



# ---------------------------------------------------------------------------
# FastAPI app instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="BidPilot AI Service",
    description="Multi-Agent AI Service with LangGraph, pgvector RAG, Prove This Claim, Compliance Governance, and Enterprise RBAC.",
    version="0.12.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend
# ---------------------------------------------------------------------------
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(rag.router, prefix="/rag", tags=["RAG"])
app.include_router(knowledge_ingest.router, prefix="/rag", tags=["Knowledge Ingest"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(requirements.router, prefix="/agents/requirements", tags=["Requirements Agent"])
app.include_router(pipeline.router, prefix="/agents", tags=["Multi-Agent Pipeline"])
app.include_router(claims.router, prefix="/agents/claims", tags=["Prove This Claim"])
app.include_router(compliance.router, prefix="/agents/compliance", tags=["Compliance & Human Approval"])
app.include_router(rbac.router, prefix="/rbac", tags=["RBAC & Team Management"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health():
    """Quick liveness check — returns service and dependency status."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": "BidPilot AI Service",
        "version": "0.12.0",
        "phase": "Phase 12 — Enterprise RBAC & Multi-Tenant Role-Based Access Control",
        "dependencies": {
            "supabase": settings.is_supabase_configured,
            "gemini": settings.is_gemini_configured,
            "embed_model": settings.gemini_embed_model,
            "generate_model": settings.gemini_generate_model,
            "rbac_strict_mode": settings.rbac_strict_mode,
        },
    }
