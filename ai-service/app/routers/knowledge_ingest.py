"""
BidPilot AI — Knowledge Base Ingest Router (Phase 5 & Phase 13)
POST /rag/ingest-knowledge → embed all KB records and store in knowledge_chunks with secret scrubbing
GET  /rag/ingest-knowledge/status → show ingestion status for an org
POST /rag/scan-secrets → test/preview secret and PII detection
"""

import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings
from app.services import embedding_service, vector_service, scrubber_service

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
    lines = [
        f"Technology: {t.get('name', '')}",
        f"Category: {t.get('category', '')}",
        f"Proficiency: {t.get('proficiency_level', '')}",
    ]
    if t.get("description"):
        lines.append(f"Description: {t['description']}")
    if t.get("years_experience"):
        lines.append(f"Years of Experience: {t['years_experience']} years")
    return "\n".join(lines)


def _certification_to_text(c: dict) -> str:
    lines = [
        f"Certification: {c.get('name', '')}",
        f"Issuer: {c.get('issuer', '')}",
    ]
    if c.get("credential_id"):
        lines.append(f"Credential ID: {c['credential_id']}")
    if c.get("description"):
        lines.append(f"Description: {c['description']}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IngestRequest(BaseModel):
    organization_id: str = Field(..., description="Organization UUID")
    overwrite: bool = Field(False, description="Whether to clear existing knowledge_chunks first")
    enable_scrubbing: bool = Field(True, description="Phase 13: Automatically detect and redact secrets/PII")


class IngestResponse(BaseModel):
    organization_id: str
    projects_ingested: int
    employees_ingested: int
    technologies_ingested: int
    certifications_ingested: int
    total_chunks_stored: int
    total_secrets_scrubbed: int
    errors: int
    message: str


class ScanSecretsRequest(BaseModel):
    text: str = Field(..., description="Text payload to inspect for secrets, credentials, or PII")


# ---------------------------------------------------------------------------
# POST /rag/scan-secrets (Phase 13 Governance)
# ---------------------------------------------------------------------------

@router.post("/scan-secrets")
async def scan_secrets(request: ScanSecretsRequest):
    """
    Inspect text payload for secrets, credentials, internal rates, and PII without modifying it.
    Returns findings summary with masked previews.
    """
    findings = scrubber_service.scan_text(request.text)
    scrubbed_preview, _ = scrubber_service.scrub_text(request.text)
    return {
        "findings_count": len(findings),
        "has_sensitive_data": len(findings) > 0,
        "findings": findings,
        "scrubbed_preview": scrubbed_preview,
    }


# ---------------------------------------------------------------------------
# POST /rag/ingest-knowledge (Phase 13 Governed & Scrubbed)
# ---------------------------------------------------------------------------

@router.post("/ingest-knowledge", response_model=IngestResponse)
async def ingest_knowledge(
    request: IngestRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Embed all structured knowledge base records (projects, employees, technologies,
    certifications) for an organization and store them in knowledge_chunks.
    Applies Phase 13 Secret Scrubbing and Enterprise Clearance Tiers.
    """
    org_id = request.organization_id
    logger.info(f"Starting KB ingestion for org={org_id}, overwrite={request.overwrite}, scrubbing={request.enable_scrubbing}")

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
        "scrubbed": 0,
        "errors": 0,
    }

    # ── Projects ──────────────────────────────────────────────────────────────
    try:
        resp = supabase.table("projects").select("*").eq("organization_id", org_id).execute()
        projects = resp.data or []
        for p in projects:
            try:
                raw_text = _project_to_text(p)
                clearance = p.get("clearance_level", "public_org_wide")
                is_scrubbed = False
                if request.enable_scrubbing:
                    text, findings = scrubber_service.scrub_text(raw_text)
                    if findings:
                        is_scrubbed = True
                        counts["scrubbed"] += len(findings)
                else:
                    text = raw_text

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
                    clearance_level=clearance,
                    is_scrubbed=is_scrubbed,
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
                raw_text = _employee_to_text(e)
                clearance = e.get("clearance_level", "public_org_wide")
                is_scrubbed = False
                if request.enable_scrubbing:
                    text, findings = scrubber_service.scrub_text(raw_text)
                    if findings:
                        is_scrubbed = True
                        counts["scrubbed"] += len(findings)
                else:
                    text = raw_text

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
                    clearance_level=clearance,
                    is_scrubbed=is_scrubbed,
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
                raw_text = _technology_to_text(t)
                clearance = t.get("clearance_level", "public_org_wide")
                is_scrubbed = False
                if request.enable_scrubbing:
                    text, findings = scrubber_service.scrub_text(raw_text)
                    if findings:
                        is_scrubbed = True
                        counts["scrubbed"] += len(findings)
                else:
                    text = raw_text

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
                    clearance_level=clearance,
                    is_scrubbed=is_scrubbed,
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
                raw_text = _certification_to_text(c)
                clearance = c.get("clearance_level", "public_org_wide")
                is_scrubbed = False
                if request.enable_scrubbing:
                    text, findings = scrubber_service.scrub_text(raw_text)
                    if findings:
                        is_scrubbed = True
                        counts["scrubbed"] += len(findings)
                else:
                    text = raw_text

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
                    clearance_level=clearance,
                    is_scrubbed=is_scrubbed,
                )
                counts["certifications"] += 1
            except Exception as ex:
                logger.warning(f"Failed to embed certification {c.get('id')}: {ex}")
                counts["errors"] += 1
    except Exception as e:
        logger.error(f"Failed to fetch certifications: {e}")

    total = counts["projects"] + counts["employees"] + counts["technologies"] + counts["certifications"]
    logger.info(
        f"KB ingestion complete: {total} chunks stored, {counts['scrubbed']} secrets scrubbed "
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
        total_secrets_scrubbed=counts["scrubbed"],
        errors=counts["errors"],
        message=(
            f"Ingested {total} knowledge base records into pgvector. "
            f"Scrubbed {counts['scrubbed']} sensitive tokens. "
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
            .select("source_type, clearance_level, is_scrubbed", count="exact")
            .eq("organization_id", organization_id)
            .execute()
        )
        total = resp.count or 0
        by_type: dict = {}
        scrubbed_count = 0
        for row in (resp.data or []):
            st = row.get("source_type", "unknown")
            by_type[st] = by_type.get(st, 0) + 1
            if row.get("is_scrubbed"):
                scrubbed_count += 1

        return {
            "organization_id": organization_id,
            "total_knowledge_chunks": total,
            "by_source_type": by_type,
            "scrubbed_chunks": scrubbed_count,
            "is_ingested": total > 0,
        }
    except Exception as e:
        logger.error(f"Failed to get ingest status: {e}")
        return {
            "organization_id": organization_id,
            "total_knowledge_chunks": 0,
            "by_source_type": {},
            "scrubbed_chunks": 0,
            "is_ingested": False,
        }
