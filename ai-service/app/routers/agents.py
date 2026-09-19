"""
BidPilot AI — Agents Router (Phase 6)

POST /agents/analyze          → Run RFP Analysis Agent on an uploaded document
GET  /agents/analyze/{tender_id} → Fetch the latest analysis result for a tender
GET  /agents/runs/{tender_id} → List agent run history for a tender
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase
from app.config import get_settings
from app.agents import rfp_analysis_agent

logger = logging.getLogger("bidpilot.agents.router")
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AnalyzeRFPRequest(BaseModel):
    organization_id: str = Field(..., description="UUID of the organization")
    tender_id: Optional[str] = Field(None, description="UUID/code of the tender")
    document_id: Optional[str] = Field(None, description="Optional UUID of specific RFP document. If omitted, resolved automatically from tender or organization.")
    save_requirements: bool = Field(
        True,
        description="If true, persist extracted requirements to the requirements table",
    )


class ExtractedRequirementOut(BaseModel):
    req_code: str
    category: str
    title: str
    description: str
    is_mandatory: bool
    source_page: Optional[int] = None
    source_section: Optional[str] = None


class RFPAnalysisOut(BaseModel):
    title: str
    client_name: str
    submission_deadline: Optional[str] = None
    summary: str
    budget_estimate: Optional[str] = None
    evaluation_criteria: List[str]
    deliverables: List[str]
    technologies: List[str]
    certifications_required: List[str]
    requirements: List[ExtractedRequirementOut]


class AnalyzeRFPResponse(BaseModel):
    run_id: str
    analysis: RFPAnalysisOut
    requirements_saved: int
    latency_ms: int
    message: str


class AgentRunOut(BaseModel):
    id: str
    agent_name: str
    status: str
    latency_ms: int
    requirements_count: Optional[int] = None
    error_message: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# POST /agents/analyze
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=AnalyzeRFPResponse)
async def analyze_rfp(
    request: AnalyzeRFPRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Run the RFP Analysis Agent on an uploaded document.

    Steps:
    1. Fetch document text from Supabase (extracted_text or document_chunks)
    2. Call Gemini Flash with a strict JSON prompt
    3. Validate the structured output with Pydantic
    4. Optionally save requirements to the requirements table
    5. Log an agent_run row
    6. Return the analysis JSON

    Requires: document must have been uploaded and processed (Phase 4/5).
    """
    settings = get_settings()

    if not settings.is_gemini_configured:
        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini API is not configured. "
                "Set GEMINI_API_KEY in the AI service .env file."
            ),
        )

    logger.info(
        f"RFP Analysis requested: doc={request.document_id}, "
        f"tender={request.tender_id}, org={request.organization_id}, "
        f"save_reqs={request.save_requirements}"
    )

    # Validate that save_requirements requires a tender_id
    if request.save_requirements and not request.tender_id:
        raise HTTPException(
            status_code=422,
            detail="tender_id is required when save_requirements=true.",
        )

    try:
        result = rfp_analysis_agent.run_rfp_analysis(
            supabase=supabase,
            organization_id=request.organization_id,
            document_id=request.document_id,
            tender_id=request.tender_id,
            save_requirements=request.save_requirements,
        )
    except ValueError as e:
        # Document not found / no text
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        # Gemini or parse failure
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in RFP analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal agent error: {str(e)}")

    req_count = len(result["analysis"].get("requirements", []))

    return AnalyzeRFPResponse(
        run_id=result["run_id"],
        analysis=RFPAnalysisOut(**result["analysis"]),
        requirements_saved=result["requirements_saved"],
        latency_ms=result["latency_ms"],
        message=(
            f"Analysis complete. "
            f"{req_count} requirements extracted"
            + (
                f", {result['requirements_saved']} saved to database."
                if request.save_requirements
                else "."
            )
        ),
    )


# ---------------------------------------------------------------------------
# GET /agents/analyze/{tender_id}
# ---------------------------------------------------------------------------

@router.get("/analyze/{tender_id}")
async def get_tender_analysis(
    tender_id: str,
    organization_id: str,
    supabase: Client = Depends(get_supabase),
):
    """
    Return the most recent successful RFP analysis for a tender.

    Fetches:
    - The latest completed agent_run with output_payload for the tender
    - All requirements saved for the tender (from the requirements table)
    """
    # Fetch requirements from the requirements table
    try:
        reqs_resp = (
            supabase.table("requirements")
            .select("*")
            .eq("tender_id", tender_id)
            .eq("organization_id", organization_id)
            .order("req_code")
            .execute()
        )
        requirements = reqs_resp.data or []
    except Exception as e:
        logger.warning(f"Could not fetch requirements for tender {tender_id}: {e}")
        requirements = []

    # Fetch latest agent_run for context (title, summary, etc.)
    try:
        run_resp = (
            supabase.table("agent_runs")
            .select("*")
            .eq("tender_id", tender_id)
            .eq("agent_name", "RFPAnalysisAgent")
            .eq("status", "completed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        runs = run_resp.data or []
        latest_run = runs[0] if runs else None
    except Exception as e:
        logger.warning(f"Could not fetch agent_runs for tender {tender_id}: {e}")
        latest_run = None

    return {
        "tender_id": tender_id,
        "organization_id": organization_id,
        "has_analysis": bool(requirements),
        "requirements_count": len(requirements),
        "requirements": requirements,
        "latest_run": latest_run,
    }


# ---------------------------------------------------------------------------
# GET /agents/runs/{tender_id}
# ---------------------------------------------------------------------------

@router.get("/runs/{tender_id}", response_model=List[AgentRunOut])
async def list_agent_runs(
    tender_id: str,
    organization_id: str,
    supabase: Client = Depends(get_supabase),
):
    """List all agent run history for a tender, newest first."""
    try:
        resp = (
            supabase.table("agent_runs")
            .select("id, agent_name, status, latency_ms, output_payload, error_message, created_at")
            .eq("tender_id", tender_id)
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        logger.warning(f"Could not list agent_runs: {e}")
        rows = []

    return [
        AgentRunOut(
            id=r["id"],
            agent_name=r["agent_name"],
            status=r["status"],
            latency_ms=r.get("latency_ms", 0),
            requirements_count=r.get("output_payload", {}).get("requirements_count"),
            error_message=r.get("error_message"),
            created_at=r["created_at"],
        )
        for r in rows
    ]
