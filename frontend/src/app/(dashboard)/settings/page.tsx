"use client";

import { useState } from "react";
import Link from "next/link";
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
    { id: "governance", label: "Knowledge Governance (Phase 13)", icon: <ShieldCheck size={14} /> },
    { id: "audit", label: "Cryptographic Audit (Phase 14)", icon: <Database size={14} /> },
    { id: "webhooks", label: "Webhooks & Alerts (Phase 15)", icon: <Server size={14} /> },
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

            {/* Phase 13: Secret Scrubbing & Knowledge Governance */}
            <Card className="border-[#E2E8F0] bg-white" id="governance">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D] flex items-center gap-2">
                    <ShieldCheck size={16} className="text-rose-700" />
                    Knowledge Governance & Secret Scrubber (Phase 13)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Automated pre-embedding PII redaction, salary confidentiality, and clearance tiers
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-800 mb-2">Live Secret & PII Detection Engine Tester</div>
                  <div className="space-y-3">
                    <textarea
                      id="scanner-input"
                      rows={3}
                      placeholder="Paste test text containing API keys (e.g. sk-proj...), passwords, internal salary ($120k/yr), or NIC numbers..."
                      defaultValue="Internal lead salary: $150,000/yr. Secret AWS access key: AKIAIOSFODNN7EXAMPLE. Sri Lankan NIC: 199012345678."
                      className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-700"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          const el = document.getElementById("scanner-input") as HTMLTextAreaElement;
                          const resEl = document.getElementById("scanner-result");
                          if (!el || !resEl) return;
                          resEl.innerText = "Scanning text...";
                          try {
                            const { scanSecrets } = await import("@/lib/ai-service");
                            const res = await scanSecrets(el.value);
                            resEl.innerHTML = `<strong>Findings (${res.findings_count}):</strong> ${res.findings.map(f => `<span class="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[11px]">${f.type}</span>`).join(" ")}<br/><br/><strong>Sanitized Preview:</strong><div class="mt-1 p-2 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded">${res.scrubbed_preview}</div>`;
                          } catch (e: any) {
                            resEl.innerText = "Scan failed: " + e.message;
                          }
                        }}
                        className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
                      >
                        Run Scrubbing Scan
                      </Button>
                    </div>
                    <div id="scanner-result" className="text-xs text-slate-700 mt-2 p-3 bg-white border border-slate-200 rounded-lg min-h-[40px]">
                      Click &quot;Run Scrubbing Scan&quot; to test the automated regex redaction engine.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase 14: Cryptographic Audit Trail */}
            <Card className="border-[#E2E8F0] bg-white" id="audit">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D] flex items-center gap-2">
                    <Database size={16} className="text-emerald-700" />
                    Cryptographic Audit Trail & E-Signatures (Phase 14)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Immutable SHA-256 hash chaining and official proposal signature ledger
                  </CardDescription>
                </div>
                <Link href="/verify" target="_blank">
                  <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-slate-300 text-slate-700">
                    Open Public Verify Portal ↗
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" /> SHA-256 Audit Chain Verification
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Cryptographically validates that no log events or proposal sign-offs were modified or deleted.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const resEl = document.getElementById("chain-result");
                      if (!resEl) return;
                      resEl.innerText = "Verifying hash chain...";
                      try {
                        const { verifyAuditChain } = await import("@/lib/ai-service");
                        const res = await verifyAuditChain("a0000000-0000-0000-0001-000000000001");
                        resEl.innerHTML = `<span class="font-bold text-emerald-700">✓ ${res.status}:</span> ${res.message} <br/><span class="text-[11px] font-mono text-slate-500">Latest Hash: ${res.latest_hash}</span>`;
                      } catch (e: any) {
                        resEl.innerText = "Verification failed: " + e.message;
                      }
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shrink-0"
                  >
                    Verify Chain Integrity
                  </Button>
                </div>
                <div id="chain-result" className="text-xs text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  Click &quot;Verify Chain Integrity&quot; to compute live sequential hashes across all audit events.
                </div>
              </CardContent>
            </Card>

            {/* Phase 15: Webhooks & External ERP Intake */}
            <Card className="border-[#E2E8F0] bg-white" id="webhooks">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <div>
                  <CardTitle className="text-sm font-bold text-[#1E252D] flex items-center gap-2">
                    <Server size={16} className="text-sky-700" />
                    Webhooks & External RFP Intake (Phase 15)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Slack/Teams outbound alerts and secure inbound ERP/CRM tender intake webhook
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* Outbound Webhook Test */}
                <div className="space-y-3 border-b border-slate-200 pb-4">
                  <Label className="text-xs font-semibold text-slate-800">Slack / Teams Outbound Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-url-input"
                      placeholder="https://hooks.slack.com/services/..."
                      defaultValue="https://hooks.slack.com/services/T00000000/B00000000/XXXXX"
                      className="text-xs font-mono bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        const input = document.getElementById("webhook-url-input") as HTMLInputElement;
                        const statusEl = document.getElementById("webhook-status");
                        if (!statusEl) return;
                        statusEl.innerText = "Dispatching test notification payload...";
                        try {
                          const { testWebhookDispatch } = await import("@/lib/ai-service");
                          await testWebhookDispatch({
                            webhook_url: input?.value || "",
                            service_type: "slack",
                            title: "BidPilot Test Alert",
                            message: "Test webhook broadcast from BidPilot AI Multi-Agent RFP System.",
                          });
                          statusEl.innerText = "✓ Test alert dispatched successfully to webhook.";
                        } catch (e: any) {
                          statusEl.innerText = "Notice: Test payload generated. (Live webhook requires valid external URL: " + e.message + ")";
                        }
                      }}
                      className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold shrink-0"
                    >
                      Test Dispatch
                    </Button>
                  </div>
                  <div id="webhook-status" className="text-[11px] text-slate-500" />
                </div>

                {/* Inbound Webhook Endpoint */}
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-sky-400">External RFP Intake API Endpoint (Inbound)</div>
                  <div className="font-mono text-xs text-amber-300 bg-slate-950 p-2 rounded border border-slate-800">
                    POST http://localhost:8000/webhooks/tenders/ingest
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Header: <code className="text-emerald-400 font-mono">X-BidPilot-Webhook-Key: bidpilot_secret_ingest_key_2026</code>
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
                      <option>Google Gemini 2.5 Flash Free Tier</option>
                      <option>Hugging Face API</option>
                      <option>Custom Endpoint</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1E252D]">Active Model</Label>
                    <select className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none">
                      <option>gemini-2.5-flash</option>
                      <option>llama3.2:3b</option>
                      <option>mistral:7b</option>
                      <option>gemma2:9b</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-[#1E252D]">Embedding Model</Label>
                    <select className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none">
                      <option>text-embedding-004 (768 dimensions)</option>
                      <option>nomic-embed-text (Local, 768 dimensions)</option>
                      <option>all-minilm-l6-v2</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-md border border-[#BBF7D0] bg-[#DCFCE7] p-3.5">
                  <CheckCircle2 size={16} className="flex-shrink-0 text-[#15803D]" />
                  <span className="text-xs font-semibold text-[#15803D]">
                    AI backend operational · Free-Tier local & governed RAG pipeline active with zero external API
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

