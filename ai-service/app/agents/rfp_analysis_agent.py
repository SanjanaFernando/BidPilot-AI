"""
BidPilot AI — RFP Analysis Agent (Phase 6)

Responsibility: Read the full text of an uploaded RFP document and return a
structured JSON object describing the tender.  Uses Google Gemini Flash with
a strict JSON-mode prompt to guarantee parseable output.

Returned schema (RFPAnalysisOutputSchema):
    title, client_name, submission_deadline, summary, budget_estimate,
    evaluation_criteria, deliverables, technologies, certifications_required,
    requirements (list of ExtractedRequirementSchema)
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid
from typing import Optional

import google.generativeai as genai
from supabase import Client

from app.config import get_settings
from app.models.schemas import RFPAnalysisOutputSchema, ExtractedRequirementSchema

logger = logging.getLogger("bidpilot.agents.rfp_analysis")

# ---------------------------------------------------------------------------
# Gemini initialisation guard
# ---------------------------------------------------------------------------
_initialised = False


def _ensure_initialised() -> None:
    global _initialised
    if not _initialised:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set — cannot run RFP Analysis Agent.")
        genai.configure(api_key=settings.gemini_api_key)
        _initialised = True


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an expert bid/RFP analyst. Given the full text of a
Request for Proposal (RFP) document, extract and return ONLY a single valid JSON
object with NO markdown fences, NO explanation, and NO extra keys.

The JSON must exactly match this structure:
{
  "title": "<tender title>",
  "client_name": "<issuing organization>",
  "submission_deadline": "<ISO date string or null>",
  "summary": "<2-3 sentence plain English overview>",
  "budget_estimate": "<string or null>",
  "evaluation_criteria": ["<criterion 1>", "..."],
  "deliverables": ["<deliverable 1>", "..."],
  "technologies": ["<technology 1>", "..."],
  "certifications_required": ["<certification 1>", "..."],
  "requirements": [
    {
      "req_code": "REQ-001",
      "category": "<Functional|Security|Integration|Performance|Compliance|Infrastructure|Deliverables>",
      "title": "<short title ≤ 80 chars>",
      "description": "<full description>",
      "is_mandatory": true,
      "source_page": <integer or null>,
      "source_section": "<section heading or null>"
    }
  ]
}

Rules:
- Extract ALL distinct requirements you can find (aim for 15-60).
- Assign sequential req_codes: REQ-001, REQ-002, …
- is_mandatory is true for MUST/SHALL requirements, false for SHOULD/MAY.
- If a field is unknown, use null.
- Return only the JSON object — nothing else.
"""


def _resolve_document_text(
    supabase: Client,
    organization_id: str,
    tender_id: Optional[str] = None,
    document_id: Optional[str] = None,
) -> tuple[str, Optional[str]]:
    """
    Automatically resolve and return (rfp_text, resolved_document_id).
    Priority:
      1. Specific document_id if provided (extracted_text or chunks)
      2. Document linked to tender_id in knowledge_documents
      3. Most recent RFP document for this organization_id
      4. Sample RFP from disk / workspace fallback
    """
    # 1. If explicit document_id was passed, try fetching it
    if document_id:
        try:
            return _fetch_document_text(supabase, document_id), document_id
        except Exception as e:
            logger.warning(f"Could not fetch explicit doc {document_id}: {e}")

    # 2. Look for documents matching tender_id in metadata
    if tender_id:
        try:
            resp = (
                supabase.table("knowledge_documents")
                .select("id, extracted_text, title, metadata")
                .contains("metadata", {"tender_id": tender_id})
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if resp.data and len(resp.data) > 0:
                doc = resp.data[0]
                doc_id = doc.get("id")
                text = doc.get("extracted_text")
                if text and len(text) > 200:
                    logger.info(f"Auto-resolved doc {doc_id} by metadata.tender_id={tender_id}")
                    return text, doc_id
                if doc_id:
                    return _fetch_document_text(supabase, doc_id), doc_id
        except Exception as e:
            logger.warning(f"Could not auto-lookup document by metadata.tender_id {tender_id}: {e}")

    # 3. Look for the most recent document for this organization
    try:
        resp = (
            supabase.table("knowledge_documents")
            .select("id, extracted_text, title")
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data and len(resp.data) > 0:
            doc = resp.data[0]
            doc_id = doc.get("id")
            text = doc.get("extracted_text")
            if text and len(text) > 200:
                logger.info(f"Auto-resolved latest org doc {doc_id}")
                return text, doc_id
            if doc_id:
                return _fetch_document_text(supabase, doc_id), doc_id
    except Exception as e:
        logger.warning(f"Could not auto-lookup latest org document: {e}")

    # 4. Fallback to sample RFP PDF in workspace if available
    from pathlib import Path
    possible_paths = [
        Path(__file__).resolve().parent.parent.parent.parent / "sample-rfp" / "Hospital_Information_Management_System_RFP.pdf",
        Path("c:/Top Projects/BidPilot/sample-rfp/Hospital_Information_Management_System_RFP.pdf"),
    ]
    for sample_pdf in possible_paths:
        if sample_pdf.exists():
            try:
                import pdfplumber
                with pdfplumber.open(sample_pdf) as pdf:
                    pages_text = [page.extract_text() or "" for page in pdf.pages]
                    full_text = "\n\n".join(pages_text)
                    if len(full_text) > 200:
                        logger.info(f"Loaded {len(full_text)} chars from sample RFP file {sample_pdf.name}")
                        return full_text, None
            except Exception as e:
                logger.warning(f"Failed extracting sample PDF text: {e}")

    raise ValueError(
        "No RFP document found in database or storage for this tender. "
        "Please upload an RFP document for this tender first."
    )


def _fetch_document_text(supabase: Client, document_id: str) -> str:
    """
    Return the full extracted text for a document.
    Priority:
      1. knowledge_documents.extracted_text  (set during PDF upload)
      2. Concatenate document_chunks ordered by chunk_index  (fallback)
    """
    # Try extracted_text first
    try:
        resp = (
            supabase.table("knowledge_documents")
            .select("extracted_text, title")
            .eq("id", document_id)
            .single()
            .execute()
        )
        text = (resp.data or {}).get("extracted_text", "")
        if text and len(text) > 200:
            logger.info(
                f"Using extracted_text for doc {document_id} ({len(text)} chars)"
            )
            return text
    except Exception as e:
        logger.warning(f"Could not fetch extracted_text: {e}")

    # Fallback — stitch chunks
    try:
        resp = (
            supabase.table("document_chunks")
            .select("content, chunk_index")
            .eq("document_id", document_id)
            .order("chunk_index")
            .execute()
        )
        chunks = resp.data or []
        if chunks:
            text = "\n\n".join(c["content"] for c in chunks)
            logger.info(
                f"Using {len(chunks)} chunks for doc {document_id} ({len(text)} chars)"
            )
            return text
    except Exception as e:
        logger.warning(f"Could not fetch document chunks: {e}")

    raise ValueError(f"No text found for document_id={document_id}. "
                     "Ensure the document has been uploaded and processed.")


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------

_MAX_TEXT_CHARS = 60_000  # ~15 000 tokens — safe for flash


def _call_gemini(rfp_text: str) -> RFPAnalysisOutputSchema:
    """
    Send the RFP text to Gemini Flash and parse the structured JSON response.
    Retries across supported models if one is not found or fails.
    """
    _ensure_initialised()
    settings = get_settings()
    
    candidate_models = [
        settings.gemini_generate_model,
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
    ]
    # Remove duplicates while preserving order
    models_to_try = list(dict.fromkeys(candidate_models))

    truncated = rfp_text[:_MAX_TEXT_CHARS]
    if len(rfp_text) > _MAX_TEXT_CHARS:
        logger.warning(
            f"RFP text truncated from {len(rfp_text)} to {_MAX_TEXT_CHARS} chars for LLM."
        )

    user_message = (
        "Below is the full text of the RFP document. "
        "Return ONLY the JSON object as specified.\n\n"
        f"--- RFP TEXT START ---\n{truncated}\n--- RFP TEXT END ---"
    )

    last_error: Optional[Exception] = None

    for model_name in models_to_try:
        try:
            logger.info(f"Attempting RFP analysis with Gemini model: {model_name}…")
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=_SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=8192,
                ),
            )

            for attempt in range(2):
                try:
                    t0 = time.time()
                    response = model.generate_content(user_message)
                    latency = round((time.time() - t0) * 1000)
                    logger.info(f"Gemini ({model_name}) responded in {latency} ms")

                    raw = response.text.strip()

                    # Strip accidental markdown fences
                    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
                    raw = re.sub(r"\s*```$", "", raw, flags=re.IGNORECASE)
                    raw = raw.strip()

                    parsed = json.loads(raw)
                    analysis = RFPAnalysisOutputSchema(**parsed)
                    logger.info(
                        f"RFP analysis parsed successfully with {model_name}: {len(analysis.requirements)} requirements extracted."
                    )
                    return analysis

                except (json.JSONDecodeError, Exception) as exc:
                    logger.warning(f"Parse attempt {attempt + 1} with {model_name} failed: {exc}")
                    last_error = exc
                    if attempt == 0:
                        time.sleep(1)

        except Exception as model_err:
            logger.warning(f"Model {model_name} failed: {model_err}")
            last_error = model_err
            continue

    raise RuntimeError(
        f"RFP Analysis Agent failed across candidate models {models_to_try}: {last_error}"
    )


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def _is_valid_uuid(val: Optional[str]) -> bool:
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
    title: Optional[str] = None,
    client_name: Optional[str] = None,
) -> Optional[str]:
    """
    Ensure we have a valid UUID for foreign-key references to tenders.id.
    If tender_id is a reference code like 'TND-1338' or 'TND-001', look it up or create a row.
    """
    if not tender_id:
        return None

    if _is_valid_uuid(tender_id):
        return tender_id

    try:
        # Check if tender already exists with this reference code
        resp = (
            supabase.table("tenders")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("reference_code", tender_id)
            .limit(1)
            .execute()
        )
        if resp.data and len(resp.data) > 0:
            return resp.data[0]["id"]

        # Insert new tender record if not present
        new_uuid = str(uuid.uuid4())
        insert_resp = (
            supabase.table("tenders")
            .insert(
                {
                    "id": new_uuid,
                    "organization_id": organization_id,
                    "reference_code": tender_id,
                    "title": title or f"Tender {tender_id}",
                    "client_name": client_name or "Client",
                    "status": "analyzing",
                }
            )
            .execute()
        )
        if insert_resp.data and len(insert_resp.data) > 0:
            return insert_resp.data[0]["id"]
        return new_uuid
    except Exception as e:
        logger.warning(f"Could not resolve/create tender UUID for reference code {tender_id}: {e}")
        return None


def _save_requirements(
    supabase: Client,
    tender_uuid: Optional[str],
    organization_id: str,
    requirements: list[ExtractedRequirementSchema],
) -> int:
    """
    Upsert requirements into the requirements table.
    Uses (tender_id, req_code) unique constraint for idempotent re-runs.
    Returns count of upserted rows.
    """
    if not requirements or not tender_uuid or not _is_valid_uuid(tender_uuid):
        return 0

    rows = [
        {
            "id": str(uuid.uuid4()),
            "organization_id": organization_id,
            "tender_id": tender_uuid,
            "req_code": req.req_code,
            "category": req.category,
            "title": req.title,
            "description": req.description,
            "is_mandatory": req.is_mandatory,
            "source_page": req.source_page,
            "source_section": req.source_section,
            "status": "unverified",
            "match_score": 0.0,
        }
        for req in requirements
    ]

    try:
        # Batch upsert (on conflict update description/status)
        batch_size = 50
        saved = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            supabase.table("requirements").upsert(
                batch,
                on_conflict="tender_id,req_code",
                ignore_duplicates=False,
            ).execute()
            saved += len(batch)

        logger.info(f"Upserted {saved} requirements for tender {tender_uuid}")
        return saved
    except Exception as e:
        logger.warning(f"Could not persist requirements to database: {e}")
        return 0


def _update_tender_req_counts(
    supabase: Client,
    tender_uuid: Optional[str],
    total: int,
) -> None:
    """Update the cached total_requirements_count on the tenders row."""
    if not tender_uuid or not _is_valid_uuid(tender_uuid):
        return
    try:
        supabase.table("tenders").update(
            {
                "total_requirements_count": total,
                "status": "analyzing",
            }
        ).eq("id", tender_uuid).execute()
    except Exception as e:
        logger.warning(f"Could not update tender req counts: {e}")


def _log_agent_run(
    supabase: Client,
    organization_id: str,
    tender_uuid: Optional[str],
    status: str,
    input_payload: dict,
    output_payload: dict,
    latency_ms: int,
    error_message: Optional[str] = None,
) -> str:
    """Insert a row into agent_runs and return the run id."""
    run_id = str(uuid.uuid4())
    try:
        data = {
            "id": run_id,
            "organization_id": organization_id,
            "agent_name": "RFPAnalysisAgent",
            "status": status,
            "input_payload": input_payload,
            "output_payload": output_payload,
            "latency_ms": latency_ms,
            "error_message": error_message,
            "completed_at": "now()",
        }
        if tender_uuid and _is_valid_uuid(tender_uuid):
            data["tender_id"] = tender_uuid

        supabase.table("agent_runs").insert(data).execute()
    except Exception as e:
        logger.warning(f"Could not log agent_run: {e}")
    return run_id


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_rfp_analysis(
    supabase: Client,
    organization_id: str,
    document_id: Optional[str] = None,
    tender_id: Optional[str] = None,
    save_requirements: bool = True,
) -> dict:
    """
    Full Phase-6 pipeline:
      1. Automatically resolve & fetch RFP text from Supabase or tender
      2. Call Gemini Flash → structured JSON
      3. Optionally save requirements to the requirements table
      4. Log agent_run
      5. Return result dict

    Returns:
        {
            "run_id": str,
            "analysis": RFPAnalysisOutputSchema (as dict),
            "requirements_saved": int,
            "latency_ms": int,
        }
    """
    t0 = time.time()
    input_payload = {
        "document_id": document_id,
        "organization_id": organization_id,
        "tender_id": tender_id,
        "save_requirements": save_requirements,
    }

    try:
        # ── 1. Fetch / Resolve document text automatically ──────────────────
        logger.info(f"RFP Analysis Agent — resolving document (doc={document_id}, tender={tender_id})")
        rfp_text, resolved_doc_id = _resolve_document_text(
            supabase=supabase,
            organization_id=organization_id,
            tender_id=tender_id,
            document_id=document_id,
        )

        # ── 2. LLM call ────────────────────────────────────────────────────
        analysis = _call_gemini(rfp_text)
        latency_ms = round((time.time() - t0) * 1000)

        # ── 3. Resolve Tender UUID & Persist requirements ──────────────────
        tender_uuid = _resolve_tender_uuid(
            supabase=supabase,
            organization_id=organization_id,
            tender_id=tender_id,
            title=analysis.title,
            client_name=analysis.client_name,
        )

        requirements_saved = 0
        if save_requirements and tender_uuid:
            requirements_saved = _save_requirements(
                supabase=supabase,
                tender_uuid=tender_uuid,
                organization_id=organization_id,
                requirements=analysis.requirements,
            )
            _update_tender_req_counts(supabase, tender_uuid, len(analysis.requirements))

        # ── 4. Log agent run ───────────────────────────────────────────────
        analysis_dict = analysis.model_dump()
        run_id = _log_agent_run(
            supabase=supabase,
            organization_id=organization_id,
            tender_uuid=tender_uuid,
            status="completed",
            input_payload=input_payload,
            output_payload=analysis_dict,
            latency_ms=latency_ms,
        )

        return {
            "run_id": run_id,
            "analysis": analysis_dict,
            "requirements_saved": requirements_saved,
            "latency_ms": latency_ms,
        }

    except Exception as e:
        logger.error(f"RFP Analysis Agent failed: {e}")
        # Log failed run if possible
        _log_agent_run(
            supabase=supabase,
            organization_id=organization_id,
            tender_uuid=_resolve_tender_uuid(supabase, organization_id, tender_id),
            status="failed",
            input_payload=input_payload,
            output_payload={},
            latency_ms=latency_ms,
            error_message=error_str,
        )
        raise
