-- ==============================================================================
-- BidPilot AI — Phase 8 Migration
-- Multi-Agent Workflow & Proposal Orchestration
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout)
-- ==============================================================================

-- 1. Ensure indexes exist for proposals, sections, citations, and agent_runs
CREATE INDEX IF NOT EXISTS idx_proposals_tender_status ON proposals(tender_id, status);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_order ON proposal_sections(proposal_id, order_index);
CREATE INDEX IF NOT EXISTS idx_citations_section ON citations(proposal_section_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_proposal ON agent_runs(proposal_id);

-- 2. Helper view: v_proposal_summary
-- Summarizes proposal status, section count, verified claims, compliance score, and win probability
CREATE OR REPLACE VIEW v_proposal_summary AS
SELECT
    p.id                               AS proposal_id,
    p.organization_id,
    p.tender_id,
    p.title                            AS proposal_title,
    p.status                           AS proposal_status,
    p.version,
    p.win_probability,
    p.compliance_score,
    p.metadata,
    p.created_at,
    p.updated_at,
    t.reference_code                   AS tender_ref,
    t.title                            AS tender_title,
    t.client_name,
    COUNT(ps.id)                       AS section_count,
    COALESCE(SUM(ps.verified_claims_count), 0)   AS total_verified_claims,
    COALESCE(SUM(ps.unverified_claims_count), 0) AS total_unverified_claims
FROM proposals p
JOIN tenders t ON t.id = p.tender_id
LEFT JOIN proposal_sections ps ON ps.proposal_id = p.id
GROUP BY
    p.id, p.organization_id, p.tender_id, p.title, p.status,
    p.version, p.win_probability, p.compliance_score, p.metadata,
    p.created_at, p.updated_at, t.reference_code, t.title, t.client_name;

-- 3. Grant access
GRANT SELECT ON v_proposal_summary TO service_role;
GRANT SELECT ON v_proposal_summary TO authenticated;

-- ==============================================================================
-- End of Phase 8 Migration
-- ==============================================================================
