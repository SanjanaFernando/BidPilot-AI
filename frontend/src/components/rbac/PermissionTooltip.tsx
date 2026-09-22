"use client";

/**
 * PermissionTooltip — Wraps a disabled control with an informative tooltip
 * explaining which role or permission is required.
 *
 * Usage:
 *   <PermissionTooltip requiredPermission="proposals:sign_off" requiredRole="Bid Manager">
 *     <button disabled>Human Sign-Off</button>
 *   </PermissionTooltip>
 */

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { getRoleDefinition, type PermissionCode, type RoleName } from "@/lib/rbac";

interface PermissionTooltipProps {
  /** The permission code required (for display in tooltip) */
  requiredPermission?: PermissionCode;
  /** Human-readable role name(s) that have this permission */
  requiredRole?: string | RoleName[];
  /** Custom tooltip message override */
  message?: string;
  children: React.ReactNode;
}

export default function PermissionTooltip({
  requiredPermission,
  requiredRole,
  message,
  children,
}: PermissionTooltipProps) {
  const [visible, setVisible] = useState(false);

  const roleText = Array.isArray(requiredRole)
    ? requiredRole
        .map((r) => getRoleDefinition(r).displayName)
        .join(" or ")
    : requiredRole;

  const tooltipMsg =
    message ??
    (roleText
      ? `Requires the ${roleText} role.`
      : requiredPermission
      ? `Requires permission: ${requiredPermission}`
      : "You don't have permission for this action.");

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Render children with pointer-events disabled */}
      <div style={{ pointerEvents: "none", opacity: 0.45 }}>{children}</div>

      {/* Lock overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "not-allowed",
          zIndex: 1,
        }}
      />

      {/* Tooltip */}
      {visible && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1E252D",
            color: "#fff",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "11px",
            lineHeight: "1.5",
            whiteSpace: "nowrap",
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Lock size={11} style={{ flexShrink: 0, color: "#DDA625" }} />
            <span>{tooltipMsg}</span>
          </div>
          {/* Tooltip arrow */}
          <div
            style={{
              position: "absolute",
              bottom: "-5px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #1E252D",
            }}
          />
        </div>
      )}
    </div>
  );
}
