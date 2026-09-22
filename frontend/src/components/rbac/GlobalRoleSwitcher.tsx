"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ROLES, ROLE_LIST, RoleName } from "@/lib/rbac";
import { Shield, ChevronDown, ChevronUp, Users, ExternalLink, Check, Sparkles } from "lucide-react";

export default function GlobalRoleSwitcher() {
  const { role, roleDef, permissions, fullName, switchDemoRole, isDemo } =
    useUserPermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #1E252D 0%, #2A3441 100%)",
        borderBottom: "1px solid rgba(221, 166, 37, 0.3)",
        color: "#fff",
        fontSize: "12px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMinimized ? "4px 16px" : "6px 16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Persona Label & Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(221, 166, 37, 0.15)",
              border: "1px solid rgba(221, 166, 37, 0.35)",
              borderRadius: "4px",
              padding: "2px 7px",
              color: "#DDA625",
              fontWeight: 700,
              fontSize: "10.5px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <Sparkles size={11} />
            <span>RBAC Persona Simulator</span>
          </div>

          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>|</span>

          {/* Current Persona Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "11.5px" }}>
              Active Persona:
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: roleDef.color,
                color: roleDef.textColor,
                padding: "2px 8px",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "11px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              <span>{roleDef.icon}</span>
              <span>{roleDef.displayName}</span>
              <span style={{ opacity: 0.8, fontWeight: 400 }}>({fullName})</span>
            </span>
          </div>

          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              display: isMinimized ? "none" : "inline",
            }}
          >
            • {permissions.length} actions authorized
          </span>
        </div>

        {/* Center / Right: Quick Role Pills */}
        {!isMinimized && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexWrap: "wrap",
            }}
          >
            {ROLE_LIST.map((r) => {
              const isActive = r.name === role;
              return (
                <button
                  key={r.name}
                  onClick={() => switchDemoRole(r.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    border: isActive
                      ? `1.5px solid ${r.color}`
                      : "1px solid rgba(255,255,255,0.12)",
                    background: isActive
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(255,255,255,0.04)",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
                    transition: "all 0.15s ease",
                  }}
                  title={r.description}
                >
                  <span>{r.icon}</span>
                  <span>{r.displayName}</span>
                  {isActive && <Check size={11} style={{ color: "#22C55E" }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Right Tools: Matrix Link & Minimize */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href="/settings/team"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#DDA625",
              fontSize: "11px",
              fontWeight: 600,
              textDecoration: "none",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(221,166,37,0.1)",
            }}
          >
            <Users size={12} />
            <span>Team & Matrix</span>
            <ExternalLink size={10} />
          </Link>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              padding: "3px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isMinimized ? "Expand role simulator" : "Minimize role simulator"}
          >
            {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
