-- ==============================================================================
-- BidPilot AI — Phase 9 Migration
-- Evidence-First Generation & "Prove This Claim" Traceability
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout)
-- ==============================================================================

-- 1. Ensure citations table exists
CREATE TABLE IF NOT EXISTS citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    proposal_section_id UUID NOT NULL REFERENCES proposal_sections(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
    citation_number INT NOT NULL DEFAULT 1,
    claim_text TEXT NOT NULL DEFAULT '',
    verification_status VARCHAR(50) NOT NULL DEFAULT 'verified',
    similarity_score DOUBLE PRECISION DEFAULT 0.0,
    source_type VARCHAR(50) DEFAULT 'document',
    source_id TEXT,
    source_name VARCHAR(255),
    source_title VARCHAR(255),
    source_page INT,
    source_section VARCHAR(255),
    citation_anchor VARCHAR(50) DEFAULT '[Ref 1]',
    metadata JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Add any columns if table already existed from earlier schema versions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'citation_number') THEN
        ALTER TABLE citations ADD COLUMN citation_number INT NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'claim_text') THEN
        ALTER TABLE citations ADD COLUMN claim_text TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'verification_status') THEN
        ALTER TABLE citations ADD COLUMN verification_status VARCHAR(50) NOT NULL DEFAULT 'verified';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'similarity_score') THEN
        ALTER TABLE citations ADD COLUMN similarity_score DOUBLE PRECISION DEFAULT 0.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'source_type') THEN
        ALTER TABLE citations ADD COLUMN source_type VARCHAR(50) DEFAULT 'document';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'source_id') THEN
        ALTER TABLE citations ADD COLUMN source_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'source_name') THEN
        ALTER TABLE citations ADD COLUMN source_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'source_title') THEN
        ALTER TABLE citations ADD COLUMN source_title VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'source_page') THEN
        ALTER TABLE citations ADD COLUMN source_page INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'source_section') THEN
        ALTER TABLE citations ADD COLUMN source_section VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'citation_anchor') THEN
        ALTER TABLE citations ADD COLUMN citation_anchor VARCHAR(50) DEFAULT '[Ref 1]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'metadata') THEN
        ALTER TABLE citations ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'is_verified') THEN
        ALTER TABLE citations ADD COLUMN is_verified BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'verification_notes') THEN
        ALTER TABLE citations ADD COLUMN verification_notes TEXT;
    END IF;
END $$;

-- 3. Indexes for fast citation lookup
CREATE INDEX IF NOT EXISTS idx_citations_section ON citations(proposal_section_id);
CREATE INDEX IF NOT EXISTS idx_citations_org_status ON citations(organization_id, verification_status);

-- 4. View: v_section_citations
-- Aggregates citations per proposal section with full knowledge source details
CREATE OR REPLACE VIEW v_section_citations AS
SELECT
    c.id AS citation_id,
    c.organization_id,
    c.proposal_section_id,
    ps.proposal_id,
    ps.title AS section_title,
    ps.order_index AS section_order,
    COALESCE(c.citation_number, 1) AS citation_number,
    COALESCE(c.citation_anchor, '[Ref 1]') AS citation_anchor,
    c.claim_text,
    COALESCE(c.verification_status, 'verified') AS verification_status,
    COALESCE(c.similarity_score, 0.0) AS similarity_score,
    COALESCE(c.source_type, 'document') AS source_type,
    c.source_id,
    COALESCE(c.source_name, c.source_title, 'Knowledge Base') AS source_name,
    c.source_page,
    c.source_section,
    c.metadata,
    c.created_at
FROM citations c
JOIN proposal_sections ps ON ps.id = c.proposal_section_id;
