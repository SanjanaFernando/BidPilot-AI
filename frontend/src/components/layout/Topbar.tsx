"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, Search, Plus, ChevronRight } from "lucide-react";

import { useUserPermissions } from "@/hooks/useUserPermissions";

import { PermissionCode } from "@/lib/rbac";

interface TopbarProps {
  title: string;
  breadcrumb?: string[];
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    permission?: PermissionCode;
  };
}

export default function Topbar({ title, breadcrumb, action }: TopbarProps) {
  const { roleDef, fullName, avatarInitials, hasPermission } = useUserPermissions();

  // Auto-detect permission if not explicitly provided
  let isActionAllowed = true;
  if (action) {
    if (action.permission) {
      isActionAllowed = hasPermission(action.permission);
    } else if (action.label.toLowerCase().includes("tender")) {
      isActionAllowed = hasPermission("tenders:create");
    } else if (action.label.toLowerCase().includes("project") || action.label.toLowerCase().includes("employee") || action.label.toLowerCase().includes("tech") || action.label.toLowerCase().includes("cert")) {
      isActionAllowed = hasPermission("knowledge:create");
    }
  }

  return (
    <header className="gov-topbar">
      {/* Title / breadcrumb */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "1px" }}>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {i > 0 && <ChevronRight size={10} style={{ color: "var(--gov-text-muted)" }} />}
                <span style={{ fontSize: "11px", color: "var(--gov-text-muted)" }}>{crumb}</span>
              </span>
            ))}
          </div>
        )}
        <h1
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--gov-text-main)",
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Search */}
      <div style={{ position: "relative", width: "210px" }}>
        <Search
          size={13}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--gov-text-muted)",
            pointerEvents: "none",
          }}
        />
        <Input
          placeholder="Search…"
          className="h-8 pl-8 text-[13px]"
          style={{ background: "var(--background)" }}
        />
      </div>

      {/* Action */}
      {action &&
        (action.href && isActionAllowed ? (
          <Link href={action.href}>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-[#DDA625] font-semibold text-[#1E252D] hover:bg-[#C8951E] cursor-pointer"
            >
              <Plus size={13} />
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={!isActionAllowed}
            onClick={isActionAllowed ? action.onClick : undefined}
            title={
              !isActionAllowed
                ? `Action '${action.label}' disabled for ${roleDef.displayName}`
                : action.label
            }
            className={`gap-1.5 font-semibold text-[#1E252D] ${
              isActionAllowed
                ? "bg-[#DDA625] hover:bg-[#C8951E] cursor-pointer"
                : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-50 pointer-events-auto"
            }`}
          >
            <Plus size={13} />
            {action.label}
          </Button>
        ))}

      {/* Separator */}
      <Separator orientation="vertical" className="h-6" />

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative h-8 w-8">
        <Bell size={15} />
        <span
          style={{
            position: "absolute",
            top: "7px",
            right: "7px",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--gov-danger)",
            border: "1.5px solid white",
          }}
        />
      </Button>

      {/* Avatar with Role Tooltip */}
      <Link
        href="/settings/team"
        title={`${fullName} (${roleDef.displayName}) — Click to manage team & roles`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: roleDef.color || "var(--gov-maroon)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: roleDef.textColor || "#fff",
            fontSize: "10.5px",
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        >
          {avatarInitials}
        </div>
      </Link>
    </header>
  );
}
