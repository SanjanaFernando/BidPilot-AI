-- =============================================================================
-- BidPilot AI — Phases 13, 14, 15 Unified Schema Migration
-- Phase 13: Enterprise Knowledge Governance & Secret Scrubbing
-- Phase 14: Cryptographic Audit Trail & Tamper-Evident Electronic Signatures
-- Phase 15: Enterprise Notifications, Webhooks & Automated Workflow Alerts
-- =============================================================================

-- =============================================================================
-- PHASE 13: Knowledge Clearance Tiers & Governance
-- =============================================================================

-- 1. Add clearance_level to knowledge base and chunk tables if not exists
DO $$ 
BEGIN
    -- projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'clearance_level') THEN
        ALTER TABLE projects ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
    END IF;
    
    -- employees
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'clearance_level') THEN
        ALTER TABLE employees ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
    END IF;

    -- technologies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technologies' AND column_name = 'clearance_level') THEN
        ALTER TABLE technologies ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
    END IF;

    -- certifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certifications' AND column_name = 'clearance_level') THEN
        ALTER TABLE certifications ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
    END IF;

    -- knowledge_documents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_documents' AND column_name = 'clearance_level') THEN
        ALTER TABLE knowledge_documents ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
    END IF;

    -- knowledge_chunks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_chunks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_chunks' AND column_name = 'clearance_level') THEN
            ALTER TABLE knowledge_chunks ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_chunks' AND column_name = 'is_scrubbed') THEN
            ALTER TABLE knowledge_chunks ADD COLUMN is_scrubbed BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;

    -- organization_members clearance level
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_members' AND column_name = 'clearance_level') THEN
            ALTER TABLE organization_members ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'public_org_wide' CHECK (clearance_level IN ('public_org_wide', 'confidential_leadership', 'restricted_nda_only'));
        END IF;
    END IF;
END $$;

-- 2. Clearance-filtered Vector Search RPC for Knowledge Base
CREATE OR REPLACE FUNCTION match_knowledge_chunks_governed(
    query_embedding vector(768),
    match_threshold double precision,
    match_count integer,
    filter_organization_id uuid,
    filter_source_type text DEFAULT NULL,
    filter_clearance_levels text[] DEFAULT ARRAY['public_org_wide', 'confidential_leadership', 'restricted_nda_only']
)
RETURNS TABLE (
    id uuid,
    source_type varchar(50),
    source_id text,
    source_name varchar(255),
    content text,
    metadata jsonb,
    clearance_level varchar(30),
    is_scrubbed boolean,
    similarity double precision
)
LANGUAGE plpgsql AS $func$
BEGIN
    RETURN QUERY
    SELECT kc.id,
           kc.source_type,
           kc.source_id,
           kc.source_name,
           kc.content,
           kc.metadata,
           kc.clearance_level,
           kc.is_scrubbed,
           1 - (kc.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks kc
    WHERE kc.organization_id = filter_organization_id
      AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
      AND (filter_clearance_levels IS NULL OR kc.clearance_level = ANY(filter_clearance_levels))
      AND (1 - (kc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END; $func$;


-- =============================================================================
-- PHASE 14: Cryptographic Audit Trail & Electronic Signatures
-- =============================================================================

-- 1. Enhance audit_logs with hash chaining and signature metadata
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'prev_event_hash') THEN
        ALTER TABLE audit_logs ADD COLUMN prev_event_hash VARCHAR(64) DEFAULT '0000000000000000000000000000000000000000000000000000000000000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'payload_hash') THEN
        ALTER TABLE audit_logs ADD COLUMN payload_hash VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'current_hash') THEN
        ALTER TABLE audit_logs ADD COLUMN current_hash VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_agent') THEN
        ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'signer_name') THEN
        ALTER TABLE audit_logs ADD COLUMN signer_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'signer_email') THEN
        ALTER TABLE audit_logs ADD COLUMN signer_email VARCHAR(255);
    END IF;
END $$;

-- 2. Formal Electronic Signatures Table
CREATE TABLE IF NOT EXISTS electronic_signatures (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    proposal_id       UUID REFERENCES proposals(id) ON DELETE SET NULL,
    proposal_hash     VARCHAR(64) NOT NULL UNIQUE,       -- SHA-256 of proposal snapshot
    signer_user_id    UUID,
    signer_full_name  VARCHAR(255) NOT NULL,
    signer_email      VARCHAR(255) NOT NULL,
    signer_role       VARCHAR(80)  NOT NULL,             -- e.g. "Bid Manager"
    ip_address        VARCHAR(45),
    user_agent        TEXT,
    signed_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status            VARCHAR(30) DEFAULT 'valid' CHECK (status IN ('valid', 'revoked', 'superseded')),
    certificate_data  JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_elec_sig_proposal ON electronic_signatures(proposal_id);
CREATE INDEX IF NOT EXISTS idx_elec_sig_hash     ON electronic_signatures(proposal_hash);


-- =============================================================================
-- PHASE 15: Notifications, Webhooks & Automated Workflow Alerts
-- =============================================================================

-- 1. In-App & System Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID,                              -- NULL for org-wide notifications
    type            VARCHAR(50) NOT NULL,              -- 'tender_deadline', 'requirement_extracted', 'section_assigned', 'approval_requested', 'proposal_signed', 'secret_detected', 'system'
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    link            VARCHAR(500),
    is_read         BOOLEAN DEFAULT FALSE,
    severity        VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'urgent')),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_org  ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- 2. Webhook Outbound Configurations (Slack / MS Teams / Custom)
CREATE TABLE IF NOT EXISTS webhook_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_url     TEXT NOT NULL,
    channel_name    VARCHAR(100) DEFAULT 'General Alerts',
    service_type    VARCHAR(50)  DEFAULT 'slack' CHECK (service_type IN ('slack', 'teams', 'custom')),
    events          TEXT[] DEFAULT ARRAY['tender_created', 'proposal_signed', 'approval_requested', 'secret_alert'],
    is_active       BOOLEAN DEFAULT TRUE,
    secret_key      VARCHAR(120),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhook_configs(organization_id);

-- 3. External Tender Intake Ingestion Logs (Inbound Webhooks)
CREATE TABLE IF NOT EXISTS webhook_ingest_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_system     VARCHAR(100) DEFAULT 'ERP-Intake',
    payload           JSONB DEFAULT '{}'::jsonb,
    status            VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
    created_tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
    error_message     TEXT,
    ip_address        VARCHAR(45),
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_ingest_org ON webhook_ingest_logs(organization_id);

-- =============================================================================
-- SEED DATA for Phases 13, 14, 15
-- =============================================================================

-- Seed initial notifications for demo org
INSERT INTO notifications (organization_id, type, title, message, link, is_read, severity) VALUES
  ('a0000000-0000-0000-0001-000000000001', 'approval_requested', 'Compliance Sign-off Requested', 'Bid Manager submitted Tender TND-2024-001 (National Health Portal) for legal and technical sign-off.', '/proposals/a0000000-0000-0000-0002-000000000001', FALSE, 'urgent'),
  ('a0000000-0000-0000-0001-000000000001', 'secret_detected', 'PII & Secret Scrubbing Notice', 'Automated scanning redacted 3 internal salary figures and 1 API token during LankaTech Knowledge Base ingestion.', '/knowledge/projects', FALSE, 'info'),
  ('a0000000-0000-0000-0001-000000000001', 'tender_deadline', 'Tender Submission Deadline Warning', 'TND-2024-001 submission deadline is in 48 hours. Ensure all mandatory criteria are verified.', '/tenders/a0000000-0000-0000-0001-000000000001', TRUE, 'warning'),
  ('a0000000-0000-0000-0001-000000000001', 'proposal_signed', 'Electronic Signature Sealed', 'Formal cryptographic hash generated and sealed for ICTA Bid Proposal v1.2.', '/verify/c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2', TRUE, 'success')
ON CONFLICT DO NOTHING;

-- Seed demo Electronic Signature
INSERT INTO electronic_signatures (
    id,
    organization_id,
    proposal_id,
    proposal_hash,
    signer_full_name,
    signer_email,
    signer_role,
    ip_address,
    user_agent,
    certificate_data
) VALUES (
    'e0000000-0000-0000-000e-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    (SELECT id FROM proposals LIMIT 1),
    'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2',
    'Nimali Fernando',
    'nimali@lankatech.lk',
    'Bid Manager',
    '192.248.32.10',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    '{
       "algorithm": "SHA-256",
       "issuer": "BidPilot Cryptographic Sign-Off Engine v1.0",
       "organization": "LankaTech Solutions Ltd",
       "tender_code": "TND-2024-001",
       "bid_value": "LKR 45,000,000",
       "tamper_proof": true,
       "verification_url": "/verify/c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
    }'::jsonb
) ON CONFLICT (proposal_hash) DO NOTHING;
