-- ==============================================================================
-- BidPilot AI — Phase 10 Migration
-- Compliance Cross-Checking, Hallucination Prevention & Human Review Workflow
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout)
-- ==============================================================================

-- 1. Governance & Human Approval fields on `proposals` table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'governance_status') THEN
        ALTER TABLE proposals ADD COLUMN governance_status VARCHAR(50) NOT NULL DEFAULT 'draft';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'reviewed_by') THEN
        ALTER TABLE proposals ADD COLUMN reviewed_by VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'approved_by') THEN
        ALTER TABLE proposals ADD COLUMN approved_by VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'approved_at') THEN
        ALTER TABLE proposals ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'review_notes') THEN
        ALTER TABLE proposals ADD COLUMN review_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'submission_checklist') THEN
        ALTER TABLE proposals ADD COLUMN submission_checklist JSONB DEFAULT '{
            "mandatory_clauses_met": true,
            "sla_confirmed": true,
            "pricing_approved": true,
            "legal_sign_off": true,
            "human_authorization": false
        }';
    END IF;
END $$;

-- 2. Section-level review and sign-off fields on `proposal_sections` table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_sections' AND column_name = 'review_status') THEN
        ALTER TABLE proposal_sections ADD COLUMN review_status VARCHAR(50) NOT NULL DEFAULT 'ready_for_review';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_sections' AND column_name = 'reviewed_by') THEN
        ALTER TABLE proposal_sections ADD COLUMN reviewed_by VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_sections' AND column_name = 'reviewed_at') THEN
        ALTER TABLE proposal_sections ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_sections' AND column_name = 'reviewer_comments') THEN
        ALTER TABLE proposal_sections ADD COLUMN reviewer_comments TEXT;
    END IF;
END $$;

-- 3. Compliance Audits table (Detailed requirement matrix cross-check)
CREATE TABLE IF NOT EXISTS compliance_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    section_id UUID REFERENCES proposal_sections(id) ON DELETE SET NULL,
    compliance_status VARCHAR(50) NOT NULL DEFAULT 'compliant', -- 'compliant', 'partially_compliant', 'non_compliant'
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_found BOOLEAN NOT NULL DEFAULT TRUE,
    contradiction_detected BOOLEAN NOT NULL DEFAULT FALSE,
    contradiction_details TEXT,
    certification_verified BOOLEAN NOT NULL DEFAULT TRUE,
    certification_name VARCHAR(255),
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    audit_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_compliance_audit_req UNIQUE (proposal_id, requirement_id)
);

-- 4. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_proposals_governance ON proposals(organization_id, governance_status);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_review ON proposal_sections(proposal_id, review_status);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_prop ON compliance_audits(proposal_id, compliance_status);

-- 5. Relational View: v_compliance_matrix
CREATE OR REPLACE VIEW v_compliance_matrix AS
SELECT
    ca.id AS audit_id,
    ca.organization_id,
    ca.proposal_id,
    ca.requirement_id,
    r.req_code,
    r.category AS requirement_category,
    r.title AS requirement_title,
    r.description AS requirement_description,
    r.is_mandatory,
    ca.compliance_status,
    ca.evidence_found,
    ca.contradiction_detected,
    ca.contradiction_details,
    ca.certification_verified,
    ca.certification_name,
    ca.confidence_score,
    ca.audit_notes,
    ca.section_id,
    ps.title AS section_title,
    ps.order_index AS section_order,
    ps.review_status AS section_review_status,
    ca.created_at
FROM compliance_audits ca
JOIN requirements r ON r.id = ca.requirement_id
LEFT JOIN proposal_sections ps ON ps.id = ca.section_id;
