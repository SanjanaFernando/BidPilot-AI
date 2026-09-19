"""
Phase 5 Bootstrap — Create knowledge_chunks table and match_knowledge_chunks RPC
via Supabase Python client using raw SQL execution.
"""
import sys
import os

# Add the ai-service root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client

SUPABASE_URL = "https://wduvxobmtjpcvjsyvcen.supabase.co"
SUPABASE_SERVICE_KEY = "sb_secret_SnQFbLr7C4hbuzDzRvM8Eg__cR18KqD"

# These SQL statements are broken into safe chunks
STATEMENTS = [
    # 1. Create the knowledge_chunks table
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'knowledge_chunks'
      ) THEN
        CREATE TABLE knowledge_chunks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          source_type VARCHAR(50) NOT NULL,
          source_id TEXT NOT NULL,
          source_name VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          embedding vector(768),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
        RAISE NOTICE 'Created knowledge_chunks table';
      ELSE
        RAISE NOTICE 'knowledge_chunks table already exists';
      END IF;
    END $$;
    """,

    # 2. Indexes
    "CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_org ON knowledge_chunks(organization_id);",
    "CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type ON knowledge_chunks(organization_id, source_type);",

    # 3. match_knowledge_chunks RPC
    """
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
    AS $func$
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
    $func$;
    """,
]


def run():
    try:
        print("Connecting to Supabase...")
        sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        # Use the query RPC if available, else try rpc('exec_sql')
        for i, sql in enumerate(STATEMENTS):
            sql = sql.strip()
            if not sql:
                continue
            print(f"\n[{i+1}/{len(STATEMENTS)}] Executing SQL...")
            try:
                # Try using the pg RPC for raw SQL
                result = sb.rpc("exec", {"sql": sql}).execute()
                print(f"  OK: {result}")
            except Exception as e:
                print(f"  exec RPC failed: {e}")
                # Try alternative
                try:
                    result = sb.rpc("run_sql", {"query": sql}).execute()
                    print(f"  OK via run_sql: {result}")
                except Exception as e2:
                    print(f"  run_sql also failed: {e2}")
                    print(f"  NOTE: You may need to run this SQL manually in Supabase SQL editor:")
                    print(f"  {sql[:200]}...")

    except Exception as e:
        print(f"Connection error: {e}")
        print("\nPlease run the SQL in database/schema.sql (the Phase 5 section) in the Supabase SQL Editor.")


if __name__ == "__main__":
    run()
