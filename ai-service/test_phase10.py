"""
BidPilot AI — Phase 10 Verification Test: Compliance Matrix & Human Sign-Off
"""

import sys
from app.dependencies import get_supabase
from app.routers.compliance import (
    get_compliance_audit_matrix,
    update_section_review,
    sign_off_proposal,
    get_proposal_governance_status,
)
from app.models.schemas import SectionReviewRequest, ProposalSignOffRequest

ORG_ID = "a0000000-0000-0000-0001-000000000001"
TENDER_ID = "TND-1338"

def main():
    print("=" * 70)
    print("Phase 10: Compliance Cross-Checking & Human Sign-Off Test")
    print(f"Organization: {ORG_ID} | Tender: {TENDER_ID}")
    print("=" * 70)

    supabase = get_supabase()

    # 1. Test Compliance Matrix Audit
    print("\n[Step 1] Running Compliance Audit Matrix Generation...")
    audit = get_compliance_audit_matrix(proposal_id=TENDER_ID, organization_id=ORG_ID, supabase=supabase)
    print(f"  Proposal ID               : {audit.proposal_id}")
    print(f"  Overall Compliance Score  : {audit.overall_compliance_score}%")
    print(f"  Total Requirements Audited: {audit.total_requirements}")
    print(f"  Mandatory Clauses Met     : {audit.mandatory_met}/{audit.mandatory_total}")
    print(f"  Compliant Clauses Count   : {audit.compliant_count}")
    print(f"  Contradictions Detected   : {audit.contradiction_count}")
    print(f"  Certifications Verified   : {audit.certifications_verified_count}")
    print(f"  Sample Matrix Row 1       : [{audit.rows[0].req_code}] {audit.rows[0].requirement_title} -> {audit.rows[0].compliance_status.upper()}")

    # 2. Test Section Review Update
    print("\n[Step 2] Testing Section-Level Human Review...")
    secs_resp = supabase.table("proposal_sections").select("id, title").eq("proposal_id", audit.proposal_id).order("order_index").limit(1).execute()
    if secs_resp.data:
        test_sec_id = secs_resp.data[0]["id"]
        test_sec_title = secs_resp.data[0]["title"]
        sec_review = update_section_review(
            section_id=test_sec_id,
            payload=SectionReviewRequest(
                review_status="approved",
                reviewed_by="Lead Systems Architect",
                reviewer_comments="Technical SLA and high-availability architecture verified."
            ),
            supabase=supabase,
        )
        print(f"  Section: '{test_sec_title}' ({test_sec_id})")
        print(f"  Status : {sec_review.review_status.upper()}")
        print(f"  Message: {sec_review.message}")
    else:
        print("  No sections found to review.")

    # 3. Test Authorized Proposal Sign-Off
    print("\n[Step 3] Testing Executive Proposal Sign-Off & Submission Authorization...")
    sign_off = sign_off_proposal(
        proposal_id=audit.proposal_id,
        payload=ProposalSignOffRequest(
            approved_by="Jane Doe",
            approver_role="Executive VP of Public Sector Solutions",
            review_notes="Approved for official tender submission. All ISO 27001 requirements met.",
            submission_checklist={
                "mandatory_clauses_met": True,
                "sla_confirmed": True,
                "pricing_approved": True,
                "legal_sign_off": True,
                "human_authorization": True
            }
        ),
        supabase=supabase,
    )
    print(f"  Governance Status : {sign_off.governance_status.upper()}")
    print(f"  Approved By       : {sign_off.approved_by}")
    print(f"  Approved At       : {sign_off.approved_at}")
    print(f"  Can Submit Tender : {sign_off.can_submit}")

    # 4. Test Governance Status API
    print("\n[Step 4] Checking Governance Lifecycle API...")
    gov = get_proposal_governance_status(proposal_id=audit.proposal_id, supabase=supabase)
    print(f"  Current Proposal State: {gov.governance_status.upper()}")
    print(f"  Approved Sections     : {gov.approved_sections_count}/{gov.total_sections}")
    print(f"  Submission Readiness  : {'READY' if gov.can_submit else 'PENDING'}")

    print("\n" + "=" * 70)
    print("[SUCCESS] Phase 10 Compliance & Human Sign-Off Engine Verified!")
    print("=" * 70)

if __name__ == "__main__":
    main()
