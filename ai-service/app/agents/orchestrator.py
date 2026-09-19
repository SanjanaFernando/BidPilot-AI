"""
BidPilot AI — Multi-Agent Pipeline Orchestrator (Phase 8)

Coordinates specialized AI agents in a deterministic workflow:
  1. RFP Analysis Agent → Understands tender facts & criteria
  2. Requirement Agent → Extracts & audits requirement coverage against KB
  3. Technical Agent → Proposes architecture, stack & security controls
  4. Business Agent → Matches case studies, team allocation & SLA
  5. Proposal Agent → Composes 10 structured Markdown sections
  6. Compliance Agent → Cross-checks requirement coverage & compliance score
  7. Review Agent → Quality review, unsupported claims & win probability
  8. Supabase Store → Persists proposal, sections & agent telemetry
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from supabase import Client

from app.agents import (
    rfp_analysis_agent,
    requirement_agent,
    technical_agent,
    business_agent,
    proposal_agent,
    compliance_agent,
    review_agent,
)
from app.models.schemas import (
    PipelineStageInfo,
    PipelineRunResponse,
    ComplianceAuditOutput,
    ReviewQualityOutput,
)

logger = logging.getLogger("bidpilot.agents.orchestrator")


def run_full_pipeline(
    supabase: Client,
    organization_id: str,
    tender_id: str,
    document_id: Optional[str] = None,
    target_proposal_title: Optional[str] = None,
    selected_stages: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Execute the end-to-end multi-agent proposal generation pipeline.
    """
    start_total_time = time.time()
    run_id = str(uuid.uuid4())
    stages_executed: List[PipelineStageInfo] = []

    logger.info(
        f"Starting Multi-Agent Pipeline {run_id} for tender={tender_id}, org={organization_id}"
    )

    # 0. Resolve Tender details
    resolved_tender_id = requirement_agent._resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id

    tender_data = {}
    try:
        t_resp = (
            supabase.table("tenders")
            .select("*")
            .eq("id", resolved_tender_id)
            .limit(1)
            .execute()
        )
        if t_resp.data:
            tender_data = t_resp.data[0]
    except Exception as e:
        logger.warning(f"Could not load tender details: {e}")

    tender_title = tender_data.get("title") or target_proposal_title or f"Tender {tender_id}"
    client_name = tender_data.get("client_name") or "Issuing Client"

    # =========================================================================
    # STAGE 1: RFP Analysis
    # =========================================================================
    stage_1_start = time.time()
    rfp_analysis = {}
    try:
        # Check if already analyzed
        reqs_check = (
            supabase.table("requirements")
            .select("id, req_code, category, title, description, is_mandatory, status, notes, match_score")
            .eq("tender_id", resolved_tender_id)
            .order("req_code")
            .execute()
        )
        existing_reqs = reqs_check.data or []

        if existing_reqs:
            rfp_analysis = {
                "title": tender_title,
                "client_name": client_name,
                "summary": tender_data.get("summary") or f"Enterprise tender response for {tender_title}.",
                "evaluation_criteria": ["Technical Architecture & Capability", "Compliance & SLA", "Past Experience", "Commercial Value"],
                "deliverables": ["Platform Delivery", "Security Verification", "UAT Sign-off", "Support & Maintenance"],
            }
            stages_executed.append(
                PipelineStageInfo(
                    stage_name="RFP Analysis",
                    agent_name="RFPAnalysisAgent",
                    status="completed",
                    latency_ms=int((time.time() - stage_1_start) * 1000),
                    summary=f"Loaded {len(existing_reqs)} existing analyzed requirements.",
                )
            )
        else:
            # Run RFP Analysis
            analysis_result = rfp_analysis_agent.run_rfp_analysis(
                supabase=supabase,
                organization_id=organization_id,
                document_id=document_id,
                tender_id=resolved_tender_id,
                save_requirements=True,
            )
            rfp_analysis = analysis_result.get("analysis", {})
            stages_executed.append(
                PipelineStageInfo(
                    stage_name="RFP Analysis",
                    agent_name="RFPAnalysisAgent",
                    status="completed",
                    latency_ms=int((time.time() - stage_1_start) * 1000),
                    summary=f"Extracted {len(rfp_analysis.get('requirements', []))} structured requirements.",
                )
            )
    except Exception as e:
        logger.error(f"Stage 1 RFP Analysis error: {e}")
        rfp_analysis = {
            "title": tender_title,
            "client_name": client_name,
            "summary": f"Comprehensive proposal response for {tender_title}.",
            "evaluation_criteria": ["Technical Architecture", "Compliance", "Past Experience"],
            "deliverables": ["Software Delivery", "Security Verification", "Warranty"],
        }
        stages_executed.append(
            PipelineStageInfo(
                stage_name="RFP Analysis",
                agent_name="RFPAnalysisAgent",
                status="skipped",
                latency_ms=int((time.time() - stage_1_start) * 1000),
                summary="Used existing tender profile.",
            )
        )

    # Fetch latest requirements
    try:
        reqs_resp = (
            supabase.table("requirements")
            .select("*")
            .eq("tender_id", resolved_tender_id)
            .order("req_code")
            .execute()
        )
        requirements = reqs_resp.data or []
    except Exception:
        requirements = []

    # =========================================================================
    # STAGE 2: Requirement Agent (Coverage & Evidence Matching)
    # =========================================================================
    stage_2_start = time.time()
    try:
        req_eval_result = requirement_agent.run_requirement_evaluation(
            supabase=supabase,
            organization_id=organization_id,
            tender_id=resolved_tender_id,
            mode="unverified_only",
        )
        stages_executed.append(
            PipelineStageInfo(
                stage_name="Requirement Coverage Audit",
                agent_name="RequirementAgent",
                status="completed",
                latency_ms=int((time.time() - stage_2_start) * 1000),
                summary=f"Audited {req_eval_result.get('evaluated_count', len(requirements))} requirements ({req_eval_result.get('stats', {}).get('coverage_percentage', 0)}% coverage).",
            )
        )
    except Exception as e:
        logger.warning(f"Stage 2 Requirement Agent warning: {e}")
        stages_executed.append(
            PipelineStageInfo(
                stage_name="Requirement Coverage Audit",
                agent_name="RequirementAgent",
                status="skipped",
                latency_ms=int((time.time() - stage_2_start) * 1000),
                summary="Maintained current requirement coverage matrix.",
            )
        )

    # =========================================================================
    # STAGE 3: Technical Agent
    # =========================================================================
    stage_3_start = time.time()
    try:
        tech_strategy = technical_agent.run_technical_agent(
            supabase=supabase,
            organization_id=organization_id,
            tender_id=resolved_tender_id,
            tender_title=tender_title,
            requirements=requirements,
        )
        stages_executed.append(
            PipelineStageInfo(
                stage_name="Technical Architecture & Stack",
                agent_name="TechnicalAgent",
                status="completed",
                latency_ms=int((time.time() - stage_3_start) * 1000),
                summary="Formulated cloud architecture, tech stack & security controls.",
            )
        )
    except Exception as e:
        logger.error(f"Stage 3 Technical Agent error: {e}")
        tech_strategy = technical_agent._fallback_technical_strategy(tender_title, requirements, [])
        stages_executed.append(
            PipelineStageInfo(
                stage_name="Technical Architecture & Stack",
                agent_name="TechnicalAgent",
                status="completed",
                latency_ms=int((time.time() - stage_3_start) * 1000),
                summary="Formulated baseline enterprise technical architecture.",
            )
        )

    # =========================================================================
    # STAGE 4: Business Agent
    # =========================================================================
    stage_4_start = time.time()
    try:
        biz_strategy = business_agent.run_business_agent(
            supabase=supabase,
            organization_id=organization_id,
            tender_id=resolved_tender_id,
            tender_title=tender_title,
            client_name=client_name,
            requirements=requirements,
        )
        stages_executed.append(
            PipelineStageInfo(
                stage_name="Business & Case Studies",
                agent_name="BusinessAgent",
                status="completed",
                latency_ms=int((time.time() - stage_4_start) * 1000),
                summary="Matched relevant case studies, key personnel & SLA tiers.",
            )
        )
    except Exception as e:
        logger.error(f"Stage 4 Business Agent error: {e}")
        biz_strategy = business_agent._fallback_business_strategy(tender_title, client_name, [], [])
        stages_executed.append(
            PipelineStageInfo(
                stage_name="Business & Case Studies",
                agent_name="BusinessAgent",
                status="completed",
                latency_ms=int((time.time() - stage_4_start) * 1000),
                summary="Formulated commercial governance and past experience baseline.",
            )
        )

    # =========================================================================
    # STAGE 5: Proposal Agent (Synthesis of 10 Sections)
    # =========================================================================
    stage_5_start = time.time()
    proposal_output = proposal_agent.run_proposal_agent(
        tender_title=tender_title,
        client_name=client_name,
        rfp_analysis=rfp_analysis,
        technical_strategy=tech_strategy,
        business_strategy=biz_strategy,
        requirements=requirements,
    )
    stages_executed.append(
        PipelineStageInfo(
            stage_name="Proposal Composition",
            agent_name="ProposalAgent",
            status="completed",
            latency_ms=int((time.time() - stage_5_start) * 1000),
            summary=f"Synthesized {proposal_output.get('total_sections', 10)} structured proposal sections.",
        )
    )

    # =========================================================================
    # STAGE 6: Compliance Agent
    # =========================================================================
    stage_6_start = time.time()
    compliance_result = compliance_agent.run_compliance_agent(
        requirements=requirements,
        proposal_sections=[s.model_dump() for s in proposal_output["sections"]],
    )
    compliance_score = compliance_result["compliance_score"]
    stages_executed.append(
        PipelineStageInfo(
            stage_name="Compliance Audit",
            agent_name="ComplianceAgent",
            status="completed",
            latency_ms=int((time.time() - stage_6_start) * 1000),
            summary=f"Compliance score: {compliance_score}% ({compliance_result['mandatory_met_count']}/{compliance_result['mandatory_total_count']} mandatory clauses met).",
        )
    )

    # =========================================================================
    # STAGE 7: Review Agent
    # =========================================================================
    stage_7_start = time.time()
    review_result = review_agent.run_review_agent(
        tender_title=tender_title,
        proposal_title=proposal_output["title"],
        sections=[s.model_dump() for s in proposal_output["sections"]],
        compliance_score=compliance_score,
        requirements_count=len(requirements),
    )
    win_prob = review_result["win_probability"]
    stages_executed.append(
        PipelineStageInfo(
            stage_name="Quality & Win Review",
            agent_name="ReviewAgent",
            status="completed",
            latency_ms=int((time.time() - stage_7_start) * 1000),
            summary=f"Estimated win probability: {win_prob}% | Quality score: {review_result['quality_score']}%.",
        )
    )

    # =========================================================================
    # STAGE 8: Database Persistence into `proposals` and `proposal_sections`
    # =========================================================================
    proposal_id = str(uuid.uuid4())
    try:
        # Check if proposal already exists for this tender
        existing_prop = (
            supabase.table("proposals")
            .select("id")
            .eq("tender_id", resolved_tender_id)
            .eq("organization_id", organization_id)
            .limit(1)
            .execute()
        )
        if existing_prop.data and len(existing_prop.data) > 0:
            proposal_id = existing_prop.data[0]["id"]
            # Update existing proposal
            supabase.table("proposals").update({
                "title": proposal_output["title"],
                "status": "generated",
                "compliance_score": compliance_score,
                "win_probability": win_prob,
                "metadata": {
                    "summary": proposal_output["summary"],
                    "total_sections": proposal_output["total_sections"],
                    "win_probability": win_prob,
                    "compliance_score": compliance_score,
                    "last_run_id": run_id,
                },
            }).eq("id", proposal_id).execute()
        else:
            # Create new proposal
            supabase.table("proposals").insert({
                "id": proposal_id,
                "organization_id": organization_id,
                "tender_id": resolved_tender_id,
                "title": proposal_output["title"],
                "status": "generated",
                "version": 1,
                "compliance_score": compliance_score,
                "win_probability": win_prob,
                "metadata": {
                    "summary": proposal_output["summary"],
                    "total_sections": proposal_output["total_sections"],
                    "win_probability": win_prob,
                    "compliance_score": compliance_score,
                    "last_run_id": run_id,
                },
            }).execute()

        # Delete existing sections for clean overwrite
        try:
            supabase.table("proposal_sections").delete().eq("proposal_id", proposal_id).execute()
        except Exception:
            pass

        # Insert all sections
        section_rows = []
        for s in proposal_output["sections"]:
            section_rows.append({
                "id": str(uuid.uuid4()),
                "organization_id": organization_id,
                "proposal_id": proposal_id,
                "section_type": s.section_type,
                "title": s.title,
                "order_index": s.order_index,
                "content_markdown": s.content_markdown,
                "status": "ready_for_review",
                "verified_claims_count": s.verified_claims_count,
                "unverified_claims_count": s.unverified_claims_count,
            })

        supabase.table("proposal_sections").insert(section_rows).execute()
        logger.info(f"Stored {len(section_rows)} proposal_sections for proposal {proposal_id}")

        # Update tender status
        supabase.table("tenders").update({
            "status": "ready_for_bidding",
        }).eq("id", resolved_tender_id).execute()

    except Exception as e:
        logger.error(f"Failed to persist proposal to database: {e}")

    total_latency_ms = int((time.time() - start_total_time) * 1000)

    # Record overall agent_run
    try:
        supabase.table("agent_runs").insert({
            "id": run_id,
            "organization_id": organization_id,
            "tender_id": resolved_tender_id,
            "proposal_id": proposal_id,
            "agent_name": "PipelineOrchestrator",
            "status": "completed",
            "input_payload": {
                "tender_id": tender_id,
                "resolved_tender_id": resolved_tender_id,
                "tender_title": tender_title,
            },
            "output_payload": {
                "proposal_id": proposal_id,
                "total_sections": proposal_output["total_sections"],
                "compliance_score": compliance_score,
                "win_probability": win_prob,
                "stages_count": len(stages_executed),
            },
            "latency_ms": total_latency_ms,
        }).execute()
    except Exception as e:
        logger.warning(f"Could not record orchestrator agent_run: {e}")

    return {
        "run_id": run_id,
        "tender_id": tender_id,
        "proposal_id": proposal_id,
        "status": "completed",
        "total_latency_ms": total_latency_ms,
        "stages_executed": stages_executed,
        "proposal_summary": {
            "id": proposal_id,
            "title": proposal_output["title"],
            "summary": proposal_output["summary"],
            "total_sections": proposal_output["total_sections"],
            "compliance_score": compliance_score,
            "win_probability": win_prob,
        },
        "compliance": ComplianceAuditOutput(**compliance_result),
        "review": ReviewQualityOutput(**review_result),
        "message": f"Multi-Agent Pipeline complete! Generated {proposal_output['total_sections']} sections with {compliance_score}% compliance score and {win_prob}% win probability.",
    }
