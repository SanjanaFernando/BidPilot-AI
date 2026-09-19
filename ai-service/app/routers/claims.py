"""
BidPilot AI Service — Claim Verification & Citation Router (Phase 9)
Endpoints for signature 'Prove This Claim' capability, real-time knowledge base verification,
and traceable citation anchoring on proposal sections.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.config import get_settings
from app.dependencies import get_supabase
from app.models.schemas import (
    ClaimVerifyRequest,
    ClaimVerifyResponse,
    ClaimVerifyEvidenceItem,
    InsertCitationRequest,
    CitationItemResponse,
)
from app.services.embedding_service import get_query_embedding
from app.services.vector_service import knowledge_similarity_search

logger = logging.getLogger("bidpilot.claims.router")
router = APIRouter()


@router.post(
    "/verify",
    response_model=ClaimVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Prove This Claim: Real-time verification against company knowledge base",
    description="Vectorizes any selected statement from a proposal and matches evidence across projects, employees, certifications, and documents.",
)
async def verify_claim(
    request: ClaimVerifyRequest,
    supabase: Client = Depends(get_supabase),
) -> ClaimVerifyResponse:
    claim_text = request.claim_text.strip()
    org_id = request.organization_id

    logger.info(f"Verifying claim for org={org_id}: '{claim_text[:60]}...'")

    try:
        # 1. Generate Query Vector
        try:
            query_embedding = get_query_embedding(claim_text)
        except Exception as embed_err:
            logger.warning(f"Gemini embed error, using zero vector fallback: {embed_err}")
            query_embedding = [0.0] * 768

        # 2. Search Knowledge Chunks via RAG vector similarity
        chunks = knowledge_similarity_search(
            supabase=supabase,
            query_embedding=query_embedding,
            organization_id=org_id,
            source_type=request.source_type_filter,
            similarity_threshold=request.match_threshold,
            top_k=request.match_count,
        )

        evidence_items: List[ClaimVerifyEvidenceItem] = []
        for c in chunks:
            sim = float(c.get("similarity", 0.0))
            meta = c.get("metadata") or {}
            evidence_items.append(
                ClaimVerifyEvidenceItem(
                    chunk_id=c.get("id"),
                    source_type=c.get("source_type", "document"),
                    source_id=str(c.get("source_id") or ""),
                    source_name=c.get("source_name", "Verified Company Record"),
                    content_snippet=c.get("content", "")[:350],
                    similarity_score=round(sim, 4),
                    source_page=meta.get("page_number") or meta.get("page"),
                    source_section=meta.get("section_heading") or meta.get("section"),
                )
            )

        top_score = evidence_items[0].similarity_score if evidence_items else 0.0

        # 2. Evaluation with Gemini or Heuristic Fallback
        settings = get_settings()
        is_supported = False
        status_val = "unsupported"
        rationale = ""
        suggested_anchor = "[Ref 1]"

        if top_score >= 0.70:
            status_val = "verified"
            is_supported = True
            confidence = min(98.0, top_score * 100)
            top_src = evidence_items[0]
            src_tag = f"{top_src.source_id or top_src.source_type.upper()}"
            suggested_anchor = f"[{src_tag}: {top_src.source_name[:24]}]"
            rationale = f"Claim is directly backed by company record '{top_src.source_name}' with {round(top_score * 100, 1)}% semantic match."
        elif top_score >= 0.45:
            status_val = "partially_supported"
            is_supported = True
            confidence = top_score * 100
            top_src = evidence_items[0]
            suggested_anchor = f"[{top_src.source_type.upper()}: {top_src.source_name[:24]}]"
            rationale = f"Claim is partially aligned with '{top_src.source_name}' ({round(top_score * 100, 1)}% match), but specific metrics or scopes should be verified by a human reviewer."
        else:
            status_val = "unsupported"
            is_supported = False
            confidence = max(10.0, top_score * 100)
            suggested_anchor = "[Unverified Claim]"
            rationale = "No matching projects, certifications, or past proposals found in company knowledge base that substantiate this claim."

        # Optional LLM Nuance Assessment if Gemini configured
        if settings.is_gemini_configured and evidence_items:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                model = genai.GenerativeModel("gemini-1.5-flash")

                context_snippets = "\n\n".join(
                    [f"- Source: {e.source_name} ({e.source_type})\n  Content: {e.content_snippet}" for e in evidence_items[:3]]
                )
                prompt = f"""You are BidPilot's Claim Verification Auditor.
Claim to evaluate: "{claim_text}"

Company Evidence:
{context_snippets}

Task: Determine if the company evidence supports this claim.
Return a 1-2 sentence factual assessment."""
                
                resp = model.generate_content(prompt)
                if resp and resp.text:
                    rationale = resp.text.strip()
            except Exception as e:
                logger.debug(f"Gemini claim assessment skipped: {e}")

        return ClaimVerifyResponse(
            claim_text=claim_text,
            verification_status=status_val,
            confidence_score=round(confidence, 1),
            is_supported=is_supported,
            assessment_rationale=rationale,
            supporting_evidence=evidence_items,
            suggested_citation_anchor=suggested_anchor,
            suggested_rewrite=None if is_supported else f"Our organization has developed enterprise capabilities in this domain.",
        )

    except Exception as exc:
        logger.error(f"Error in verify_claim: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Claim verification failed: {str(exc)}",
        )


@router.post(
    "/insert-citation",
    response_model=CitationItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Insert a verified citation into a proposal section",
)
async def insert_citation(
    request: InsertCitationRequest,
    supabase: Client = Depends(get_supabase),
) -> CitationItemResponse:
    try:
        # 1. Count existing citations in section
        c_count_res = (
            supabase.table("citations")
            .select("id", count="exact")
            .eq("proposal_section_id", request.proposal_section_id)
            .execute()
        )
        citation_num = request.citation_number or ((c_count_res.count or 0) + 1)
        anchor = request.citation_anchor or f"[Ref {citation_num}: {request.source_name[:20]}]"

        cit_id = str(uuid.uuid4())
        row = {
            "id": cit_id,
            "organization_id": request.organization_id,
            "proposal_section_id": request.proposal_section_id,
            "chunk_id": request.chunk_id,
            "citation_number": citation_num,
            "citation_anchor": anchor,
            "claim_text": request.claim_text,
            "verification_status": request.verification_status,
            "similarity_score": request.similarity_score,
            "source_type": request.source_type,
            "source_id": request.source_id,
            "source_name": request.source_name,
            "source_page": request.source_page,
            "source_section": request.source_section,
            "metadata": request.metadata or {},
        }

        ins_res = supabase.table("citations").insert(row).execute()
        if not ins_res.data:
            raise Exception("Failed to insert citation row into Supabase.")

        # 2. Update verified_claims_count in proposal_sections
        try:
            sec_res = (
                supabase.table("proposal_sections")
                .select("verified_claims_count")
                .eq("id", request.proposal_section_id)
                .limit(1)
                .execute()
            )
            current_verified = (sec_res.data[0].get("verified_claims_count") or 0) if sec_res.data else 0
            supabase.table("proposal_sections").update({
                "verified_claims_count": current_verified + 1
            }).eq("id", request.proposal_section_id).execute()
        except Exception as e:
            logger.warning(f"Could not update section claims count: {e}")

        return CitationItemResponse(
            id=cit_id,
            organization_id=request.organization_id,
            proposal_section_id=request.proposal_section_id,
            citation_number=citation_num,
            citation_anchor=anchor,
            claim_text=request.claim_text,
            verification_status=request.verification_status,
            similarity_score=request.similarity_score,
            source_type=request.source_type,
            source_id=request.source_id,
            source_name=request.source_name,
            source_page=request.source_page,
            source_section=request.source_section,
            created_at=None,
        )
    except Exception as exc:
        logger.error(f"Error inserting citation: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to insert citation: {str(exc)}",
        )


@router.get(
    "/{section_id}",
    response_model=List[CitationItemResponse],
    summary="Get all verified citations and evidence traces for a proposal section",
)
async def get_section_citations(
    section_id: str,
    organization_id: str = Query(..., description="Organization UUID"),
    supabase: Client = Depends(get_supabase),
) -> List[CitationItemResponse]:
    try:
        res = (
            supabase.table("citations")
            .select("*")
            .eq("proposal_section_id", section_id)
            .eq("organization_id", organization_id)
            .order("citation_number", desc=False)
            .execute()
        )
        citations_data = res.data or []

        return [
            CitationItemResponse(
                id=c["id"],
                organization_id=c.get("organization_id", organization_id),
                proposal_section_id=section_id,
                citation_number=c.get("citation_number", idx + 1),
                citation_anchor=c.get("citation_anchor", f"[Ref {idx + 1}]"),
                claim_text=c.get("claim_text", ""),
                verification_status=c.get("verification_status", "verified"),
                similarity_score=c.get("similarity_score", 0.0),
                source_type=c.get("source_type"),
                source_id=c.get("source_id"),
                source_name=c.get("source_name"),
                source_page=c.get("source_page"),
                source_section=c.get("source_section"),
                created_at=c.get("created_at"),
            )
            for idx, c in enumerate(citations_data)
        ]
    except Exception as exc:
        logger.error(f"Error fetching citations: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch citations: {str(exc)}",
        )
