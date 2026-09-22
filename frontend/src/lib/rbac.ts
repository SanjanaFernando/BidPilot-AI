/**
 * BidPilot AI — Phase 12 RBAC Definitions & Utilities
 * Client-side role/permission constants and helper functions.
 */

// ─── Role Definitions ────────────────────────────────────────────────────────

export type RoleName =
  | "org_admin"
  | "bid_manager"
  | "solution_architect"
  | "compliance_officer"
  | "domain_sme"
  | "executive_viewer";

export interface RoleDefinition {
  name: RoleName;
  displayName: string;
  description: string;
  color: string;          // Hex badge background
  textColor: string;      // Hex badge text
  icon: string;           // Emoji icon for quick visual
}

export const ROLES: Record<RoleName, RoleDefinition> = {
  org_admin: {
    name: "org_admin",
    displayName: "Org Admin",
    description: "Organization-wide administration, user provisioning, and billing.",
    color: "#7A1C2C",
    textColor: "#FFFFFF",
    icon: "🛡️",
  },
  bid_manager: {
    name: "bid_manager",
    displayName: "Bid Manager",
    description: "Full RFP lifecycle: tender creation, AI pipelines, sign-off, and export.",
    color: "#1D4ED8",
    textColor: "#FFFFFF",
    icon: "📋",
  },
  solution_architect: {
    name: "solution_architect",
    displayName: "Solution Architect",
    description: "Technical sections authoring, claim verification, and architecture review.",
    color: "#0F766E",
    textColor: "#FFFFFF",
    icon: "⚙️",
  },
  compliance_officer: {
    name: "compliance_officer",
    displayName: "Compliance Officer",
    description: "Compliance matrix review, certification verification, and legal sign-off.",
    color: "#B45309",
    textColor: "#FFFFFF",
    icon: "⚖️",
  },
  domain_sme: {
    name: "domain_sme",
    displayName: "Domain SME",
    description: "Assigned section editing, evidence citations, and knowledge base contributions.",
    color: "#6D28D9",
    textColor: "#FFFFFF",
    icon: "🔬",
  },
  executive_viewer: {
    name: "executive_viewer",
    displayName: "Executive Viewer",
    description: "Read-only: proposal status, compliance scorecards, and audit streams.",
    color: "#374151",
    textColor: "#FFFFFF",
    icon: "👁️",
  },
};

export const ROLE_LIST: RoleDefinition[] = Object.values(ROLES);

// ─── Permission Codes ─────────────────────────────────────────────────────────

export type PermissionCode =
  | "tenders:create" | "tenders:edit" | "tenders:delete" | "tenders:view"
  | "tenders:assign_collaborators"
  | "agents:run" | "agents:view_results"
  | "proposals:create" | "proposals:edit_own" | "proposals:edit_any"
  | "proposals:approve_section" | "proposals:sign_off" | "proposals:export"
  | "proposals:view"
  | "requirements:view" | "requirements:edit"
  | "compliance:view" | "compliance:verify" | "compliance:sign_off"
  | "knowledge:view" | "knowledge:create" | "knowledge:edit"
  | "knowledge:delete" | "knowledge:ingest"
  | "team:view" | "team:manage"
  | "audit:view"
  | "settings:view" | "settings:edit";

/** All permissions for org_admin (used as demo fallback) */
export const ALL_PERMISSIONS: PermissionCode[] = [
  "tenders:create", "tenders:edit", "tenders:delete", "tenders:view",
  "tenders:assign_collaborators",
  "agents:run", "agents:view_results",
  "proposals:create", "proposals:edit_own", "proposals:edit_any",
  "proposals:approve_section", "proposals:sign_off", "proposals:export",
  "proposals:view",
  "requirements:view", "requirements:edit",
  "compliance:view", "compliance:verify", "compliance:sign_off",
  "knowledge:view", "knowledge:create", "knowledge:edit",
  "knowledge:delete", "knowledge:ingest",
  "team:view", "team:manage",
  "audit:view",
  "settings:view", "settings:edit",
];

/** Permissions granted per role — mirrors the DB seed */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionCode[]> = {
  org_admin: ALL_PERMISSIONS,
  bid_manager: [
    "tenders:create", "tenders:edit", "tenders:view", "tenders:assign_collaborators",
    "agents:run", "agents:view_results",
    "proposals:create", "proposals:edit_any", "proposals:approve_section",
    "proposals:sign_off", "proposals:export", "proposals:view",
    "requirements:view", "requirements:edit",
    "compliance:view",
    "knowledge:view", "knowledge:create", "knowledge:edit", "knowledge:ingest",
    "team:view", "audit:view", "settings:view",
  ],
  solution_architect: [
    "tenders:view",
    "agents:run", "agents:view_results",
    "proposals:edit_own", "proposals:view",
    "requirements:view", "requirements:edit",
    "compliance:view",
    "knowledge:view", "knowledge:create", "knowledge:edit", "knowledge:ingest",
    "team:view", "settings:view",
  ],
  compliance_officer: [
    "tenders:view", "agents:view_results",
    "proposals:view",
    "requirements:view",
    "compliance:view", "compliance:verify", "compliance:sign_off",
    "knowledge:view", "team:view", "audit:view", "settings:view",
  ],
  domain_sme: [
    "tenders:view", "agents:view_results",
    "proposals:edit_own", "proposals:view",
    "requirements:view", "compliance:view",
    "knowledge:view", "knowledge:create", "knowledge:edit",
    "team:view", "settings:view",
  ],
  executive_viewer: [
    "tenders:view", "agents:view_results",
    "proposals:view", "requirements:view", "compliance:view",
    "knowledge:view", "team:view", "audit:view", "settings:view",
  ],
};

// ─── Utility Functions ────────────────────────────────────────────────────────

export function hasPermission(
  userPermissions: string[],
  code: PermissionCode
): boolean {
  return userPermissions.includes(code);
}

export function hasRole(userRole: string, roles: RoleName[]): boolean {
  return roles.includes(userRole as RoleName);
}

export function getRoleDefinition(roleName: string): RoleDefinition {
  return ROLES[roleName as RoleName] ?? {
    name: roleName as RoleName,
    displayName: roleName,
    description: "",
    color: "#6B7280",
    textColor: "#FFFFFF",
    icon: "👤",
  };
}

export function getRoleBadgeStyle(roleName: string): React.CSSProperties {
  const def = getRoleDefinition(roleName);
  return {
    backgroundColor: def.color + "20",  // 12% opacity background
    color: def.color,
    border: `1px solid ${def.color}40`,
  };
}

/** Get initials from a full name for avatar display */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
