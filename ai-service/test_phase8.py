"""
Phase 8 End-to-End Orchestrator Verification Script
Tests the multi-agent pipeline with TechnicalAgent, BusinessAgent, ProposalAgent,
ComplianceAgent, ReviewAgent, and PipelineOrchestrator.
"""

import os
import sys
import logging

# Ensure app is in path
sys.path.insert(0, os.path.dirname(__file__))

from app.dependencies import get_supabase
from app.agents import orchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bidpilot.test.phase8")

def main():
    org_id = "a0000000-0000-0000-0001-000000000001"
    tender_id = "TND-1338"
    
    print("=" * 70)
    print("Phase 8 Multi-Agent Proposal Synthesis Verification")
    print(f"Target Tender: {tender_id}, Org: {org_id}")
    print("=" * 70)

    try:
        supabase = get_supabase()
        print("Connected to Supabase client.")
    except Exception as e:
        print(f"Supabase init error: {e}")
        return

    print("\nRunning PipelineOrchestrator full pipeline...")
    res = orchestrator.run_full_pipeline(
        supabase=supabase,
        organization_id=org_id,
        tender_id=tender_id,
    )

    print("\n" + "=" * 70)
    print("Pipeline Execution Complete!")
    print(f"Status           : {res['status']}")
    print(f"Proposal ID      : {res['proposal_id']}")
    print(f"Total Latency    : {res['total_latency_ms'] / 1000:.2f}s")
    print(f"Stages Executed  : {len(res['stages_executed'])}")
    print(f"Compliance Score : {res['proposal_summary']['compliance_score']}%")
    print(f"Win Probability  : {res['proposal_summary']['win_probability']}%")
    print(f"Total Sections   : {res['proposal_summary']['total_sections']}")
    print("=" * 70)

    for stg in res['stages_executed']:
        status_icon = "[OK]" if stg.status == "completed" else "[SKIP]" if stg.status == "skipped" else "[FAIL]"
        print(f"{status_icon} [{stg.stage_name:<20}] {stg.latency_ms / 1000:>5.2f}s | {stg.agent_name:<18} | {stg.summary}")

if __name__ == "__main__":
    main()
