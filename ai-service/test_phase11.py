"""
BidPilot AI — Phase 11 Proposal Editor & Dual Document Export Verification Test
"""

import sys
import io
from app.agents.proposal_agent import _build_default_sections, regenerate_proposal_section
from app.services.docx_exporter import build_proposal_docx
from app.services.pdf_exporter import build_proposal_pdf

def test_phase11():
    print("=================================================================")
    print("  BidPilot AI — Phase 11 Proposal Editor & Export Verification   ")
    print("=================================================================\n")

    tender_title = "Smart Healthcare Information System (HIS)"
    client_name = "Ministry of Health & Digital Services"
    tender_ref = "TND-LK-2026-0042"

    rfp_analysis = {
        "summary": "Turnkey enterprise HIS with HL7/FHIR integration and ISO 27001 data residency.",
        "deliverables": ["Core Clinical Portal", "FHIR Data Hub", "Audit & RBAC Module", "Pen-testing & Sign-off"],
        "evaluation_criteria": ["Technical Architecture", "Security & ISO 27001", "Past Experience", "Commercial SLA"],
    }
    tech_strategy = {
        "architecture_overview": "Cloud-native microservices with Next.js frontend, FastAPI backend, and PostgreSQL vector storage.",
        "recommended_tech_stack": [
            {"name": "Next.js", "role": "Frontend", "rationale": "Server-side rendering and responsive UX"},
            {"name": "FastAPI", "role": "Backend", "rationale": "High-throughput asynchronous APIs"},
            {"name": "PostgreSQL", "role": "Database", "rationale": "ACID compliance & pgvector search"},
        ],
        "infrastructure_design": "Containerized Kubernetes cluster with auto-scaling and multi-region replication.",
        "security_controls": ["TLS 1.3 in transit", "AES-256 at rest", "ISO 27001 audit logging", "OWASP compliance"],
    }
    biz_strategy = {
        "executive_overview": "Proven Sri Lankan technology pioneer with 12+ years delivering national-scale healthcare IT.",
        "win_themes": ["Zero downtime migration", "Full national data sovereignty", "24/7 localized SLA"],
        "allocated_team": [
            {"role": "Program Director", "suggested_profile": "15+ yrs healthcare enterprise systems", "responsibilities": "Overall program governance"},
            {"role": "Lead Architect", "suggested_profile": "10+ yrs FHIR & cloud architecture", "responsibilities": "Technical design & gate sign-offs"},
        ],
        "matched_case_studies": [
            {"project_name": "National Health EHR Platform", "client_domain": "National Health Authority", "summary": "Integrated 120 hospitals with 99.99% uptime.", "relevance_score": 0.96}
        ],
        "sla_support_model": "12 months warranty with 15-minute P1 incident response target.",
    }
    requirements = [
        {"req_code": "REQ-01", "category": "Security", "title": "Role-Based Access Control", "is_mandatory": True},
        {"req_code": "REQ-02", "category": "Architecture", "title": "HL7 FHIR API Integration", "is_mandatory": True},
        {"req_code": "REQ-03", "category": "Compliance", "title": "ISO 27001 Compliance", "is_mandatory": True},
    ]

    # 1. Verify 12 Canonical Proposal Sections
    print("1. Testing 12 Canonical Proposal Sections Generation...")
    sections = _build_default_sections(
        tender_title=tender_title,
        client_name=client_name,
        rfp_analysis=rfp_analysis,
        technical_strategy=tech_strategy,
        business_strategy=biz_strategy,
        requirements=requirements,
    )
    print(f"   -> Generated {len(sections)} sections.")
    assert len(sections) == 12, f"Expected 12 sections, got {len(sections)}"
    for idx, s in enumerate(sections):
        print(f"      Section {idx+1}: {s['title']} ({len(s['content_markdown'].split())} words)")
    print("   [PASS] All 12 canonical sections successfully generated.\n")

    # 2. Verify Single-Section AI Regeneration
    print("2. Testing Single-Section AI Regeneration...")
    regen_res = regenerate_proposal_section(
        section_type="security",
        section_title="7. Enterprise Security, Governance & Compliance Controls",
        tender_title=tender_title,
        client_name=client_name,
        current_content=sections[6]["content_markdown"],
        user_instructions="Emphasize HIPAA data encryption standards and zero-trust authentication.",
        tone="technical",
    )
    assert regen_res["word_count"] > 20
    print(f"   -> Regenerated section '{regen_res['title']}' ({regen_res['word_count']} words, model: {regen_res['model_used']})")
    print("   [PASS] Single section regeneration working.\n")

    # 3. Verify DOCX Exporter
    print("3. Testing Professional DOCX Proposal Export...")
    docx_stream = build_proposal_docx(
        tender_title=tender_title,
        tender_ref=tender_ref,
        client_name=client_name,
        sections=sections,
        compliance_score=96.0,
        win_probability=92.0,
        version=1,
    )
    docx_bytes = docx_stream.getvalue()
    print(f"   -> DOCX Generated: {len(docx_bytes):,} bytes")
    assert len(docx_bytes) > 5000, "DOCX file too small"
    print("   [PASS] DOCX Export working.\n")

    # 4. Verify PDF Exporter
    print("4. Testing Professional PDF Proposal Export...")
    pdf_stream = build_proposal_pdf(
        tender_title=tender_title,
        tender_ref=tender_ref,
        client_name=client_name,
        sections=sections,
        compliance_score=96.0,
        win_probability=92.0,
        version=1,
    )
    pdf_bytes = pdf_stream.getvalue()
    print(f"   -> PDF Generated: {len(pdf_bytes):,} bytes")
    assert len(pdf_bytes) > 5000, "PDF file too small"
    print("   [PASS] PDF Export working.\n")

    print("=================================================================")
    print("  ALL PHASE 11 BACKEND & EXPORT CHECKS PASSED SUCCESSFULLY!     ")
    print("=================================================================")

if __name__ == "__main__":
    test_phase11()
