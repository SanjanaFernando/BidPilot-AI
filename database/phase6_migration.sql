-- ==============================================================================
-- BidPilot AI — Phase 6 Migration
-- RFP Analysis Agent: helper view + agent_runs index additions
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout)
-- ==============================================================================

-- 1. Ensure agent_runs has the right indexes for quick tender lookups
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name ON agent_runs(organization_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(tender_id, status);

-- 2. Add completed_at column to agent_runs if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agent_runs' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE agent_runs ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Helper view: v_tender_analysis
--    Joins tenders + requirements for quick dashboard queries
--    Provides a status breakdown per tender
CREATE OR REPLACE VIEW v_tender_analysis AS
SELECT
    t.id                              AS tender_id,
    t.organization_id,
    t.title                           AS tender_title,
    t.client_name,
    t.submission_deadline,
    t.status                          AS tender_status,
    t.total_requirements_count,
    t.covered_requirements_count,
    COUNT(r.id)                       AS req_count,
    COUNT(r.id) FILTER (WHERE r.status = 'covered')           AS covered_count,
    COUNT(r.id) FILTER (WHERE r.status = 'partially_covered') AS partial_count,
    COUNT(r.id) FILTER (WHERE r.status = 'missing')           AS missing_count,
    COUNT(r.id) FILTER (WHERE r.status = 'evidence_required') AS evidence_needed_count,
    COUNT(r.id) FILTER (WHERE r.status = 'unverified')        AS unverified_count,
    COUNT(r.id) FILTER (WHERE r.is_mandatory = TRUE)          AS mandatory_count,
    COUNT(r.id) FILTER (WHERE r.is_mandatory = FALSE)         AS optional_count,
    (
        SELECT created_at
        FROM agent_runs ar
        WHERE ar.tender_id = t.id
          AND ar.agent_name = 'RFPAnalysisAgent'
          AND ar.status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
    )                                 AS last_analysis_at
FROM tenders t
LEFT JOIN requirements r ON r.tender_id = t.id
GROUP BY
    t.id, t.organization_id, t.title, t.client_name,
    t.submission_deadline, t.status,
    t.total_requirements_count, t.covered_requirements_count;

-- 4. Grant access to the view for the service role
-- (Supabase service key can already read everything, but this is explicit)
GRANT SELECT ON v_tender_analysis TO service_role;
GRANT SELECT ON v_tender_analysis TO authenticated;

-- ==============================================================================
-- End of Phase 6 Migration
-- ==============================================================================
