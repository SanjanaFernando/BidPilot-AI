"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  FileText,
  Database,
  Users,
  Cpu,
  Award,
  FileEdit,
  Settings,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const NAV = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tenders", label: "Tenders / RFPs", icon: FileText },
    ],
  },
  {
    label: "Knowledge Base",
    items: [
      { href: "/knowledge/projects", label: "Projects", icon: Database },
      { href: "/knowledge/employees", label: "Personnel", icon: Users },
      { href: "/knowledge/technologies", label: "Technologies", icon: Cpu },
      { href: "/knowledge/certifications", label: "Certifications", icon: Award },
      { href: "/knowledge/search", label: "RAG Search Lab", icon: Sparkles },
    ],
  },
  {
    label: "Proposals",
    items: [
      { href: "/proposals/TND-001", label: "Proposal Editor", icon: FileEdit },
      { href: "/tenders", label: "Compliance Check", icon: ShieldCheck },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside className="gov-sidebar">
      {/* Branding */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.22)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Crest */}
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "var(--gov-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 800,
              color: "var(--gov-text-main)",
              flexShrink: 0,
            }}
          >
            BP
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "13.5px", lineHeight: 1.2 }}>
              BidPilot AI
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10.5px" }}>
              Proposal Platform
            </div>
          </div>
        </div>
        <div style={{ padding: "7px 16px 9px", background: "rgba(0,0,0,0.14)" }}>
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "9.5px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
            }}
          >
            Organisation
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "12px",
              fontWeight: 500,
              marginTop: "2px",
            }}
          >
            LankaTech Solutions
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "4px 0 8px", overflowY: "auto" }}>
        {NAV.map((section) => (
          <div key={section.label}>
            <div className="section-heading">{section.label}</div>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} className={`gov-nav-item ${active ? "active" : ""}`}>
                  <Icon size={14} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Storage Mode Badge */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link
          href="/settings"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "10.5px",
            color: "rgba(255,255,255,0.6)",
            textDecoration: "none",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22C55E",
              }}
            />
            Phase 11 — Completed
          </span>
          <span style={{ fontSize: "9.5px", opacity: 0.6 }}>v1.0</span>
        </Link>
      </div>

      {/* User footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "11px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--gov-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--gov-text-main)",
              flexShrink: 0,
            }}
          >
            AP
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Ashan Perera
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10.5px" }}>
              Proposal Manager
            </div>
          </div>
          <Link
            href="/settings"
            style={{ color: "rgba(255,255,255,0.35)", display: "flex", flexShrink: 0 }}
          >
            <Settings size={13} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
