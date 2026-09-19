"""
BidPilot AI — Knowledge Base Ingest Router (Phase 5)
POST /rag/ingest-knowledge → embed all KB records and store in knowledge_chunks
GET  /rag/ingest-knowledge/status → show ingestion status for an org
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings
from app.services import embedding_service, vector_service

logger = logging.getLogger("bidpilot.knowledge_ingest")
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers — convert KB records to rich text for embedding
# ---------------------------------------------------------------------------

def _project_to_text(p: dict) -> str:
    techs = ", ".join(p.get("technologies") or [])
    lines = [
        f"Project: {p.get('name', '')}",
        f"Client: {p.get('client', '')}",
        f"Industry: {p.get('industry', '')}",
        f"Description: {p.get('description', '')}",
    ]
    if techs:
        lines.append(f"Technologies used: {techs}")
    if p.get("challenges"):
        lines.append(f"Challenges: {p['challenges']}")
    if p.get("solution"):
        lines.append(f"Solution: {p['solution']}")
    if p.get("outcomes"):
        lines.append(f"Outcomes: {p['outcomes']}")
    if p.get("team_size"):
        lines.append(f"Team size: {p['team_size']} people")
    if p.get("budget_range"):
        lines.append(f"Budget: {p['budget_range']}")
    return "\n".join(lines)


def _employee_to_text(e: dict) -> str:
    skills = ", ".join(e.get("skills") or [])
    certs = ", ".join(e.get("certifications") or [])
    lines = [
        f"Employee: {e.get('name', '')}",
        f"Role: {e.get('role', '')}",
        f"Department: {e.get('department', '')}",
        f"Experience: {e.get('experience_years', 0)} years",
    ]
    if skills:
        lines.append(f"Skills: {skills}")
    if certs:
        lines.append(f"Certifications: {certs}")
    if e.get("bio"):
        lines.append(f"Bio: {e['bio']}")
    return "\n".join(lines)


def _technology_to_text(t: dict) -> str:
    projects = ", ".join(t.get("related_projects") or [])
    lines = [
        f"Technology: {t.get('name', '')}",
        f"Category: {t.get('category', '')}",
        f"Experience level: {t.get('experience_level', '')}",
    ]
    if t.get("description"):
        lines.append(f"Description: {t['description']}")
    if projects:
        lines.append(f"Used in projects: {projects}")
    return "\n".join(lines)


def _certification_to_text(c: dict) -> str:
    lines = [
        f"Certification: {c.get('name', '')}",
        f"Issuer: {c.get('issuer', '')}",
        f"Holder type: {c.get('holder_type', '')}",
    ]
    if c.get("issue_date"):
        lines.append(f"Issue date: {c['issue_date']}")
    if c.get("expiry_date"):
        lines.append(f"Expiry date: {c['expiry_date']}")
    if c.get("credential_id"):
        lines.append(f"Credential ID: {c['credential_id']}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class IngestRequest(BaseModel):
    organization_id: str = Field(..., description="UUID of the organization to ingest KB for")
    overwrite: bool = Field(
        False,
        description="If true, delete existing knowledge_chunks for this org before re-ingesting",
    )


class IngestResponse(BaseModel):
    organization_id: str
    projects_ingested: int
    employees_ingested: int
    technologies_ingested: int
    certifications_ingested: int
    total_chunks_stored: int
    errors: int
    message: str


# ---------------------------------------------------------------------------
# POST /rag/ingest-knowledge
# ---------------------------------------------------------------------------

@router.post("/ingest-knowledge", response_model=IngestResponse)
async def ingest_knowledge(
    request: IngestRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Embed all structured knowledge base records (projects, employees, technologies,
    certifications) for an organization and store them in knowledge_chunks.

    This endpoint powers the knowledge-search RAG search over company capability.
    Safe to call repeatedly — use overwrite=true to refresh stale embeddings.
    """
    org_id = request.organization_id
    logger.info(f"Starting KB ingestion for org={org_id}, overwrite={request.overwrite}")

    # ── Optional: clear existing KB chunks ────────────────────────────────────
    if request.overwrite:
        try:
            supabase.table("knowledge_chunks").delete().eq("organization_id", org_id).execute()
            logger.info(f"Cleared existing knowledge_chunks for org={org_id}")
        except Exception as e:
            logger.warning(f"Failed to clear knowledge_chunks: {e}")

    counts = {
        "projects": 0,
        "employees": 0,
        "technologies": 0,
        "certifications": 0,
        "errors": 0,
    }

    # ── Projects ──────────────────────────────────────────────────────────────
    try:
        resp = supabase.table("projects").select("*").eq("organization_id", org_id).execute()
        projects = resp.data or []
        for p in projects:
            try:
                text = _project_to_text(p)
                emb = embedding_service.get_embedding(text, task_type="RETRIEVAL_DOCUMENT")
                vector_service.store_knowledge_chunk(
                    supabase=supabase,
                    content=text,
                    embedding=emb,
                    organization_id=org_id,
                    source_type="project",
                    source_id=str(p.get("id", "")),
                    source_name=p.get("name", "Unknown Project"),
                    extra_metadata={"industry": p.get("industry", ""), "client": p.get("client", "")},
                )
                counts["projects"] += 1
            except Exception as e:
                logger.warning(f"Failed to embed project {p.get('id')}: {e}")
                counts["errors"] += 1
    except Exception as e:
        logger.error(f"Failed to fetch projects: {e}")

    # ── Employees ─────────────────────────────────────────────────────────────
    try:
        resp = supabase.table("employees").select("*").eq("organization_id", org_id).execute()
        employees = resp.data or []
        for e in employees:
            try:
                text = _employee_to_text(e)
                emb = embedding_service.get_embedding(text, task_type="RETRIEVAL_DOCUMENT")
                vector_service.store_knowledge_chunk(
                    supabase=supabase,
                    content=text,
                    embedding=emb,
                    organization_id=org_id,
                    source_type="employee",
                    source_id=str(e.get("id", "")),
                    source_name=e.get("name", "Unknown Employee"),
                    extra_metadata={"role": e.get("role", ""), "department": e.get("department", "")},
                )
                counts["employees"] += 1
            except Exception as ex:
                logger.warning(f"Failed to embed employee {e.get('id')}: {ex}")
                counts["errors"] += 1
    except Exception as e:
        logger.error(f"Failed to fetch employees: {e}")

    # ── Technologies ──────────────────────────────────────────────────────────
    try:
        resp = supabase.table("technologies").select("*").eq("organization_id", org_id).execute()
        technologies = resp.data or []
        for t in technologies:
            try:
                text = _technology_to_text(t)
                emb = embedding_service.get_embedding(text, task_type="RETRIEVAL_DOCUMENT")
                vector_service.store_knowledge_chunk(
                    supabase=supabase,
                    content=text,
                    embedding=emb,
                    organization_id=org_id,
                    source_type="technology",
                    source_id=str(t.get("id", "")),
                    source_name=t.get("name", "Unknown Technology"),
                    extra_metadata={"category": t.get("category", "")},
                )
                counts["technologies"] += 1
            except Exception as ex:
                logger.warning(f"Failed to embed technology {t.get('id')}: {ex}")
                counts["errors"] += 1
    except Exception as e:
        logger.error(f"Failed to fetch technologies: {e}")

    # ── Certifications ────────────────────────────────────────────────────────
    try:
        resp = supabase.table("certifications").select("*").eq("organization_id", org_id).execute()
        certifications = resp.data or []
        for c in certifications:
            try:
                text = _certification_to_text(c)
                emb = embedding_service.get_embedding(text, task_type="RETRIEVAL_DOCUMENT")
                vector_service.store_knowledge_chunk(
                    supabase=supabase,
                    content=text,
                    embedding=emb,
                    organization_id=org_id,
                    source_type="certification",
                    source_id=str(c.get("id", "")),
                    source_name=c.get("name", "Unknown Certification"),
                    extra_metadata={"issuer": c.get("issuer", "")},
                )
                counts["certifications"] += 1
            except Exception as ex:
                logger.warning(f"Failed to embed certification {c.get('id')}: {ex}")
                counts["errors"] += 1
    except Exception as e:
        logger.error(f"Failed to fetch certifications: {e}")

    total = counts["projects"] + counts["employees"] + counts["technologies"] + counts["certifications"]
    logger.info(
        f"KB ingestion complete: {total} chunks stored "
        f"(projects={counts['projects']}, employees={counts['employees']}, "
        f"technologies={counts['technologies']}, certifications={counts['certifications']}, "
        f"errors={counts['errors']})"
    )

    return IngestResponse(
        organization_id=org_id,
        projects_ingested=counts["projects"],
        employees_ingested=counts["employees"],
        technologies_ingested=counts["technologies"],
        certifications_ingested=counts["certifications"],
        total_chunks_stored=total,
        errors=counts["errors"],
        message=(
            f"Ingested {total} knowledge base records into pgvector. "
            f"{'Some records failed — check logs.' if counts['errors'] > 0 else 'All records embedded successfully.'}"
        ),
    )


# ---------------------------------------------------------------------------
# GET /rag/ingest-knowledge/status
# ---------------------------------------------------------------------------

@router.get("/ingest-knowledge/status")
async def ingest_status(
    organization_id: str,
    supabase: Client = Depends(get_supabase),
):
    """Return the number of knowledge chunks currently stored for an organization."""
    try:
        resp = (
            supabase.table("knowledge_chunks")
            .select("source_type", count="exact")
            .eq("organization_id", organization_id)
            .execute()
        )
        total = resp.count or 0
        # Group by source_type
        by_type: dict = {}
        for row in (resp.data or []):
            st = row.get("source_type", "unknown")
            by_type[st] = by_type.get(st, 0) + 1
        return {
            "organization_id": organization_id,
            "total_knowledge_chunks": total,
            "by_source_type": by_type,
            "is_ingested": total > 0,
        }
    except Exception as e:
        logger.error(f"Failed to get ingest status: {e}")
        return {
            "organization_id": organization_id,
            "total_knowledge_chunks": 0,
            "by_source_type": {},
            "is_ingested": False,
        }
