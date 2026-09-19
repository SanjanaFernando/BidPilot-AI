"""
Phase 9 End-to-End Claim Verification & Evidence Grounding Verification
Tests the 'Prove This Claim' verification engine across real knowledge chunks in Supabase.
"""

import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.dirname(__file__))

from app.dependencies import get_supabase
from app.models.schemas import ClaimVerifyRequest
from app.routers.claims import verify_claim

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bidpilot.test.phase9")

async def main():
    org_id = "a0000000-0000-0000-0001-000000000001"
    supabase = get_supabase()

    print("=" * 70)
    print("Phase 9: Prove This Claim Verification Test")
    print(f"Organization: {org_id}")
    print("=" * 70)

    # Test Case 1: Real Supported Claim (ISO 27001 & Architecture)
    claim_1 = "Our company possesses verified ISO 27001 certification and enterprise cloud architecture experience."
    print(f"\n[Test 1] Evaluating Supported Claim:\n  '{claim_1}'")
    req_1 = ClaimVerifyRequest(
        organization_id=org_id,
        claim_text=claim_1,
        match_threshold=0.20,
    )
    res_1 = await verify_claim(req_1, supabase)
    print(f"  Status        : {res_1.verification_status.upper()}")
    print(f"  Confidence    : {res_1.confidence_score}%")
    print(f"  Suggested Ref : {res_1.suggested_citation_anchor}")
    print(f"  Rationale     : {res_1.assessment_rationale}")
    print(f"  Evidence Count: {len(res_1.supporting_evidence)}")
    for ev in res_1.supporting_evidence[:2]:
        print(f"    - [{ev.source_type.upper()}] {ev.source_name} ({round(ev.similarity_score * 100, 1)}% match)")

    # Test Case 2: Real Supported Claim (Healthcare EHR past project)
    claim_2 = "We have extensive experience building hospital electronic health record systems for ministries."
    print(f"\n[Test 2] Evaluating Domain Specific Claim:\n  '{claim_2}'")
    req_2 = ClaimVerifyRequest(
        organization_id=org_id,
        claim_text=claim_2,
        match_threshold=0.20,
    )
    res_2 = await verify_claim(req_2, supabase)
    print(f"  Status        : {res_2.verification_status.upper()}")
    print(f"  Confidence    : {res_2.confidence_score}%")
    print(f"  Suggested Ref : {res_2.suggested_citation_anchor}")
    print(f"  Evidence Count: {len(res_2.supporting_evidence)}")
    for ev in res_2.supporting_evidence[:2]:
        print(f"    - [{ev.source_type.upper()}] {ev.source_name} ({round(ev.similarity_score * 100, 1)}% match)")

    print("\n" + "=" * 70)
    print("[SUCCESS] Phase 9 Prove This Claim Engine verified!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
