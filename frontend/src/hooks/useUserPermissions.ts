"use client";

/**
 * BidPilot AI — Phase 12: useUserPermissions() Hook
 *
 * Returns the current user's role and permissions.
 * - When Supabase is connected with real auth: reads from JWT session app_metadata
 * - Dev / simulation fallback: reads active role from localStorage ("bidpilot_demo_role")
 * - Cross-component synchronization: uses CustomEvents so switching roles immediately
 *   updates all components and persists across page reloads.
 *
 * Usage:
 *   const { role, permissions, hasPermission, hasRole, switchDemoRole, isLoading } = useUserPermissions();
 *   if (hasPermission("proposals:sign_off")) { ... }
 */

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  RoleName,
  PermissionCode,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  getRoleDefinition,
  type RoleDefinition,
} from "@/lib/rbac";

export const DEMO_ROLE_STORAGE_KEY = "bidpilot_demo_role";

// ─── Demo Personas mapped to the 6 Enterprise Roles ─────────────────────────
export const DEMO_PERSONAS: Record<
  RoleName,
  { id: string; full_name: string; email: string; org_id: string; avatar: string }
> = {
  org_admin: {
    id: "u0000000-0000-0000-0001-000000000001",
    full_name: "Ashan Perera",
    email: "ashan@lankatech.lk",
    org_id: "a0000000-0000-0000-0001-000000000001",
    avatar: "AP",
  },
  bid_manager: {
    id: "u0000000-0000-0000-0001-000000000002",
    full_name: "Nimali Fernando",
    email: "nimali@lankatech.lk",
    org_id: "a0000000-0000-0000-0001-000000000001",
    avatar: "NF",
  },
  solution_architect: {
    id: "u0000000-0000-0000-0001-000000000003",
    full_name: "Kasun Rajapaksha",
    email: "kasun@lankatech.lk",
    org_id: "a0000000-0000-0000-0001-000000000001",
    avatar: "KR",
  },
  compliance_officer: {
    id: "u0000000-0000-0000-0001-000000000004",
    full_name: "Priya Gunawardena",
    email: "priya@lankatech.lk",
    org_id: "a0000000-0000-0000-0001-000000000001",
    avatar: "PG",
  },
  domain_sme: {
    id: "u0000000-0000-0000-0001-000000000005",
    full_name: "Dilshan Mendis",
    email: "dilshan@lankatech.lk",
    org_id: "a0000000-0000-0000-0001-000000000001",
    avatar: "DM",
  },
  executive_viewer: {
    id: "u0000000-0000-0000-0001-000000000006",
    full_name: "Sanjay Wickramasinghe",
    email: "sanjay@lankatech.lk",
    org_id: "a0000000-0000-0000-0001-000000000001",
    avatar: "SW",
  },
};

const DEFAULT_DEMO_ROLE: RoleName = "org_admin";

function getStoredDemoRole(): RoleName {
  if (typeof window === "undefined") return DEFAULT_DEMO_ROLE;
  try {
    const saved = localStorage.getItem(DEMO_ROLE_STORAGE_KEY) as RoleName | null;
    if (saved && saved in DEMO_PERSONAS) {
      return saved;
    }
  } catch {
    // Ignore localStorage errors in SSR / private mode
  }
  return DEFAULT_DEMO_ROLE;
}

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UserPermissionsState {
  /** Resolved role name (e.g. "org_admin", "bid_manager") */
  role: RoleName;
  /** Rich role definition with display name, color, icon */
  roleDef: RoleDefinition;
  /** Flat array of permission codes the user holds */
  permissions: PermissionCode[];
  /** User identity fields */
  userId: string;
  orgId: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  /** True while the session is being resolved */
  isLoading: boolean;
  /** True when running in dev/demo mode */
  isDemo: boolean;
  /** Check a single permission code */
  hasPermission: (code: PermissionCode) => boolean;
  /** Check if user has any of the listed roles */
  hasRole: (roles: RoleName[]) => boolean;
  /** Switch demo persona role (for dev/simulation) - persists in localStorage */
  switchDemoRole: (newRole: RoleName) => void;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

export function useUserPermissions(): UserPermissionsState {
  const [role, setRole] = useState<RoleName>(DEFAULT_DEMO_ROLE);
  const [permissions, setPermissions] = useState<PermissionCode[]>(
    ROLE_PERMISSIONS[DEFAULT_DEMO_ROLE] ?? ALL_PERMISSIONS
  );
  const [userId, setUserId] = useState(DEMO_PERSONAS[DEFAULT_DEMO_ROLE].id);
  const [orgId, setOrgId] = useState(DEMO_PERSONAS[DEFAULT_DEMO_ROLE].org_id);
  const [fullName, setFullName] = useState(DEMO_PERSONAS[DEFAULT_DEMO_ROLE].full_name);
  const [email, setEmail] = useState(DEMO_PERSONAS[DEFAULT_DEMO_ROLE].email);
  const [avatarInitials, setAvatarInitials] = useState(DEMO_PERSONAS[DEFAULT_DEMO_ROLE].avatar);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);

  const applyRole = useCallback((newRole: RoleName) => {
    const persona = DEMO_PERSONAS[newRole] ?? DEMO_PERSONAS[DEFAULT_DEMO_ROLE];
    setRole(newRole);
    setPermissions(ROLE_PERMISSIONS[newRole] ?? []);
    setUserId(persona.id);
    setOrgId(persona.org_id);
    setFullName(persona.full_name);
    setEmail(persona.email);
    setAvatarInitials(persona.avatar);
  }, []);

  useEffect(() => {
    // Initial sync from localStorage
    const savedRole = getStoredDemoRole();
    applyRole(savedRole);

    async function resolvePermissions() {
      if (!isSupabaseConfigured || !supabase) {
        setIsDemo(true);
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Not authenticated — fall back to demo role from localStorage
          const currentSaved = getStoredDemoRole();
          applyRole(currentSaved);
          setIsDemo(true);
          setIsLoading(false);
          return;
        }

        // Real auth: extract from JWT app_metadata
        const appMeta = session.user.app_metadata ?? {};
        const userMeta = session.user.user_metadata ?? {};

        // If user manually switched demo role during dev, honor it if appMeta.role is not present
        const resolvedRole: RoleName =
          (appMeta.role as RoleName) ?? getStoredDemoRole();
        const resolvedPermissions: PermissionCode[] =
          (appMeta.permissions as PermissionCode[]) ??
          ROLE_PERMISSIONS[resolvedRole] ??
          [];
        const resolvedOrgId: string =
          appMeta.org_id ?? appMeta.organization_id ?? DEMO_PERSONAS.org_admin.org_id;

        const resolvedName: string =
          userMeta.full_name ?? session.user.email ?? "User";
        const initials = resolvedName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        setRole(resolvedRole);
        setPermissions(resolvedPermissions);
        setUserId(session.user.id);
        setOrgId(resolvedOrgId);
        setFullName(resolvedName);
        setEmail(session.user.email ?? "");
        setAvatarInitials(initials);
        setIsDemo(false);
      } catch {
        setIsDemo(true);
      } finally {
        setIsLoading(false);
      }
    }

    resolvePermissions();

    // Listen for custom role change events across components
    const handleRoleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<RoleName>;
      if (customEvent.detail && customEvent.detail in DEMO_PERSONAS) {
        applyRole(customEvent.detail);
      }
    };

    // Listen for cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DEMO_ROLE_STORAGE_KEY && e.newValue && e.newValue in DEMO_PERSONAS) {
        applyRole(e.newValue as RoleName);
      }
    };

    window.addEventListener("bidpilot:role_changed", handleRoleChanged);
    window.addEventListener("storage", handleStorageChange);

    // Listen for Supabase auth state changes
    let unsubscribeAuth: (() => void) | undefined;
    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(() => {
        resolvePermissions();
      });
      unsubscribeAuth = () => listener.subscription.unsubscribe();
    }

    return () => {
      window.removeEventListener("bidpilot:role_changed", handleRoleChanged);
      window.removeEventListener("storage", handleStorageChange);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [applyRole]);

  const hasPermission = useCallback(
    (code: PermissionCode) => permissions.includes(code),
    [permissions]
  );

  const hasRole = useCallback(
    (roles: RoleName[]) => roles.includes(role),
    [role]
  );

  const switchDemoRole = useCallback(
    (newRole: RoleName) => {
      try {
        localStorage.setItem(DEMO_ROLE_STORAGE_KEY, newRole);
      } catch {
        // Ignore
      }
      applyRole(newRole);
      // Broadcast to all other mounted hooks / components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bidpilot:role_changed", { detail: newRole })
        );
      }
    },
    [applyRole]
  );

  return {
    role,
    roleDef: getRoleDefinition(role),
    permissions,
    userId,
    orgId,
    fullName,
    email,
    avatarInitials,
    isLoading,
    isDemo,
    hasPermission,
    hasRole,
    switchDemoRole,
  };
}
