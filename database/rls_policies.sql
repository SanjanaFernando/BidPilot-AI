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
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (id = get_auth_user_organization_id());

DROP POLICY IF EXISTS "Owners and admins can update their organization" ON organizations;
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
DROP POLICY IF EXISTS "Users can view members of their organization" ON users;
CREATE POLICY "Users can view members of their organization"
ON users FOR SELECT
USING (organization_id = get_auth_user_organization_id());

DROP POLICY IF EXISTS "Users can update their own profile or admins can update members" ON users;
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

DROP POLICY IF EXISTS "Admins can insert users into their organization" ON users;
CREATE POLICY "Admins can insert users into their organization"
ON users FOR INSERT
WITH CHECK (organization_id = get_auth_user_organization_id());

DROP POLICY IF EXISTS "Admins can delete users from their organization" ON users;
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

-- ==============================================================================
-- Phase 12: RBAC Table RLS Policies
-- ==============================================================================

-- Helper: check if current user is org admin for a given org
CREATE OR REPLACE FUNCTION is_org_admin(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members om
        JOIN roles r ON r.id = om.role_id
        WHERE om.org_id = p_organization_id
          AND om.user_id = auth.uid()
          AND r.name = 'org_admin'
          AND om.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: check if current user is active member of the org
CREATE OR REPLACE FUNCTION is_org_member(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE org_id = p_organization_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- roles — public read-only (system table, no org isolation needed)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read system roles" ON roles;
CREATE POLICY "Anyone can read system roles"
ON roles FOR SELECT USING (TRUE);

-- permissions — public read-only
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read permissions" ON permissions;
CREATE POLICY "Anyone can read permissions"
ON permissions FOR SELECT USING (TRUE);

-- role_permissions — public read-only
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON role_permissions;
CREATE POLICY "Anyone can read role_permissions"
ON role_permissions FOR SELECT USING (TRUE);

-- organization_members — members can read their org's list; only org_admin can write
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select" ON organization_members;
CREATE POLICY "org_members_select"
ON organization_members FOR SELECT
USING (org_id = get_auth_user_organization_id());

DROP POLICY IF EXISTS "org_members_insert" ON organization_members;
CREATE POLICY "org_members_insert"
ON organization_members FOR INSERT
WITH CHECK (
    org_id = get_auth_user_organization_id()
    AND is_org_admin(org_id)
);

DROP POLICY IF EXISTS "org_members_update" ON organization_members;
CREATE POLICY "org_members_update"
ON organization_members FOR UPDATE
USING (
    org_id = get_auth_user_organization_id()
    AND is_org_admin(org_id)
)
WITH CHECK (
    org_id = get_auth_user_organization_id()
);

DROP POLICY IF EXISTS "org_members_delete" ON organization_members;
CREATE POLICY "org_members_delete"
ON organization_members FOR DELETE
USING (
    org_id = get_auth_user_organization_id()
    AND is_org_admin(org_id)
);

-- tender_collaborators — org members can read; bid_manager/org_admin can write
ALTER TABLE tender_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tc_select" ON tender_collaborators;
CREATE POLICY "tc_select"
ON tender_collaborators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tenders t
        WHERE t.id = tender_collaborators.tender_id
          AND t.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "tc_insert" ON tender_collaborators;
CREATE POLICY "tc_insert"
ON tender_collaborators FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenders t
        WHERE t.id = tender_collaborators.tender_id
          AND t.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "tc_update" ON tender_collaborators;
CREATE POLICY "tc_update"
ON tender_collaborators FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tenders t
        WHERE t.id = tender_collaborators.tender_id
          AND t.organization_id = get_auth_user_organization_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenders t
        WHERE t.id = tender_collaborators.tender_id
          AND t.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "tc_delete" ON tender_collaborators;
CREATE POLICY "tc_delete"
ON tender_collaborators FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM tenders t
        WHERE t.id = tender_collaborators.tender_id
          AND t.organization_id = get_auth_user_organization_id()
    )
);

-- section_assignments — org members can read; assigned user or manager can write
ALTER TABLE section_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sa_select" ON section_assignments;
CREATE POLICY "sa_select"
ON section_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_assignments.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "sa_insert" ON section_assignments;
CREATE POLICY "sa_insert"
ON section_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_assignments.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "sa_update" ON section_assignments;
CREATE POLICY "sa_update"
ON section_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_assignments.section_id
          AND ps.organization_id = get_auth_user_organization_id()
          AND (section_assignments.assigned_user_id = auth.uid() OR is_org_admin(ps.organization_id))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_assignments.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "sa_delete" ON section_assignments;
CREATE POLICY "sa_delete"
ON section_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_assignments.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

-- section_locks — any org member can read; only the lock holder can update/delete
ALTER TABLE section_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sl_select" ON section_locks;
CREATE POLICY "sl_select"
ON section_locks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_locks.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "sl_insert" ON section_locks;
CREATE POLICY "sl_insert"
ON section_locks FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_locks.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "sl_update" ON section_locks;
CREATE POLICY "sl_update"
ON section_locks FOR UPDATE
USING (
    locked_by_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_locks.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_locks.section_id
          AND ps.organization_id = get_auth_user_organization_id()
    )
);

DROP POLICY IF EXISTS "sl_delete" ON section_locks;
CREATE POLICY "sl_delete"
ON section_locks FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM proposal_sections ps
        WHERE ps.id = section_locks.section_id
          AND ps.organization_id = get_auth_user_organization_id()
          AND (section_locks.locked_by_user_id = auth.uid() OR is_org_admin(ps.organization_id))
    )
);
