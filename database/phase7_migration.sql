-- ==============================================================================
-- BidPilot AI — Phase 7 Migration
-- Requirement Agent & Traceable Requirement Matrix
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout)
-- ==============================================================================

-- 1. Ensure requirements table has evidence_metadata JSONB column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'requirements' AND column_name = 'evidence_metadata'
    ) THEN
        ALTER TABLE requirements ADD COLUMN evidence_metadata JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Helpful indexes for requirement queries & status filtering
CREATE INDEX IF NOT EXISTS idx_requirements_tender_status ON requirements(tender_id, status);
CREATE INDEX IF NOT EXISTS idx_requirements_tender_category ON requirements(tender_id, category);
CREATE INDEX IF NOT EXISTS idx_requirements_is_mandatory ON requirements(tender_id, is_mandatory);

-- 3. Update or create the Requirement Matrix helper view
CREATE OR REPLACE VIEW v_requirement_matrix AS
SELECT
    r.id,
    r.organization_id,
    r.tender_id,
    r.req_code,
    r.category,
    r.title,
    r.description,
    r.is_mandatory,
    r.source_page,
    r.source_section,
    r.status,
    r.match_score,
    r.notes,
    r.evidence_metadata,
    r.assigned_to,
    r.created_at,
    r.updated_at,
    t.reference_code AS tender_ref,
    t.title AS tender_title
FROM requirements r
JOIN tenders t ON t.id = r.tender_id;

-- 4. Grant access
GRANT SELECT ON v_requirement_matrix TO service_role;
GRANT SELECT ON v_requirement_matrix TO authenticated;

-- ==============================================================================
-- End of Phase 7 Migration
-- ==============================================================================
