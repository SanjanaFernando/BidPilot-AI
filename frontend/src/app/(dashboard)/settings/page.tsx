"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { mockOrg, mockUser } from "@/lib/mock-data";
import {
  Building2,
  User,
  Key,
  Cpu,
  Save,
  CheckCircle2,
  Settings,
  Database,
  RefreshCw,
  Server,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState(
    isSupabaseConfigured
      ? "Connected to Supabase PostgreSQL & pgvector"
      : "Operating in Persistent Local Knowledge Base Mode (Phase 3 Active)"
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const sections = [
    { id: "database", label: "Database & Cloud (Phase 2)", icon: <Database size={14} /> },
    { id: "rbac", label: "Team & RBAC (Phase 12)", icon: <ShieldCheck size={14} /> },
    { id: "organization", label: "Organisation Profile", icon: <Building2 size={14} /> },
    { id: "profile", label: "User Account", icon: <User size={14} /> },
    { id: "ai", label: "AI Engine Configuration", icon: <Cpu size={14} /> },
  ];

  function handleSave() {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  }

  function handleResetSeed() {
    if (
      confirm(
        "Reset local knowledge base and tenders back to the initial LankaTech Solutions demo seed dataset?"
      )
    ) {
      localStorage.removeItem("bidpilot_kb_projects");
      localStorage.removeItem("bidpilot_kb_employees");
      localStorage.removeItem("bidpilot_kb_technologies");
      localStorage.removeItem("bidpilot_kb_certifications");
      localStorage.removeItem("bidpilot_tenders");
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <Topbar title="Settings" breadcrumb={["BidPilot AI", "Settings"]} />

      {/* Page Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[#7A1C2C]" />
          <div>
            <h2 className="text-base font-bold text-[#1E252D]">System &amp; Workspace Settings</h2>
            <p className="text-xs text-[#64748B]">
              Configure database connection, organization credentials, and local AI model pipelines
            </p>
          </div>
        </div>
      </div>

      <main className="px-7">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[220px_1fr]">
          {/* Settings Nav */}
          <Card className="space-y-1 border-[#E2E8F0] bg-white p-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-2.5 rounded px-3 py-2 text-xs font-semibold transition-colors ${
                  i === 0 ? "bg-[#7A1C2C] text-white" : "text-[#1E252D] hover:bg-[#F1F5F9]"
                }`}
              >
                {s.icon} {s.label}
              </a>
            ))}
          </Card>

          {/* Forms Area */}
          <div className="space-y-6">
            {/* Database & Cloud Integration (Phase 2 & 3) */}
            <Card className="border-[#E2E8F0] bg-white" id="database">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D]">
                    Database &amp; Multi-Tenant Cloud Architecture (Phase 2 &amp; 3)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    PostgreSQL, Supabase RLS, and pgvector embedding storage
                  </CardDescription>
                </div>
                <Button
                  onClick={handleResetSeed}
                  variant="outline"
                  className="h-8 gap-1.5 px-3 text-xs font-semibold text-[#7A1C2C] hover:bg-[#FDF3DA]"
                >
                  <RefreshCw size={12} /> Reload Seed Data
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div
                  className={`flex items-start gap-3 rounded-lg border p-4 ${
                    isSupabaseConfigured
                      ? "border-[#BBF7D0] bg-[#DCFCE7]/40"
                      : "border-[#E2E8F0] bg-[#F8FAFC]"
                  }`}
                >
                  <Server
                    size={20}
                    className={isSupabaseConfigured ? "text-[#15803D]" : "text-[#7A1C2C]"}
                  />
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-[#1E252D]">
                      Status:{" "}
                      <span className={isSupabaseConfigured ? "text-[#15803D]" : "text-[#B45309]"}>
                        {isSupabaseConfigured ? "Live Supabase Connected" : "Local Fallback Active"}
                      </span>
                    </div>
                    <p className="leading-relaxed text-[#64748B]">
                      {isSupabaseConfigured
                        ? "Frontend is communicating directly with your remote Supabase PostgreSQL database and vector tables."
                        : "Frontend is using the persistent local knowledge service preloaded with LankaTech Solutions (Pvt) Ltd seed data. To connect your live Supabase project, provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">
                      Supabase Project URL
                    </Label>
                    <Input
                      readOnly
                      defaultValue={
                        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co"
                      }
                      className="border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs text-[#64748B]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">
                      Vector Store Dimensions
                    </Label>
                    <Input
                      readOnly
                      defaultValue="768 (nomic-embed-text / bge-base)"
                      className="border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs text-[#64748B]"
                    />
                  </div>
                </div>

                <div className="rounded border border-[#E2E8F0] p-3 text-xs text-[#64748B]">
                  <strong className="text-[#1E252D]">Schema Status:</strong> 22 tables defined in{" "}
                  <code>database/schema.sql</code> + <code>phase12_rbac_migration.sql</code> · Row Level Security configured in{" "}
                  <code>database/rls_policies.sql</code>.
                </div>
              </CardContent>
            </Card>

            {/* Team & RBAC Management (Phase 12) */}
            <Card className="border-[#E2E8F0] bg-white" id="rbac">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D] flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#7A1C2C]" />
                    Team &amp; Access Control (Phase 12 RBAC)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Enterprise 6-role hierarchy, granular permissions, live persona switcher, and section locking
                  </CardDescription>
                </div>
                <a
                  href="/settings/team"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]"
                >
                  Open Team &amp; RBAC Control Center →
                </a>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Configured Roles
                    </div>
                    <div className="text-lg font-bold text-[#1E252D] mt-1">6 Enterprise Roles</div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Admin, Bid Manager, Solution Architect, Compliance, SME, Executive
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Granular Gates
                    </div>
                    <div className="text-lg font-bold text-[#1E252D] mt-1">24 Action Codes</div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Tenders, AI pipeline, sign-off, knowledge RAG, audit
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Concurrency Engine
                    </div>
                    <div className="text-lg font-bold text-emerald-700 mt-1">Optimistic Locking</div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Section-level lock expiration &amp; collaborator tracking
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/60 p-3.5">
                  <div className="text-xs text-amber-900">
                    <strong>Phase 12 Live Simulation:</strong> Switch between simulated user personas or manage team rosters in the full control center.
                  </div>
                  <a
                    href="/settings/team"
                    className="text-xs font-bold text-[#7A1C2C] underline hover:text-[#631724]"
                  >
                    Manage Roster &amp; Matrix
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Organisation Profile */}
            <Card className="border-[#E2E8F0] bg-white" id="organization">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D]">
                    Organisation Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Primary details used in proposal executive summaries and legal bids
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSave}
                  className="h-8 gap-1.5 bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]"
                >
                  <Save size={12} /> Save Changes
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-[#1E252D]">
                      Registered Organisation Name
                    </Label>
                    <Input
                      defaultValue={mockOrg.name}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-[#1E252D]">
                      Corporate Tagline / Value Proposition
                    </Label>
                    <Input
                      defaultValue={mockOrg.tagline}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">
                      Country of Operation
                    </Label>
                    <select className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none">
                      <option>Sri Lanka</option>
                      <option>India</option>
                      <option>Singapore</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">Active Plan</Label>
                    <Input
                      defaultValue={mockOrg.plan}
                      readOnly
                      className="border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Account */}
            <Card className="border-[#E2E8F0] bg-white" id="profile">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D]">User Account</CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Authenticated profile credentials
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSave}
                  className="h-8 gap-1.5 bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]"
                >
                  <Save size={12} /> Save Changes
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
                  <Avatar className="h-10 w-10 bg-[#7A1C2C] text-sm font-bold text-white">
                    <AvatarFallback className="bg-[#7A1C2C] text-white">
                      {mockUser.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xs font-bold text-[#1E252D]">{mockUser.name}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {mockUser.role} · {mockUser.email}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">Full Name</Label>
                    <Input
                      defaultValue={mockUser.name}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">Designation</Label>
                    <Input
                      defaultValue={mockUser.role}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-[#1E252D]">Email Address</Label>
                    <Input
                      type="email"
                      defaultValue={mockUser.email}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Engine */}
            <Card className="border-[#E2E8F0] bg-white" id="ai">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D]">
                    AI Engine Configuration
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Multi-agent orchestrator and local inference settings
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSave}
                  className="h-8 gap-1.5 bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]"
                >
                  <Save size={12} /> Save Changes
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">
                      LLM Inference Provider
                    </Label>
                    <select className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none">
                      <option>Ollama (Local $0 cost)</option>
                      <option>Hugging Face API</option>
                      <option>Custom Endpoint</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">Active Model</Label>
                    <select className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none">
                      <option>llama3.2:3b</option>
                      <option>mistral:7b</option>
                      <option>gemma2:9b</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-[#1E252D]">Embedding Model</Label>
                    <select className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none">
                      <option>nomic-embed-text (Local, 768 dimensions)</option>
                      <option>all-minilm-l6-v2</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-md border border-[#BBF7D0] bg-[#DCFCE7] p-3.5">
                  <CheckCircle2 size={16} className="flex-shrink-0 text-[#15803D]" />
                  <span className="text-xs font-semibold text-[#15803D]">
                    Ollama backend operational · Local RAG pipeline active with zero external API
                    fees
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
