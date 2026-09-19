"""
BidPilot AI — Requirement Agent Router (Phase 7)

Routes:
POST  /agents/requirements/evaluate        → Batch evaluate requirements against KB
POST  /agents/requirements/evaluate-single → Evaluate a single requirement on-demand
GET   /agents/requirements/{tender_id}    → List all requirements with status & evidence
PATCH /agents/requirements/{req_id}       → Update/override requirement status or notes
POST  /agents/requirements/export          → Export compliance matrix as CSV
"""

import csv
import io
import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings
from app.agents import requirement_agent
from app.models.schemas import (
    BatchEvaluateRequirementsRequest,
    SingleEvaluateRequirementRequest,
    RequirementUpdatePayload,
    RequirementEvaluationSchema,
)

logger = logging.getLogger("bidpilot.requirements.router")
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RequirementSummaryStats(BaseModel):
    total: int
    covered: int
    partially_covered: int
    missing: int
    evidence_required: int
    unverified: int
    mandatory_total: int
    mandatory_covered: int
    coverage_percentage: float


class RequirementMatrixItem(BaseModel):
    id: str
    organization_id: str
    tender_id: str
    req_code: str
    category: str
    title: str
    description: str
    is_mandatory: bool
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    status: str
    match_score: float
    notes: Optional[str] = None
    evidence_metadata: List[Dict[str, Any]] = Field(default_factory=list)
    assigned_to: Optional[str] = None
    created_at: str
    updated_at: str


class RequirementMatrixResponse(BaseModel):
    tender_id: str
    organization_id: str
    stats: RequirementSummaryStats
    requirements: List[RequirementMatrixItem]


class BatchEvaluateResponse(BaseModel):
    run_id: str
    tender_id: str
    evaluated_count: int
    evaluations: List[RequirementEvaluationSchema]
    stats: Dict[str, Any]
    latency_ms: int
    message: str


class SingleEvaluateResponse(BaseModel):
    requirement_id: str
    tender_id: str
    evaluation: RequirementEvaluationSchema
    latency_ms: int


# ---------------------------------------------------------------------------
# POST /agents/requirements/evaluate
# ---------------------------------------------------------------------------

@router.post("/evaluate", response_model=BatchEvaluateResponse)
async def batch_evaluate_requirements(
    request: BatchEvaluateRequirementsRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Run Requirement Agent across all or selected requirements for a tender.
    Evaluates capabilities against company knowledge RAG, updates database statuses,
    recalculates tender coverage percentage, and records an agent_run.
    """
    logger.info(
        f"Batch evaluating requirements: tender={request.tender_id}, org={request.organization_id}, mode={request.mode}"
    )

    try:
        result = requirement_agent.run_requirement_evaluation(
            supabase=supabase,
            organization_id=request.organization_id,
            tender_id=request.tender_id,
            requirement_ids=request.requirement_ids,
            mode=request.mode,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in batch requirement evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Requirement agent error: {str(e)}")

    return BatchEvaluateResponse(
        run_id=result["run_id"],
        tender_id=result["tender_id"],
        evaluated_count=result["evaluated_count"],
        evaluations=[RequirementEvaluationSchema(**ev) for ev in result["evaluations"]],
        stats=result["stats"],
        latency_ms=result["latency_ms"],
        message=result["message"],
    )


# ---------------------------------------------------------------------------
# POST /agents/requirements/evaluate-single
# ---------------------------------------------------------------------------

@router.post("/evaluate-single", response_model=SingleEvaluateResponse)
async def evaluate_single_requirement(
    request: SingleEvaluateRequirementRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Evaluate a specific requirement against company knowledge on-demand.
    """
    logger.info(
        f"Evaluating single requirement: req={request.requirement_id}, tender={request.tender_id}"
    )

    try:
        result = requirement_agent.evaluate_single_requirement_by_id(
            supabase=supabase,
            organization_id=request.organization_id,
            tender_id=request.tender_id,
            requirement_id=request.requirement_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in single requirement evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")

    return SingleEvaluateResponse(
        requirement_id=result["requirement_id"],
        tender_id=result["tender_id"],
        evaluation=RequirementEvaluationSchema(**result["evaluation"]),
        latency_ms=result["latency_ms"],
    )


# ---------------------------------------------------------------------------
# GET /agents/requirements/{tender_id}
# ---------------------------------------------------------------------------

@router.get("/{tender_id}", response_model=RequirementMatrixResponse)
async def get_tender_requirement_matrix(
    tender_id: str,
    organization_id: str = Query(..., description="Organization UUID"),
    status: Optional[str] = Query(None, description="Filter by status (covered, missing, etc.)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_mandatory: Optional[bool] = Query(None, description="Filter mandatory requirements"),
    supabase: Client = Depends(get_supabase),
):
    """
    Fetch the complete requirement matrix for a tender with aggregated statistics,
    evidence metadata, and optional filtering.
    """
    try:
        resolved_tender_id = requirement_agent._resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id

        # Fetch all requirements for stats
        all_reqs_resp = (
            supabase.table("requirements")
            .select("*")
            .eq("tender_id", resolved_tender_id)
            .eq("organization_id", organization_id)
            .order("req_code")
            .execute()
        )
        all_rows = all_reqs_resp.data or []
    except Exception as e:
        logger.error(f"Could not fetch requirements: {e}")
        all_rows = []

    total = len(all_rows)
    covered = sum(1 for r in all_rows if r.get("status") == "covered")
    partial = sum(1 for r in all_rows if r.get("status") == "partially_covered")
    missing = sum(1 for r in all_rows if r.get("status") == "missing")
    evidence_needed = sum(1 for r in all_rows if r.get("status") == "evidence_required")
    unverified = sum(1 for r in all_rows if r.get("status") == "unverified")
    mandatory_total = sum(1 for r in all_rows if r.get("is_mandatory") is True)
    mandatory_covered = sum(
        1 for r in all_rows if r.get("is_mandatory") is True and r.get("status") == "covered"
    )
    coverage_pct = round((covered / total * 100), 1) if total > 0 else 0.0

    stats = RequirementSummaryStats(
        total=total,
        covered=covered,
        partially_covered=partial,
        missing=missing,
        evidence_required=evidence_needed,
        unverified=unverified,
        mandatory_total=mandatory_total,
        mandatory_covered=mandatory_covered,
        coverage_percentage=coverage_pct,
    )

    # Filter rows if query params provided
    filtered_rows = all_rows
    if status:
        filtered_rows = [r for r in filtered_rows if r.get("status") == status]
    if category:
        filtered_rows = [r for r in filtered_rows if r.get("category", "").lower() == category.lower()]
    if is_mandatory is not None:
        filtered_rows = [r for r in filtered_rows if r.get("is_mandatory") == is_mandatory]

    matrix_items = [
        RequirementMatrixItem(
            id=str(r["id"]),
            organization_id=str(r["organization_id"]),
            tender_id=str(r["tender_id"]),
            req_code=r.get("req_code", ""),
            category=r.get("category", "General"),
            title=r.get("title", ""),
            description=r.get("description", ""),
            is_mandatory=r.get("is_mandatory", True),
            source_page=r.get("source_page"),
            source_section=r.get("source_section"),
            status=r.get("status", "unverified"),
            match_score=float(r.get("match_score") or 0.0),
            notes=r.get("notes"),
            evidence_metadata=r.get("evidence_metadata") or [],
            assigned_to=str(r["assigned_to"]) if r.get("assigned_to") else None,
            created_at=str(r.get("created_at", "")),
            updated_at=str(r.get("updated_at", "")),
        )
        for r in filtered_rows
    ]

    return RequirementMatrixResponse(
        tender_id=tender_id,
        organization_id=organization_id,
        stats=stats,
        requirements=matrix_items,
    )


# ---------------------------------------------------------------------------
# PATCH /agents/requirements/{requirement_id}
# ---------------------------------------------------------------------------

@router.patch("/{requirement_id}")
async def update_requirement(
    requirement_id: str,
    payload: RequirementUpdatePayload,
    organization_id: str = Query(..., description="Organization UUID"),
    supabase: Client = Depends(get_supabase),
):
    """
    Manual human review update/override for a requirement.
    Allows updating status, match score, notes, assignee, and evidence.
    """
    update_data: Dict[str, Any] = {}
    if payload.status is not None:
        update_data["status"] = payload.status
    if payload.match_score is not None:
        update_data["match_score"] = payload.match_score
    if payload.notes is not None:
        update_data["notes"] = payload.notes
    if payload.assigned_to is not None:
        update_data["assigned_to"] = payload.assigned_to
    if payload.evidence_metadata is not None:
        update_data["evidence_metadata"] = payload.evidence_metadata

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update fields provided.")

    try:
        resp = (
            supabase.table("requirements")
            .update(update_data)
            .eq("id", requirement_id)
            .eq("organization_id", organization_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Requirement not found or update unauthorized.")
        
        updated_row = resp.data[0]
        
        # Recalculate tender stats if status changed
        tender_id = updated_row.get("tender_id")
        if tender_id and payload.status is not None:
            all_reqs = (
                supabase.table("requirements")
                .select("id, status")
                .eq("tender_id", tender_id)
                .execute()
            ).data or []
            covered_count = sum(1 for r in all_reqs if r.get("status") == "covered")
            supabase.table("tenders").update({
                "covered_requirements_count": covered_count,
            }).eq("id", tender_id).execute()

        return {
            "status": "success",
            "message": "Requirement updated successfully.",
            "requirement": updated_row,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update requirement {requirement_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")


# ---------------------------------------------------------------------------
# POST /agents/requirements/export
# ---------------------------------------------------------------------------

class ExportMatrixRequest(BaseModel):
    tender_id: str
    organization_id: str
    format: str = "csv"  # csv


@router.post("/export")
async def export_requirements_matrix(
    request: ExportMatrixRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Export the requirement compliance matrix as a downloadable CSV for tender submissions.
    """
    try:
        resolved_tender_id = requirement_agent._resolve_tender_uuid(supabase, request.organization_id, request.tender_id) or request.tender_id
        resp = (
            supabase.table("requirements")
            .select("*")
            .eq("tender_id", resolved_tender_id)
            .eq("organization_id", request.organization_id)
            .order("req_code")
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load requirements: {e}")

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Requirement Code",
        "Category",
        "Title",
        "Description",
        "Mandatory",
        "RFP Page",
        "RFP Section",
        "Coverage Status",
        "Match Score (%)",
        "Assessment / Gap Analysis / Notes",
        "Key Evidence Citations",
    ])

    for r in rows:
        evidence_list = r.get("evidence_metadata") or []
        evidence_str = "; ".join([
            f"[{ev.get('source_type', '').upper()}] {ev.get('source_name', '')}: {ev.get('content_snippet', '')[:100]}"
            for ev in evidence_list
        ]) if isinstance(evidence_list, list) else ""

        writer.writerow([
            r.get("req_code", ""),
            r.get("category", ""),
            r.get("title", ""),
            r.get("description", ""),
            "YES" if r.get("is_mandatory") else "NO",
            r.get("source_page", ""),
            r.get("source_section", ""),
            (r.get("status", "") or "").replace("_", " ").title(),
            f"{r.get('match_score', 0):.1f}%",
            r.get("notes", ""),
            evidence_str,
        ])

    csv_content = output.getvalue()
    filename = f"Requirement_Matrix_{request.tender_id}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
