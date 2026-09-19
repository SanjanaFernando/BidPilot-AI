"""
BidPilot AI Service — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import documents, rag, knowledge_ingest

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

        # Try via Supabase management API (needs personal token — will fail with service key)
        # Fallback: log a clear message instructing manual SQL execution
        logger.warning(
            "⚠️  knowledge_chunks table does not exist.\n"
            "   Please run the Phase 5 section of database/schema.sql in the Supabase SQL editor.\n"
            "   Go to: https://supabase.com/dashboard/project/wduvxobmtjpcvjsyvcen/sql/new"
        )

    except Exception as e:
        logger.warning(f"Phase 5 schema bootstrap failed (non-fatal): {e}")


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("🚀 BidPilot AI Service starting up")
    logger.info(f"   Environment : {settings.app_env}")
    logger.info(f"   Supabase    : {'✅ configured' if settings.is_supabase_configured else '⚠️  NOT configured'}")
    logger.info(f"   Gemini      : {'✅ configured' if settings.is_gemini_configured else '⚠️  NOT configured'}")
    logger.info(f"   Embed model : {settings.gemini_embed_model}")
    # Auto-bootstrap Phase 5 schema
    if settings.is_supabase_configured:
        _ensure_phase5_schema()
    yield
    logger.info("🛑 BidPilot AI Service shutting down")



# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="BidPilot AI Service",
    description="RFP upload, document processing, embeddings, RAG search, and knowledge base ingestion for BidPilot.",
    version="0.5.0",
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
        "version": "0.5.0",
        "phase": "Phase 5 — RAG",
        "dependencies": {
            "supabase": settings.is_supabase_configured,
            "gemini": settings.is_gemini_configured,
            "embed_model": settings.gemini_embed_model,
            "generate_model": settings.gemini_generate_model,
        },
    }
