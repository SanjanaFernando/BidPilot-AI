-- ==============================================================================
-- BidPilot AI — Phase 5 Schema Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wduvxobmtjpcvjsyvcen/sql/new
-- ==============================================================================

-- 1. knowledge_chunks table
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,      -- 'project' | 'employee' | 'technology' | 'certification'
    source_id TEXT NOT NULL,               -- UUID of the originating KB record
    source_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,                 -- Rich text representation used for embedding
    embedding vector(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_org
    ON knowledge_chunks(organization_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type
    ON knowledge_chunks(organization_id, source_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
    ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops);

-- 3. match_knowledge_chunks RPC function
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

-- Verification
SELECT 'knowledge_chunks table created' AS status;
SELECT 'match_knowledge_chunks RPC created' AS status;
