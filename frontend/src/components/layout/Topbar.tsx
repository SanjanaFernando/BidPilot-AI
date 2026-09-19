"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, Search, Plus, ChevronRight } from "lucide-react";

interface TopbarProps {
  title: string;
  breadcrumb?: string[];
  action?: { label: string; href?: string; onClick?: () => void };
}

export default function Topbar({ title, breadcrumb, action }: TopbarProps) {
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
        (action.href ? (
          <Link href={action.href}>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-[#DDA625] font-semibold text-[#1E252D] hover:bg-[#C8951E]"
            >
              <Plus size={13} />
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={action.onClick}
            className="gap-1.5 bg-[#DDA625] font-semibold text-[#1E252D] hover:bg-[#C8951E]"
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

      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--gov-maroon)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "10.5px",
          fontWeight: 700,
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        AP
      </div>
    </header>
  );
}
