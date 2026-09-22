-- =============================================================================
-- BidPilot AI — Phase 12: Enterprise RBAC Schema Migration
-- Creates: roles, permissions, role_permissions, organization_members,
--          tender_collaborators, section_assignments, section_locks
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(80)  NOT NULL UNIQUE,
    description TEXT,
    color       VARCHAR(20)  DEFAULT '#64748B',  -- UI badge color
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(120) NOT NULL UNIQUE,   -- e.g. "proposals:create"
    category    VARCHAR(60)  NOT NULL,          -- e.g. "Proposals"
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. role_permissions (many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -----------------------------------------------------------------------------
-- 4. organization_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id       UUID,           -- NULL until invite accepted
    email         VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role_id       UUID NOT NULL REFERENCES roles(id),
    status        VARCHAR(30) DEFAULT 'active' CHECK (status IN ('invited','active','suspended','removed')),
    invited_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at     TIMESTAMP WITH TIME ZONE,
    avatar_initials VARCHAR(4),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (org_id, email)
);

-- -----------------------------------------------------------------------------
-- 5. tender_collaborators
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tender_collaborators (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id     UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    user_id       UUID,
    email         VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    assigned_role VARCHAR(80),   -- e.g. "Solution Architect"
    can_sign_off  BOOLEAN DEFAULT FALSE,
    added_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tender_id, email)
);

-- -----------------------------------------------------------------------------
-- 6. section_assignments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS section_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id      UUID NOT NULL REFERENCES proposal_sections(id) ON DELETE CASCADE,
    assigned_user_id UUID,
    assigned_email  VARCHAR(255),
    assigned_name   VARCHAR(255),
    status          VARCHAR(30) DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','submitted','approved')),
    review_notes    TEXT,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at    TIMESTAMP WITH TIME ZONE,
    UNIQUE (section_id, assigned_email)
);

-- -----------------------------------------------------------------------------
-- 7. section_locks (collaborative editing — 5-minute heartbeat)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS section_locks (
    section_id       UUID PRIMARY KEY REFERENCES proposal_sections(id) ON DELETE CASCADE,
    locked_by_user_id UUID,
    locked_by_email  VARCHAR(255) NOT NULL,
    locked_by_name   VARCHAR(255),
    locked_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at       TIMESTAMP WITH TIME ZONE NOT NULL,   -- locked_at + 5 min
    heartbeat_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org    ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user   ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email  ON organization_members(email);
CREATE INDEX IF NOT EXISTS idx_tender_collabs_tid ON tender_collaborators(tender_id);
CREATE INDEX IF NOT EXISTS idx_section_assign_sid ON section_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_section_locks_exp  ON section_locks(expires_at);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ─── Roles (6 enterprise roles) ─────────────────────────────────────────────
INSERT INTO roles (id, name, description, color, is_system_role) VALUES
  ('a0000000-0000-0000-000c-000000000001', 'org_admin',           'Full organization control — team, settings, all tenders',      '#DC2626', TRUE),
  ('a0000000-0000-0000-000c-000000000002', 'bid_manager',         'Leads bid strategy, approves proposals and sign-offs',          '#7C3AED', TRUE),
  ('a0000000-0000-0000-000c-000000000003', 'solution_architect',  'Owns technical sections, architecture diagrams',                '#0369A1', TRUE),
  ('a0000000-0000-0000-000c-000000000004', 'compliance_officer',  'Reviews compliance matrix, certifications, and sign-offs',      '#B45309', TRUE),
  ('a0000000-0000-0000-000c-000000000005', 'domain_sme',          'Subject-matter expert contributing to specific sections',       '#065F46', TRUE),
  ('a0000000-0000-0000-000c-000000000006', 'executive_viewer',    'Read-only access to proposals, win-rates and dashboards',       '#475569', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ─── Permissions ─────────────────────────────────────────────────────────────
INSERT INTO permissions (code, category, description) VALUES
  -- Tenders
  ('tenders:view',           'Tenders',   'View tender list and details'),
  ('tenders:create',         'Tenders',   'Upload and create new tenders'),
  ('tenders:edit',           'Tenders',   'Edit tender metadata'),
  ('tenders:delete',         'Tenders',   'Delete tenders'),
  -- Proposals
  ('proposals:view',         'Proposals', 'View proposals and sections'),
  ('proposals:create',       'Proposals', 'Generate new proposals via AI'),
  ('proposals:edit',         'Proposals', 'Edit proposal section content'),
  ('proposals:delete',       'Proposals', 'Delete proposals'),
  ('proposals:sign_off',     'Proposals', 'Submit authorized sign-off for submission'),
  ('proposals:export',       'Proposals', 'Export proposals to PDF / DOCX'),
  -- Requirements
  ('requirements:view',      'Requirements', 'View requirement matrix'),
  ('requirements:edit',      'Requirements', 'Edit requirement status and notes'),
  -- Knowledge Base
  ('knowledge:view',         'Knowledge', 'View knowledge base documents'),
  ('knowledge:manage',       'Knowledge', 'Upload and manage knowledge documents'),
  -- Compliance
  ('compliance:view',        'Compliance','View compliance audit reports'),
  ('compliance:review',      'Compliance','Perform section human reviews'),
  -- Team
  ('team:view',              'Team',      'View team members and roles'),
  ('team:manage',            'Team',      'Invite, change roles, remove members'),
  -- Settings
  ('settings:view',          'Settings',  'View system settings'),
  ('settings:manage',        'Settings',  'Modify system settings and integrations'),
  -- Analytics
  ('analytics:view',         'Analytics', 'View win-rate dashboards and reports')
ON CONFLICT (code) DO NOTHING;

-- ─── Role → Permission Matrix ─────────────────────────────────────────────────

-- org_admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 'a0000000-0000-0000-000c-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- bid_manager
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 'a0000000-0000-0000-000c-000000000002', id FROM permissions
  WHERE code IN (
    'tenders:view','tenders:create','tenders:edit',
    'proposals:view','proposals:create','proposals:edit','proposals:sign_off','proposals:export',
    'requirements:view','requirements:edit',
    'knowledge:view','knowledge:manage',
    'compliance:view','compliance:review',
    'team:view',
    'settings:view',
    'analytics:view'
  )
ON CONFLICT DO NOTHING;

-- solution_architect
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 'a0000000-0000-0000-000c-000000000003', id FROM permissions
  WHERE code IN (
    'tenders:view',
    'proposals:view','proposals:edit','proposals:export',
    'requirements:view','requirements:edit',
    'knowledge:view','knowledge:manage',
    'compliance:view',
    'team:view',
    'analytics:view'
  )
ON CONFLICT DO NOTHING;

-- compliance_officer
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 'a0000000-0000-0000-000c-000000000004', id FROM permissions
  WHERE code IN (
    'tenders:view',
    'proposals:view','proposals:sign_off','proposals:export',
    'requirements:view',
    'knowledge:view',
    'compliance:view','compliance:review',
    'team:view',
    'analytics:view'
  )
ON CONFLICT DO NOTHING;

-- domain_sme
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 'a0000000-0000-0000-000c-000000000005', id FROM permissions
  WHERE code IN (
    'tenders:view',
    'proposals:view','proposals:edit',
    'requirements:view',
    'knowledge:view',
    'compliance:view',
    'team:view'
  )
ON CONFLICT DO NOTHING;

-- executive_viewer: read-only
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 'a0000000-0000-0000-000c-000000000006', id FROM permissions
  WHERE code IN (
    'tenders:view',
    'proposals:view','proposals:export',
    'requirements:view',
    'knowledge:view',
    'compliance:view',
    'team:view',
    'analytics:view'
  )
ON CONFLICT DO NOTHING;

-- ─── Demo organization members (for org a0000000-0000-0000-0001-000000000001) ──
INSERT INTO organization_members (org_id, email, full_name, role_id, status, joined_at, avatar_initials) VALUES
  ('a0000000-0000-0000-0001-000000000001', 'ashan@lankatech.lk',   'Ashan Perera',          'a0000000-0000-0000-000c-000000000001', 'active', NOW() - INTERVAL '180 days', 'AP'),
  ('a0000000-0000-0000-0001-000000000001', 'nimali@lankatech.lk',  'Nimali Fernando',        'a0000000-0000-0000-000c-000000000002', 'active', NOW() - INTERVAL '150 days', 'NF'),
  ('a0000000-0000-0000-0001-000000000001', 'kasun@lankatech.lk',   'Kasun Rajapaksha',       'a0000000-0000-0000-000c-000000000003', 'active', NOW() - INTERVAL '120 days', 'KR'),
  ('a0000000-0000-0000-0001-000000000001', 'priya@lankatech.lk',   'Priya Gunawardena',      'a0000000-0000-0000-000c-000000000004', 'active', NOW() - INTERVAL '90 days',  'PG'),
  ('a0000000-0000-0000-0001-000000000001', 'dilshan@lankatech.lk', 'Dilshan Mendis',         'a0000000-0000-0000-000c-000000000005', 'active', NOW() - INTERVAL '60 days',  'DM'),
  ('a0000000-0000-0000-0001-000000000001', 'sanjay@lankatech.lk',  'Sanjay Wickramasinghe', 'a0000000-0000-0000-000c-000000000006', 'invited', NULL,                      'SW')
ON CONFLICT (org_id, email) DO NOTHING;
