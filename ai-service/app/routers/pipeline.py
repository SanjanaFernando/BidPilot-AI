"""
BidPilot AI Service — Multi-Agent Pipeline & Proposal Router
Endpoints for executing the multi-agent proposal synthesis pipeline, running individual stages,
and retrieving generated proposals and orchestration telemetry.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from app.config import get_settings
from app.dependencies import get_supabase
from app.models.schemas import (
    PipelineRunRequest,
    PipelineRunResponse,
    PipelineStageRunRequest,
    PipelineStageInfo,
)
from app.agents import orchestrator, requirement_agent

logger = logging.getLogger("bidpilot.pipeline.router")
router = APIRouter()


class ProposalSectionDetail(BaseModel):
    id: str
    proposal_id: Optional[str] = None
    section_type: Optional[str] = None
    title: str
    order_index: int
    content_markdown: str
    status: Optional[str] = "ready_for_review"
    verified_claims_count: int = 0
    unverified_claims_count: int = 0
    created_at: Optional[str] = None


class ProposalDetailResponse(BaseModel):
    id: str
    tender_id: str
    organization_id: str
    title: str
    version: int = 1
    status: str = "generated"
    compliance_score: Optional[float] = None
    win_probability: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    sections: List[ProposalSectionDetail] = []


@router.post(
    "/pipeline/run",
    response_model=PipelineRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute the full multi-agent proposal generation pipeline",
    description="Runs RFP Analysis -> Requirement Audit -> Tech & Business Strategy -> Proposal Synthesis -> Compliance Audit -> Review Quality/Win Scoring -> DB Persistence.",
)
async def run_pipeline(
    request: PipelineRunRequest,
    supabase: Client = Depends(get_supabase),
) -> PipelineRunResponse:
    try:
        logger.info(
            f"Triggering full pipeline for tender={request.tender_id}, org={request.organization_id}"
        )
        result = orchestrator.run_full_pipeline(
            supabase=supabase,
            organization_id=request.organization_id,
            tender_id=request.tender_id,
            document_id=request.document_id,
            target_proposal_title=request.target_proposal_title,
            selected_stages=request.stages,
        )
        return PipelineRunResponse(**result)
    except Exception as exc:
        logger.error(f"Pipeline execution error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution failed: {str(exc)}",
        )


@router.get(
    "/pipeline/status/{tender_id}",
    summary="Get recent multi-agent pipeline runs and status for a tender",
)
async def get_pipeline_status(
    tender_id: str,
    organization_id: str = Query(..., description="Organization UUID"),
    limit: int = Query(5, ge=1, le=20),
    supabase: Client = Depends(get_supabase),
) -> Dict[str, Any]:
    try:
        resolved_uuid = requirement_agent._resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id

        # Query agent_runs table for recent orchestration telemetry
        runs_query = (
            supabase.table("agent_runs")
            .select("*")
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        runs_res = runs_query.execute()
        runs_data = runs_res.data or []

        # Check existing proposal
        prop_query = (
            supabase.table("proposals")
            .select("id, title, version, status, compliance_score, win_probability, created_at, updated_at")
            .eq("tender_id", resolved_uuid)
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        latest_proposal = prop_query.data[0] if prop_query.data else None

        return {
            "tender_id": tender_id,
            "resolved_uuid": resolved_uuid,
            "latest_proposal": latest_proposal,
            "agent_runs": runs_data,
        }
    except Exception as exc:
        logger.error(f"Error getting pipeline status: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pipeline status: {str(exc)}",
        )


@router.get(
    "/proposals/{tender_id}",
    response_model=ProposalDetailResponse,
    summary="Get the generated proposal with all sections for a tender",
)
async def get_proposal(
    tender_id: str,
    organization_id: str = Query(..., description="Organization UUID"),
    supabase: Client = Depends(get_supabase),
) -> ProposalDetailResponse:
    try:
        resolved_uuid = requirement_agent._resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id

        prop_query = (
            supabase.table("proposals")
            .select("*")
            .eq("tender_id", resolved_uuid)
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(1)
        )
        prop_res = prop_query.execute()
        if not prop_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No proposal found for tender {tender_id}",
            )

        proposal_row = prop_res.data[0]
        proposal_id = proposal_row["id"]

        # Fetch sections
        sec_res = (
            supabase.table("proposal_sections")
            .select("*")
            .eq("proposal_id", proposal_id)
            .order("order_index", desc=False)
            .execute()
        )
        sections_data = sec_res.data or []

        return ProposalDetailResponse(
            id=proposal_id,
            tender_id=tender_id,
            organization_id=organization_id,
            title=proposal_row.get("title", f"Proposal for {tender_id}"),
            version=proposal_row.get("version", 1),
            status=proposal_row.get("status", "generated"),
            compliance_score=proposal_row.get("compliance_score"),
            win_probability=proposal_row.get("win_probability"),
            metadata=proposal_row.get("metadata"),
            created_at=proposal_row.get("created_at"),
            sections=[
                ProposalSectionDetail(
                    id=s["id"],
                    proposal_id=proposal_id,
                    section_type=s.get("section_type"),
                    title=s.get("title", f"Section {idx + 1}"),
                    order_index=s.get("order_index", idx + 1),
                    content_markdown=s.get("content_markdown", ""),
                    status=s.get("status", "ready_for_review"),
                    verified_claims_count=s.get("verified_claims_count", 0),
                    unverified_claims_count=s.get("unverified_claims_count", 0),
                    created_at=s.get("created_at"),
                )
                for idx, s in enumerate(sections_data)
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching proposal: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch proposal: {str(exc)}",
        )


@router.get(
    "/proposals/{tender_id}/export-docx",
    summary="Export the complete proposal as a formatted Microsoft Word (.docx) document",
)
async def export_proposal_docx(
    tender_id: str,
    organization_id: str = Query(..., description="Organization UUID"),
    supabase: Client = Depends(get_supabase),
):
    from fastapi.responses import StreamingResponse
    from app.services.docx_exporter import build_proposal_docx

    try:
        resolved_uuid = requirement_agent._resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id

        # Fetch tender info
        t_res = supabase.table("tenders").select("*").eq("id", resolved_uuid).limit(1).execute()
        tender_row = t_res.data[0] if t_res.data else {}
        tender_title = tender_row.get("title") or f"Tender {tender_id}"
        client_name = tender_row.get("client_name") or "Issuing Client"

        # Fetch proposal
        prop_res = (
            supabase.table("proposals")
            .select("*")
            .eq("tender_id", resolved_uuid)
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not prop_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No proposal found for tender {tender_id}",
            )

        proposal_row = prop_res.data[0]
        proposal_id = proposal_row["id"]

        # Fetch sections
        sec_res = (
            supabase.table("proposal_sections")
            .select("*")
            .eq("proposal_id", proposal_id)
            .order("order_index", desc=False)
            .execute()
        )
        sections_data = sec_res.data or []

        # Build DOCX in memory
        docx_stream = build_proposal_docx(
            tender_title=tender_title,
            tender_ref=tender_id,
            client_name=client_name,
            sections=sections_data,
            compliance_score=proposal_row.get("compliance_score", 95.0),
            win_probability=proposal_row.get("win_probability", 90.0),
            version=proposal_row.get("version", 1),
        )

        filename = f"Proposal_{tender_id}.docx"
        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating proposal DOCX: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate proposal DOCX: {str(exc)}",
        )

