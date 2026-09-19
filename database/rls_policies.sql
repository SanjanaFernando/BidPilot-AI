-- ==============================================================================
-- BidPilot AI - Row Level Security (RLS) Multi-Tenant Policies (Phase 2)
-- Description: Enforces multi-tenant isolation across all 15 tables.
--              No organization can read or write another organization's data.
-- ==============================================================================

-- 1. Helper function to extract organization_id for current authenticated user
CREATE OR REPLACE FUNCTION get_auth_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Check if organization_id is embedded in JWT claims
    IF (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL THEN
        RETURN (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID;
    END IF;

    -- Fallback: query the users table for the authenticated user's organization
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = auth.uid();

    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enable RLS on all Tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. Organizations Policies
-- ==============================================================================
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (id = get_auth_user_organization_id());

CREATE POLICY "Owners and admins can update their organization"
ON organizations FOR UPDATE
USING (
    id = get_auth_user_organization_id() 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
          AND users.role IN ('owner', 'admin')
    )
);

-- ==============================================================================
-- 4. Users Policies
-- ==============================================================================
CREATE POLICY "Users can view members of their organization"
ON users FOR SELECT
USING (organization_id = get_auth_user_organization_id());

CREATE POLICY "Users can update their own profile or admins can update members"
ON users FOR UPDATE
USING (
    organization_id = get_auth_user_organization_id() 
    AND (
        id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
              AND u.role IN ('owner', 'admin')
        )
    )
);

CREATE POLICY "Admins can insert users into their organization"
ON users FOR INSERT
WITH CHECK (organization_id = get_auth_user_organization_id());

CREATE POLICY "Admins can delete users from their organization"
ON users FOR DELETE
USING (
    organization_id = get_auth_user_organization_id() 
    AND EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('owner', 'admin')
    )
);

-- ==============================================================================
-- 5. Standard Multi-Tenant Policies for Company Knowledge & Tenders
-- ==============================================================================

-- Macro function to generate standard tenant isolation policies
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'projects', 
        'employees', 
        'technologies', 
        'certifications', 
        'knowledge_documents', 
        'document_chunks', 
        'tenders', 
        'requirements', 
        'proposals', 
        'proposal_sections', 
        'citations', 
        'agent_runs', 
        'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables
    LOOP
        -- Drop existing policies if any
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_select', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_insert', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_update', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_delete', tbl);

        -- SELECT policy
        EXECUTE format('
            CREATE POLICY %I ON %I 
            FOR SELECT 
            USING (organization_id = get_auth_user_organization_id());
        ', tbl || '_tenant_select', tbl);

        -- INSERT policy
        EXECUTE format('
            CREATE POLICY %I ON %I 
            FOR INSERT 
            WITH CHECK (organization_id = get_auth_user_organization_id());
        ', tbl || '_tenant_insert', tbl);

        -- UPDATE policy
        EXECUTE format('
            CREATE POLICY %I ON %I 
            FOR UPDATE 
            USING (organization_id = get_auth_user_organization_id())
            WITH CHECK (organization_id = get_auth_user_organization_id());
        ', tbl || '_tenant_update', tbl);

        -- DELETE policy
        EXECUTE format('
            CREATE POLICY %I ON %I 
            FOR DELETE 
            USING (organization_id = get_auth_user_organization_id());
        ', tbl || '_tenant_delete', tbl);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
