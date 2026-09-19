-- ==============================================================================
-- BidPilot AI - PostgreSQL & Supabase Database Schema (Phase 2)
-- Description: Multi-tenant schema with 15 core tables, pgvector support,
--              automated timestamps, and RPC vector search function.
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Helper Timestamp Update Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Core Tables
-- ==============================================================================

-- Table 1: Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    settings JSONB DEFAULT '{
        "allowed_file_types": ["pdf", "docx"],
        "max_file_size_mb": 25,
        "default_currency": "LKR",
        "default_language": "en"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 2: Users (Profiles linked to Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- Maps to Supabase auth.users.id
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'bid_manager', 'technical_writer', 'reviewer', 'member')),
    avatar_url TEXT,
    job_title VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 3: Projects (Past Company Case Studies & Experience)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    technologies TEXT[] DEFAULT '{}',
    challenges TEXT,
    solution TEXT,
    outcomes TEXT,
    budget_range VARCHAR(100),
    team_size INTEGER,
    start_date DATE,
    end_date DATE,
    is_confidential BOOLEAN DEFAULT FALSE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 4: Employees (Staff Knowledge & Expertise)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    experience_years NUMERIC(4, 1) DEFAULT 0.0,
    skills TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    bio TEXT,
    project_history JSONB DEFAULT '[]'::jsonb,
    availability_status VARCHAR(50) DEFAULT 'available' CHECK (availability_status IN ('available', 'allocated', 'partially_available')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 5: Technologies (Tech Stack Capability Register)
CREATE TABLE IF NOT EXISTS technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g. 'Frontend', 'Cloud & DevOps', 'AI/ML', 'Database'
    experience_level VARCHAR(50) DEFAULT 'advanced' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    description TEXT,
    related_projects TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_org_tech_name UNIQUE (organization_id, name)
);

-- Table 6: Certifications (Organizational & Individual Certifications)
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    holder_type VARCHAR(50) DEFAULT 'company' CHECK (holder_type IN ('company', 'employee')),
    holder_id UUID, -- Optional reference to employee or user
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(150),
    credential_url TEXT,
    evidence_document_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 7: Knowledge Documents (Internal Whitepapers, Past Proposals, Policies)
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'case_study', 'resume', 'proposal_archive', 'compliance_policy', 'whitepaper'
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    extracted_text TEXT,
    is_processed BOOLEAN DEFAULT FALSE NOT NULL,
    chunk_count INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 8: Document Chunks (Vector Store for RAG)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768), -- Standard 768-dim embeddings (e.g. nomic-embed-text / bge-base)
    token_count INTEGER DEFAULT 0,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    section_heading VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. {"source_type": "project", "entity_id": "..."}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 9: Tenders (RFPs / Bids)
CREATE TABLE IF NOT EXISTS tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reference_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_organization VARCHAR(255),
    submission_deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'ready_for_bidding', 'in_progress', 'under_review', 'submitted', 'won', 'lost', 'abandoned')),
    budget_currency VARCHAR(10) DEFAULT 'LKR',
    budget_amount NUMERIC(15, 2),
    summary TEXT,
    original_file_path TEXT,
    total_requirements_count INTEGER DEFAULT 0,
    covered_requirements_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_org_tender_ref UNIQUE (organization_id, reference_code)
);

-- Table 10: Requirements (Extracted & Traceable RFP Requirements)
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    req_code VARCHAR(50) NOT NULL, -- e.g. 'REQ-001'
    category VARCHAR(100) NOT NULL, -- e.g. 'Security', 'Functional', 'Performance', 'Compliance', 'Deliverables'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE NOT NULL,
    source_page INTEGER,
    source_section VARCHAR(255),
    status VARCHAR(50) DEFAULT 'unverified' CHECK (status IN ('unverified', 'covered', 'partially_covered', 'missing', 'evidence_required')),
    match_score NUMERIC(5, 2) DEFAULT 0.00, -- 0.00 to 100.00
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_tender_req_code UNIQUE (tender_id, req_code)
);

-- Table 11: Proposals (Generated Bid Responses)
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'generated', 'in_review', 'approved', 'rejected', 'exported')),
    version INTEGER DEFAULT 1 NOT NULL,
    win_probability NUMERIC(5, 2) DEFAULT 0.00, -- 0 to 100%
    compliance_score NUMERIC(5, 2) DEFAULT 0.00, -- 0 to 100%
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{
        "target_pages": 40,
        "format": "standard_bid",
        "total_claims": 0,
        "verified_claims": 0
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 12: Proposal Sections (Multi-Section Structured Document)
CREATE TABLE IF NOT EXISTS proposal_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    section_type VARCHAR(100) NOT NULL, -- e.g. 'executive_summary', 'company_profile', 'proposed_solution', 'architecture', 'team', 'timeline', 'pricing'
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    content_markdown TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready_for_review', 'verified', 'approved')),
    verified_claims_count INTEGER DEFAULT 0 NOT NULL,
    unverified_claims_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_proposal_section_order UNIQUE (proposal_id, order_index)
);

-- Table 13: Citations (Evidence Links Back to Verified Knowledge)
CREATE TABLE IF NOT EXISTS citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    proposal_section_id UUID NOT NULL REFERENCES proposal_sections(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    claim_text TEXT NOT NULL,
    source_title VARCHAR(255) NOT NULL,
    source_page INTEGER,
    source_section VARCHAR(255),
    similarity_score NUMERIC(5, 4), -- Cosine similarity score
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table 14: Agent Runs (Audit & Telemetry for Multi-Agent Pipeline)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL, -- 'RFPAnalysisAgent', 'RequirementAgent', 'TechnicalAgent', 'BusinessAgent', 'ProposalAgent', 'ComplianceAgent', 'ReviewAgent'
    status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    logs TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Table 15: Audit Logs (System Activity & Compliance Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'create_tender', 'approve_proposal', 'prove_claim', 'export_docx'
    entity_type VARCHAR(100) NOT NULL, -- e.g. 'tender', 'proposal', 'requirement', 'citation'
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 4. Triggers for updated_at
-- ==============================================================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'organizations', 'users', 'projects', 'employees', 
            'technologies', 'certifications', 'knowledge_documents', 
            'tenders', 'requirements', 'proposals', 'proposal_sections'
          )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS tr_%I_updated_at ON %I;
            CREATE TRIGGER tr_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 5. Indexes for Performance & Search
-- ==============================================================================

-- Multi-Tenant Foreign Key & Query Indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_technologies_org ON technologies(organization_id);
CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(organization_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_org ON knowledge_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_org ON document_chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_tenders_org ON tenders(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_requirements_org ON requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_requirements_tender ON requirements(tender_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(tender_id, status);

CREATE INDEX IF NOT EXISTS idx_proposals_org ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tender ON proposals(tender_id);

CREATE INDEX IF NOT EXISTS idx_proposal_sections_org ON proposal_sections(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_prop ON proposal_sections(proposal_id);

CREATE INDEX IF NOT EXISTS idx_citations_org ON citations(organization_id);
CREATE INDEX IF NOT EXISTS idx_citations_section ON citations(proposal_section_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_org ON agent_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_tender ON agent_runs(tender_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_proposal ON agent_runs(proposal_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- HNSW Vector Index on document_chunks.embedding using cosine distance
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- ==============================================================================
-- 6. Vector Search RPC Functions for Supabase / PostgreSQL RAG
-- ==============================================================================

-- 6a. RFP Document Chunks — match_document_chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(768),
    match_threshold double precision,
    match_count integer,
    filter_organization_id uuid,
    filter_document_id uuid DEFAULT NULL,
    filter_tender_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    source_filename text,
    content text,
    chunk_index integer,
    page_number integer,
    section_heading varchar(255),
    metadata jsonb,
    similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        kd.title AS source_filename,
        dc.content,
        dc.chunk_index,
        dc.page_number,
        dc.section_heading,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    LEFT JOIN knowledge_documents kd ON kd.id = dc.document_id
    WHERE dc.organization_id = filter_organization_id
      AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
      AND (filter_tender_id IS NULL
           OR dc.metadata->>'tender_id' = filter_tender_id::text)
      AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ==============================================================================
-- 7. Knowledge Base Chunks Table (Phase 5 RAG)
-- ==============================================================================

-- Table: knowledge_chunks (Embedded company KB records for semantic retrieval)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'project' | 'employee' | 'technology' | 'certification'
    source_id TEXT NOT NULL,          -- UUID of the originating KB record
    source_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,            -- Rich text representation used for embedding
    embedding vector(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- HNSW index for fast cosine similarity on knowledge_chunks
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops);

-- Standard indexes for filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_org ON knowledge_chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type ON knowledge_chunks(organization_id, source_type);

-- ==============================================================================
-- 8. Knowledge Chunks RPC — match_knowledge_chunks
-- ==============================================================================

-- 8a. Knowledge Base Chunks — match_knowledge_chunks
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding vector(768),
    match_threshold double precision,
    match_count integer,
    filter_organization_id uuid,
    filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    source_type varchar(50),
    source_id text,
    source_name varchar(255),
    content text,
    metadata jsonb,
    similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.source_type,
        kc.source_id,
        kc.source_name,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks kc
    WHERE kc.organization_id = filter_organization_id
      AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
      AND (1 - (kc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

