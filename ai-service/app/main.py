"""
BidPilot AI Service — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware.rate_limiter import RateLimiterMiddleware
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
    audit,
    notifications,
    webhooks,
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
            clearance_level VARCHAR(30) DEFAULT 'public_org_wide',
            is_scrubbed BOOLEAN DEFAULT FALSE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_org ON knowledge_chunks(organization_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type ON knowledge_chunks(organization_id, source_type);
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
    logger.info("=== Starting BidPilot AI Service (Phases 13-15: Governance, E-Signatures, Notifications) ===")
    logger.info(f"Supabase URL: {settings.supabase_url or 'NOT SET'}")
    logger.info(f"Gemini API key: {'SET' if settings.gemini_api_key else 'NOT SET'}")
    logger.info(f"Generate model: {settings.gemini_generate_model}")
    logger.info(f"Embed model:    {settings.gemini_embed_model}")
    logger.info(f"Rate limiter:   {'Redis @ ' + settings.upstash_redis_rest_url if settings.is_redis_configured else 'DISABLED (no Upstash Redis configured)'}")

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
    description="Multi-Agent AI Service with LangGraph, pgvector RAG, Prove This Claim, Compliance Governance, Enterprise RBAC, Secret Scrubbing, Cryptographic Audit Trail & Webhooks.",
    version="0.15.0",
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
# Rate Limiter (Phase 16) — added after CORSMiddleware
# ---------------------------------------------------------------------------
app.add_middleware(
    RateLimiterMiddleware,
    redis_url=settings.upstash_redis_rest_url or None,
    redis_token=settings.upstash_redis_rest_token or None,
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
app.include_router(audit.router, prefix="/audit", tags=["Cryptographic Audit & E-Signatures"])
app.include_router(notifications.router, prefix="/notifications", tags=["Enterprise Notifications"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["Inbound Webhooks"])


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
        "version": "0.16.0",
        "phase": "Phase 16 — Cloud Production Deployment & High-Availability Scaling",
        "dependencies": {
            "supabase": settings.is_supabase_configured,
            "gemini": settings.is_gemini_configured,
            "embed_model": settings.gemini_embed_model,
            "generate_model": settings.gemini_generate_model,
            "rbac_strict_mode": settings.rbac_strict_mode,
            "rate_limiter": settings.is_redis_configured,
            "environment": settings.app_env,
        },
    }
