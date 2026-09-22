"use client";

/**
 * RbacGuard — Conditional rendering based on role/permission.
 *
 * Usage (hide entirely):
 *   <RbacGuard permission="proposals:sign_off">
 *     <SignOffButton />
 *   </RbacGuard>
 *
 * Usage (render disabled fallback):
 *   <RbacGuard permission="proposals:sign_off" fallback={<DisabledButton />}>
 *     <SignOffButton />
 *   </RbacGuard>
 *
 * Usage (role gate):
 *   <RbacGuard roles={["org_admin", "bid_manager"]}>
 *     <DangerZone />
 *   </RbacGuard>
 */

import React from "react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { PermissionCode, RoleName } from "@/lib/rbac";

interface RbacGuardProps {
  /** Required permission code — user must have this */
  permission?: PermissionCode;
  /** Required role(s) — user must have at least one */
  roles?: RoleName[];
  /** Element to render when access is denied. If omitted, nothing is rendered. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function RbacGuard({
  permission,
  roles,
  fallback = null,
  children,
}: RbacGuardProps) {
  const { hasPermission, hasRole, isLoading } = useUserPermissions();

  if (isLoading) return null;

  const permOk = permission ? hasPermission(permission) : true;
  const roleOk = roles ? hasRole(roles) : true;

  if (permOk && roleOk) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

export { RbacGuard };

