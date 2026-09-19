"""
BidPilot AI — Requirement Agent (Phase 7)

Responsibility: Convert each extracted requirement into a traceable object,
evaluate it against company knowledge (projects, employees, technologies, certifications),
determine coverage status ('covered', 'partially_covered', 'missing', 'evidence_required'),
assign match scores (0-100%), extract evidence citations, and update the requirements matrix.
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from supabase import Client

from app.config import get_settings
from app.models.schemas import (
    EvidenceItemSchema,
    RequirementEvaluationSchema,
)
from app.services.embedding_service import get_embedding
from app.services.vector_service import (
    knowledge_similarity_search,
    similarity_search,
)

logger = logging.getLogger("bidpilot.agents.requirement_agent")

# ---------------------------------------------------------------------------
# Gemini initialisation guard
# ---------------------------------------------------------------------------
_initialised = False


def _ensure_initialised() -> None:
    global _initialised
    if not _initialised:
        settings = get_settings()
        if not settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY is not set — Requirement Agent will use fallback evaluator.")
            return
        genai.configure(api_key=settings.gemini_api_key)
        _initialised = True


# ---------------------------------------------------------------------------
# Requirement Evaluation Prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an expert Bid Compliance & Proposal Evaluation Agent.
Your task is to rigorously evaluate an RFP requirement against company knowledge evidence snippets.

You must categorize the company's coverage of this requirement into EXACTLY ONE of these 4 statuses:
1. "covered" — The company has clear, verified past experience, certified personnel, technologies, or case studies directly fulfilling this requirement. (Match score 75-100%)
2. "partially_covered" — The company has related experience or partial capabilities, but lacks some specific modules, scale, or domain nuances. (Match score 40-74%)
3. "missing" — No evidence exists in company knowledge or the company fundamentally lacks this capability. (Match score 0-25%)
4. "evidence_required" — The company likely has this capability or standard practice, but explicit documentation, compliance certificates, or client sign-offs are needed before submitting the bid. (Match score 26-60%)

Return ONLY a single valid JSON object with NO markdown fences, NO explanation, and NO extra keys.

JSON structure:
{
  "req_code": "<e.g. REQ-001>",
  "status": "<covered|partially_covered|missing|evidence_required>",
  "match_score": <float between 0.0 and 100.0>,
  "assessment_rationale": "<2-3 clear sentences explaining how the company fulfills or fails this requirement>",
  "gap_analysis": "<1-2 sentences on what is missing or needed, or null if fully covered>",
  "recommended_action": "<Specific bid strategy, e.g. 'Highlight Project LankaHealth case study in Section 4' or 'Request ISO 27001 certificate copy from compliance team'>",
  "evidence": [
    {
      "source_type": "<project|employee|technology|certification|document>",
      "source_name": "<name of the asset>",
      "source_id": "<id or null>",
      "content_snippet": "<short exact excerpt demonstrating proof>",
      "similarity_score": <float 0.0 to 1.0>,
      "source_page": null,
      "source_section": null
    }
  ]
}

Rules:
- Be realistic and truthful. Do not invent capabilities not found in the provided evidence.
- If evidence is weak or empty, classify as "missing" or "evidence_required".
- Match score must align logically with the status.
"""


# ---------------------------------------------------------------------------
# Helper: Fetch direct company knowledge if vector search yields sparse results
# ---------------------------------------------------------------------------

def _fetch_direct_kb_fallback(supabase: Client, organization_id: str) -> List[Dict[str, Any]]:
    """
    Fetch structured records from projects, certifications, employees, technologies
    as fallback context if knowledge_chunks table is empty.
    """
    evidence_items = []
    try:
        # Projects
        projs = (
            supabase.table("projects")
            .select("id, name, client, industry, description, technologies, challenges, solution, outcomes")
            .eq("organization_id", organization_id)
            .limit(10)
            .execute()
        )
        for p in projs.data or []:
            text = f"Project: {p.get('name')} (Client: {p.get('client')}, Industry: {p.get('industry')}). {p.get('description', '')}. Solution: {p.get('solution', '')}. Outcomes: {p.get('outcomes', '')}. Tech: {', '.join(p.get('technologies', []))}"
            evidence_items.append({
                "source_type": "project",
                "source_name": p.get("name", "Project"),
                "source_id": str(p.get("id")),
                "content": text,
                "similarity": 0.65,
            })
    except Exception as e:
        logger.warning(f"Could not fetch fallback projects: {e}")

    try:
        # Certifications
        certs = (
            supabase.table("certifications")
            .select("id, name, issuer, holder_type, issue_date, expiry_date")
            .eq("organization_id", organization_id)
            .limit(10)
            .execute()
        )
        for c in certs.data or []:
            text = f"Certification: {c.get('name')} issued by {c.get('issuer')} ({c.get('holder_type')}). Valid until {c.get('expiry_date', 'N/A')}."
            evidence_items.append({
                "source_type": "certification",
                "source_name": c.get("name", "Certification"),
                "source_id": str(c.get("id")),
                "content": text,
                "similarity": 0.70,
            })
    except Exception as e:
        logger.warning(f"Could not fetch fallback certifications: {e}")

    try:
        # Technologies
        techs = (
            supabase.table("technologies")
            .select("id, name, category, experience_level, description")
            .eq("organization_id", organization_id)
            .limit(15)
            .execute()
        )
        for t in techs.data or []:
            text = f"Technology: {t.get('name')} (Category: {t.get('category')}, Level: {t.get('experience_level')}). {t.get('description', '')}"
            evidence_items.append({
                "source_type": "technology",
                "source_name": t.get("name", "Technology"),
                "source_id": str(t.get("id")),
                "content": text,
                "similarity": 0.60,
            })
    except Exception as e:
        logger.warning(f"Could not fetch fallback technologies: {e}")

    return evidence_items


# ---------------------------------------------------------------------------
# Deterministic Fallback Evaluator
# ---------------------------------------------------------------------------

def _evaluate_requirement_deterministic(
    req: Dict[str, Any],
    evidence_chunks: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Deterministic rule-based evaluation when Gemini is not available or errors out.
    Uses semantic similarity scores and keyword overlap.
    """
    req_code = req.get("req_code", "REQ")
    title = req.get("title", "")
    desc = req.get("description", "")
    category = req.get("category", "")
    is_mandatory = req.get("is_mandatory", True)

    top_sim = max([c.get("similarity", 0.0) for c in evidence_chunks], default=0.0)
    
    # Filter high-relevance evidence
    relevant_evidence = [c for c in evidence_chunks if c.get("similarity", 0.0) >= 0.40][:3]

    if top_sim >= 0.70 or (relevant_evidence and len(relevant_evidence) >= 2 and top_sim >= 0.60):
        status = "covered"
        match_score = round(min(98.0, top_sim * 100), 1)
        rationale = f"Company possesses demonstrated capabilities and matching track record in {category} aligned with '{title}'."
        gap = None
        action = f"Cite top matching company project / asset ({relevant_evidence[0].get('source_name', 'KB')}) in proposal response."
    elif top_sim >= 0.48:
        status = "partially_covered"
        match_score = round(top_sim * 100, 1)
        rationale = f"Related experience found for '{title}', but further technical customization and specific case studies should be detailed."
        gap = "Specific integration workflows or certifications should be validated."
        action = "Include reference architecture with existing capability adaptations."
    elif top_sim >= 0.35:
        status = "evidence_required"
        match_score = round(top_sim * 100, 1)
        rationale = f"General domain capability exists, but explicit documentary proof or certification is required for '{title}'."
        gap = "Missing direct project reference or compliance certificate."
        action = "Request signed client testimonial or supplementary credential."
    else:
        status = "missing" if is_mandatory else "evidence_required"
        match_score = round(max(5.0, top_sim * 100), 1)
        rationale = f"No direct company track record or asset found matching requirement '{title}'."
        gap = f"Identified gap in {category} capability."
        action = "Consider partnering or proposing an alternative proven technology stack."

    formatted_evidence = []
    for c in relevant_evidence:
        formatted_evidence.append({
            "source_type": c.get("source_type", "document"),
            "source_name": c.get("source_name", "Evidence Asset"),
            "source_id": str(c.get("source_id") or c.get("id") or ""),
            "content_snippet": (c.get("content") or "")[:280],
            "similarity_score": round(float(c.get("similarity", 0.0)), 3),
            "source_page": c.get("page_number"),
            "source_section": c.get("section") or c.get("section_heading"),
        })

    return {
        "req_code": req_code,
        "status": status,
        "match_score": match_score,
        "assessment_rationale": rationale,
        "gap_analysis": gap,
        "recommended_action": action,
        "evidence": formatted_evidence,
    }


# ---------------------------------------------------------------------------
# Single Requirement Evaluator (Gemini + RAG)
# ---------------------------------------------------------------------------

def evaluate_single_requirement_core(
    supabase: Client,
    organization_id: str,
    req: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Evaluates one requirement by:
    1. Embedding requirement text
    2. Querying knowledge_chunks and document_chunks via RAG
    3. Running Gemini prompt to analyze coverage & extract structured evidence
    4. Falling back to deterministic rules if Gemini is unavailable
    """
    req_code = req.get("req_code", "REQ")
    title = req.get("title", "")
    description = req.get("description", "")
    category = req.get("category", "")
    is_mandatory = req.get("is_mandatory", True)
    source_page = req.get("source_page")
    source_section = req.get("source_section")

    query_text = f"{title}. {description}. Category: {category}"

    # 1. Embed query
    try:
        embedding = get_embedding(query_text, task_type="RETRIEVAL_QUERY")
    except Exception as e:
        logger.warning(f"Could not embed requirement query '{req_code}': {e}")
        embedding = None

    evidence_chunks: List[Dict[str, Any]] = []

    # 2. Vector search in KB
    if embedding:
        try:
            kb_results = knowledge_similarity_search(
                supabase=supabase,
                query_embedding=embedding,
                organization_id=organization_id,
                top_k=5,
                similarity_threshold=0.25,
            )
            evidence_chunks.extend(kb_results)
        except Exception as e:
            logger.warning(f"KB similarity search error: {e}")

    # Fallback to direct DB records if KB chunks are empty
    if not evidence_chunks:
        direct_kb = _fetch_direct_kb_fallback(supabase, organization_id)
        evidence_chunks.extend(direct_kb)

    # 3. Gemini Evaluation
    settings = get_settings()
    if settings.is_gemini_configured:
        _ensure_initialised()
        try:
            evidence_str = "\n\n".join([
                f"[{c.get('source_type', 'asset').upper()} - {c.get('source_name', 'Asset')} | Sim: {round(float(c.get('similarity', 0.0)), 2)}]\n{c.get('content', '')[:400]}"
                for c in evidence_chunks[:6]
            ]) or "No relevant evidence snippets found in knowledge base."

            user_prompt = f"""EVALUATE THIS REQUIREMENT:
ID: {req_code}
Category: {category}
Title: {title}
Description: {description}
Mandatory: {is_mandatory}
Source RFP: Page {source_page or 'N/A'}, Section {source_section or 'N/A'}

COMPANY KNOWLEDGE EVIDENCE SNIPPETS:
{evidence_str}

Evaluate if our company meets this requirement based STRICTLY on the evidence provided above. Return ONLY the requested JSON.
"""

            model = genai.GenerativeModel(
                model_name=settings.gemini_generate_model,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
                system_instruction=_SYSTEM_PROMPT,
            )

            response = model.generate_content(user_prompt)
            raw_text = response.text.strip()
            
            # Clean possible markdown wrapping
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                raw_text = re.sub(r"\s*```$", "", raw_text)

            parsed = json.loads(raw_text)
            
            # Ensure req_code matches
            parsed["req_code"] = req_code
            
            # Format evidence list
            if "evidence" not in parsed or not isinstance(parsed["evidence"], list):
                parsed["evidence"] = []
                
            return parsed

        except Exception as e:
            logger.warning(f"Gemini evaluation failed for {req_code}: {e} — using deterministic fallback")

    # 4. Fallback evaluation
    return _evaluate_requirement_deterministic(req, evidence_chunks)


def _is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _resolve_tender_uuid(
    supabase: Client,
    organization_id: str,
    tender_id: Optional[str],
) -> Optional[str]:
    """
    Ensure we have a valid UUID for foreign-key references to tenders.id.
    If tender_id is a reference code like 'TND-1338' or 'TND-001', look it up in DB.
    """
    if not tender_id:
        return None

    if _is_valid_uuid(tender_id):
        return str(tender_id)

    try:
        resp = (
            supabase.table("tenders")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("reference_code", tender_id)
            .limit(1)
            .execute()
        )
        if resp.data and len(resp.data) > 0:
            return str(resp.data[0]["id"])
    except Exception as e:
        logger.warning(f"Could not resolve tender UUID for reference code {tender_id}: {e}")

    return None


# ---------------------------------------------------------------------------
# Main Orchestration: Batch & Single Evaluation
# ---------------------------------------------------------------------------

def run_requirement_evaluation(
    supabase: Client,
    organization_id: str,
    tender_id: str,
    requirement_ids: Optional[List[str]] = None,
    mode: str = "all",  # "all" | "unverified_only" | "force_recheck"
) -> Dict[str, Any]:
    """
    Run the Requirement Agent across tender requirements:
    1. Resolve tender UUID (handles reference codes like TND-1338)
    2. Fetch requirements for tender
    3. Filter based on requirement_ids or mode
    4. Evaluate each requirement against company knowledge RAG
    5. Update requirements in database (status, match_score, notes, evidence_metadata)
    6. Update tender coverage counts
    7. Log agent_run
    """
    start_time = time.time()
    run_id = str(uuid.uuid4())

    logger.info(
        f"Starting Requirement Agent run {run_id}: org={organization_id}, tender={tender_id}, mode={mode}"
    )

    resolved_tender_id = _resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id

    if not _is_valid_uuid(resolved_tender_id):
        logger.warning(f"Tender {tender_id} could not be resolved to a valid UUID.")
        return {
            "run_id": run_id,
            "tender_id": tender_id,
            "evaluated_count": 0,
            "evaluations": [],
            "stats": {
                "covered": 0,
                "partially_covered": 0,
                "missing": 0,
                "evidence_required": 0,
                "unverified": 0,
                "total": 0,
                "coverage_percentage": 0.0,
            },
            "latency_ms": 0,
            "message": f"Tender {tender_id} not found in database. Please run RFP Analysis first.",
        }

    # 1. Fetch requirements
    query = (
        supabase.table("requirements")
        .select("*")
        .eq("tender_id", resolved_tender_id)
        .eq("organization_id", organization_id)
    )

    if requirement_ids and len(requirement_ids) > 0:
        query = query.in_("id", requirement_ids)
    elif mode == "unverified_only":
        query = query.eq("status", "unverified")

    resp = query.order("req_code").execute()
    requirements = resp.data or []

    if not requirements:
        logger.info(f"No requirements to evaluate for tender {tender_id}")
        return {
            "run_id": run_id,
            "tender_id": tender_id,
            "evaluated_count": 0,
            "evaluations": [],
            "stats": {
                "covered": 0,
                "partially_covered": 0,
                "missing": 0,
                "evidence_required": 0,
                "unverified": 0,
                "total": 0,
                "coverage_percentage": 0.0,
            },
            "latency_ms": 0,
            "message": "No matching requirements found to evaluate.",
        }

    evaluations: List[Dict[str, Any]] = []

    # 2. Evaluate each requirement
    for req in requirements:
        try:
            ev = evaluate_single_requirement_core(supabase, organization_id, req)
            evaluations.append({
                "id": req["id"],
                "req_code": req.get("req_code"),
                "evaluation": ev,
            })

            # 3. Update requirement row in database
            update_payload = {
                "status": ev.get("status", "unverified"),
                "match_score": float(ev.get("match_score", 0.0)),
                "notes": ev.get("assessment_rationale", "") + (
                    f" | Gap: {ev.get('gap_analysis')}" if ev.get("gap_analysis") else ""
                ),
                "evidence_metadata": ev.get("evidence", []),
            }

            supabase.table("requirements").update(update_payload).eq("id", req["id"]).execute()

        except Exception as e:
            logger.error(f"Error evaluating requirement {req.get('req_code', req['id'])}: {e}")

    # 4. Recalculate tender overall coverage stats
    try:
        all_reqs_resp = (
            supabase.table("requirements")
            .select("id, status, is_mandatory, match_score")
            .eq("tender_id", resolved_tender_id)
            .eq("organization_id", organization_id)
            .execute()
        )
        all_reqs = all_reqs_resp.data or []
        total_count = len(all_reqs)
        covered_count = sum(1 for r in all_reqs if r.get("status") == "covered")
        partial_count = sum(1 for r in all_reqs if r.get("status") == "partially_covered")
        missing_count = sum(1 for r in all_reqs if r.get("status") == "missing")
        evidence_needed_count = sum(1 for r in all_reqs if r.get("status") == "evidence_required")
        unverified_count = sum(1 for r in all_reqs if r.get("status") == "unverified")

        coverage_pct = round((covered_count / total_count * 100), 1) if total_count > 0 else 0.0

        # Update tender table
        supabase.table("tenders").update({
            "total_requirements_count": total_count,
            "covered_requirements_count": covered_count,
        }).eq("id", resolved_tender_id).execute()

    except Exception as e:
        logger.warning(f"Could not recalculate tender counts: {e}")
        total_count = len(requirements)
        covered_count = sum(1 for e in evaluations if e["evaluation"].get("status") == "covered")
        partial_count = sum(1 for e in evaluations if e["evaluation"].get("status") == "partially_covered")
        missing_count = sum(1 for e in evaluations if e["evaluation"].get("status") == "missing")
        evidence_needed_count = sum(1 for e in evaluations if e["evaluation"].get("status") == "evidence_required")
        unverified_count = 0
        coverage_pct = round((covered_count / total_count * 100), 1) if total_count > 0 else 0.0

    latency_ms = int((time.time() - start_time) * 1000)

    # 5. Record agent_run
    try:
        supabase.table("agent_runs").insert({
            "id": run_id,
            "organization_id": organization_id,
            "tender_id": resolved_tender_id,
            "agent_name": "RequirementAgent",
            "status": "completed",
            "input_payload": {
                "tender_id": tender_id,
                "resolved_tender_id": resolved_tender_id,
                "mode": mode,
                "requirement_ids_count": len(requirement_ids) if requirement_ids else None,
            },
            "output_payload": {
                "evaluated_count": len(evaluations),
                "covered_count": covered_count,
                "partial_count": partial_count,
                "missing_count": missing_count,
                "evidence_needed_count": evidence_needed_count,
                "coverage_percentage": coverage_pct,
            },
            "latency_ms": latency_ms,
        }).execute()
    except Exception as e:
        logger.warning(f"Could not record agent_run: {e}")

    logger.info(
        f"Requirement Agent finished in {latency_ms}ms: {len(evaluations)} evaluated, {covered_count} covered ({coverage_pct}%)"
    )

    return {
        "run_id": run_id,
        "tender_id": tender_id,
        "evaluated_count": len(evaluations),
        "evaluations": [e["evaluation"] for e in evaluations],
        "stats": {
            "covered": covered_count,
            "partially_covered": partial_count,
            "missing": missing_count,
            "evidence_required": evidence_needed_count,
            "unverified": unverified_count,
            "total": total_count,
            "coverage_percentage": coverage_pct,
        },
        "latency_ms": latency_ms,
        "message": f"Evaluated {len(evaluations)} requirements. Coverage is {coverage_pct}%.",
    }


def evaluate_single_requirement_by_id(
    supabase: Client,
    organization_id: str,
    tender_id: str,
    requirement_id: str,
) -> Dict[str, Any]:
    """
    Evaluate a single requirement by ID on-demand and update the database record.
    """
    start_time = time.time()
    
    # Fetch requirement
    if _is_valid_uuid(requirement_id):
        resp = (
            supabase.table("requirements")
            .select("*")
            .eq("id", requirement_id)
            .eq("organization_id", organization_id)
            .limit(1)
            .execute()
        )
    else:
        resolved_tender_id = _resolve_tender_uuid(supabase, organization_id, tender_id) or tender_id
        resp = (
            supabase.table("requirements")
            .select("*")
            .eq("req_code", requirement_id)
            .eq("tender_id", resolved_tender_id)
            .eq("organization_id", organization_id)
            .limit(1)
            .execute()
        )
    
    if not resp.data:
        raise ValueError(f"Requirement with ID {requirement_id} not found.")

    req = resp.data[0]
    evaluation = evaluate_single_requirement_core(supabase, organization_id, req)

    # Update database
    update_payload = {
        "status": evaluation.get("status", "unverified"),
        "match_score": float(evaluation.get("match_score", 0.0)),
        "notes": evaluation.get("assessment_rationale", "") + (
            f" | Gap: {evaluation.get('gap_analysis')}" if evaluation.get("gap_analysis") else ""
        ),
        "evidence_metadata": evaluation.get("evidence", []),
    }
    supabase.table("requirements").update(update_payload).eq("id", requirement_id).execute()

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "requirement_id": requirement_id,
        "tender_id": tender_id,
        "evaluation": evaluation,
        "latency_ms": latency_ms,
    }
