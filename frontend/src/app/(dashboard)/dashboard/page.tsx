"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockOrg } from "@/lib/mock-data";
import {
  FileText,
  Database,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Building2,
  Plus,
  Layers,
  Award,
  Users,
  Cpu,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  ProjectsService,
  EmployeesService,
  TechnologiesService,
  CertificationsService,
} from "@/lib/knowledge-service";
import { TendersService, TenderItem } from "@/lib/tenders-service";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function DashboardPage() {
  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [stats, setStats] = useState({
    projectsCount: 0,
    employeesCount: 0,
    techCount: 0,
    certsCount: 0,
    activeTenders: 0,
    avgCoverage: 0,
    totalRequirements: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [pList, eList, tList, cList, tendersList] = await Promise.all([
        ProjectsService.getAll(),
        EmployeesService.getAll(),
        TechnologiesService.getAll(),
        CertificationsService.getAll(),
        TendersService.getAll(),
      ]);

      setTenders(tendersList);

      const activeTendersList = tendersList.filter(
        (t) => t.status !== "Submitted" && t.status !== "Approved"
      );
      const coveredTenders = tendersList.filter((t) => t.coverage > 0);
      const avgCov = coveredTenders.length
        ? Math.round(coveredTenders.reduce((acc, t) => acc + t.coverage, 0) / coveredTenders.length)
        : 0;

      const totalReq = tendersList.reduce((acc, t) => acc + (t.requirements || 0), 0);

      setStats({
        projectsCount: pList.length,
        employeesCount: eList.length,
        techCount: tList.length,
        certsCount: cList.length,
        activeTenders: activeTendersList.length || tendersList.length,
        avgCoverage: avgCov,
        totalRequirements: totalReq,
      });
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalKnowledgeItems =
    stats.projectsCount + stats.employeesCount + stats.techCount + stats.certsCount;

  return (
    <div>
      <Topbar
        title="Dashboard"
        breadcrumb={["BidPilot AI", "Dashboard"]}
        action={{ label: "New Tender", href: "/tenders/new" }}
      />

      {/* Page header */}
      <div className="page-header flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--gov-text-main)" }}>
              {mockOrg.name}
            </h2>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                isSupabaseConfigured ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
              }`}
            >
              {isSupabaseConfigured ? "● Supabase Live" : "● Knowledge Storage (Phase 3 Active)"}
            </span>
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--gov-text-muted)", marginTop: "2px" }}>
            Proposal Management &amp; Knowledge Base Dashboard &mdash;{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/knowledge/projects">
            <Button variant="outline" size="sm" className="text-xs">
              Knowledge Repository
            </Button>
          </Link>
          <Link href="/tenders/new">
            <Button
              size="sm"
              className="gap-1.5 bg-[#7A1C2C] text-xs text-white hover:bg-[#631724]"
            >
              <Plus size={13} />
              Upload RFP
            </Button>
          </Link>
        </div>
      </div>

      <main style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: "22px" }}>
        {/* Alert strip */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 240,
              background: "var(--gov-warning-bg)",
              border: "1px solid oklch(0.88 0.06 60)",
              borderRadius: "7px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertTriangle size={15} style={{ color: "var(--gov-warning)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", color: "oklch(0.35 0.08 60)", flex: 1 }}>
              <strong>{stats.activeTenders} active tenders</strong> currently tracked in the
              pipeline.
            </p>
            <Link
              href="/tenders"
              style={{
                fontSize: "12px",
                color: "var(--gov-warning)",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              View All
            </Link>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 240,
              background: "var(--gov-success-bg)",
              border: "1px solid oklch(0.82 0.08 142)",
              borderRadius: "7px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <CheckCircle2 size={15} style={{ color: "var(--gov-success)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", color: "oklch(0.28 0.08 142)" }}>
              <strong>{totalKnowledgeItems} Verified Knowledge Entities</strong> available for AI
              evidence retrieval.
            </p>
          </div>
        </div>

        {/* KPI Grid */}
        <section>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--gov-text-muted)",
              marginBottom: "12px",
            }}
          >
            Key Metrics
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
              gap: "12px",
            }}
          >
            <StatCard
              label="Active Tenders"
              value={stats.activeTenders}
              subValue="In bidding pipeline"
              trend={{ value: `${tenders.length} total`, up: true }}
              accent="maroon"
            />
            <StatCard
              label="Company Knowledge Base"
              value={totalKnowledgeItems}
              subValue={`${stats.projectsCount} projects · ${stats.employeesCount} staff`}
              trend={{ value: `${stats.certsCount} certs`, up: true }}
              accent="gold"
            />
            <StatCard
              label="Unique Tech Capabilities"
              value={stats.techCount}
              subValue="Enterprise stacks"
              trend={{ value: "Verified", up: true }}
              accent="info"
            />
            <StatCard
              label="Avg. Req. Coverage"
              value={`${stats.avgCoverage}%`}
              subValue="Across active RFPs"
              trend={{ value: `${stats.totalRequirements} reqs`, up: true }}
              accent="success"
            />
          </div>
        </section>

        {/* Main content grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 290px",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {/* Tender register table */}
          <Card className="overflow-hidden rounded-lg">
            <CardHeader
              className="border-b px-5 py-3.5"
              style={{ borderColor: "var(--gov-border)" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <CardTitle className="text-sm font-bold" style={{ color: "var(--gov-text-main)" }}>
                  Active Tender Register ({tenders.length})
                </CardTitle>
                <Link
                  href="/tenders"
                  style={{
                    fontSize: "12px",
                    color: "var(--gov-maroon)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Ref.</th>
                    <th>Tender Name</th>
                    <th>Client</th>
                    <th style={{ textAlign: "right" }}>Value</th>
                    <th>Deadline</th>
                    <th style={{ textAlign: "right" }}>Coverage</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#64748B]">
                        Loading tenders from repository...
                      </td>
                    </tr>
                  ) : tenders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#64748B]">
                        No active tenders found. Click &quot;Upload RFP&quot; to start.
                      </td>
                    </tr>
                  ) : (
                    tenders.map((t) => {
                      const daysLeft = Math.ceil(
                        (new Date(t.deadline).getTime() - Date.now()) / 86400000
                      );
                      return (
                        <tr key={t.id}>
                          <td>
                            <span
                              className="tabnum"
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11px",
                                color: "var(--gov-text-muted)",
                                fontWeight: 700,
                              }}
                            >
                              {t.id}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--gov-text-main)",
                                fontSize: "13px",
                              }}
                            >
                              {t.name}
                            </div>
                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "var(--gov-text-muted)",
                                marginTop: "1px",
                              }}
                            >
                              {t.industry}
                            </div>
                          </td>
                          <td style={{ fontSize: "13px", color: "var(--gov-text-main)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <Building2
                                size={11}
                                style={{ color: "var(--gov-text-muted)", flexShrink: 0 }}
                              />
                              {t.client}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span
                              className="tabnum"
                              style={{ fontWeight: 700, color: "var(--gov-text-main)" }}
                            >
                              {t.value}
                            </span>
                          </td>
                          <td>
                            <div
                              className="tabnum"
                              style={{
                                fontSize: "12.5px",
                                color: daysLeft < 20 ? "var(--gov-danger)" : "var(--gov-text-main)",
                                fontWeight: daysLeft < 20 ? 600 : 400,
                              }}
                            >
                              {new Date(t.deadline).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color:
                                  daysLeft < 20 ? "var(--gov-danger)" : "var(--gov-text-muted)",
                              }}
                            >
                              {daysLeft > 0 ? `${daysLeft}d remaining` : "Overdue"}
                            </div>
                          </td>
                          <td style={{ textAlign: "right", minWidth: "90px" }}>
                            {t.coverage > 0 ? (
                              <div>
                                <span
                                  className="tabnum"
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color:
                                      t.coverage >= 90
                                        ? "var(--gov-success)"
                                        : t.coverage >= 60
                                          ? "var(--gov-warning)"
                                          : "var(--gov-danger)",
                                  }}
                                >
                                  {t.coverage}%
                                </span>
                                <Progress value={t.coverage} className="mt-1 h-1" />
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "var(--gov-text-muted)" }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td>
                            <Badge status={t.status} />
                          </td>
                          <td>
                            <Link href={`/tenders/${t.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-[#7A1C2C] hover:text-[#631724]"
                              >
                                Open <ArrowRight size={10} className="ml-0.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Knowledge Base Status Card */}
            <Card className="rounded-lg">
              <CardHeader
                className="border-b px-5 py-3.5"
                style={{ borderColor: "var(--gov-border)" }}
              >
                <CardTitle
                  className="flex items-center justify-between text-xs font-bold tracking-wider uppercase"
                  style={{ color: "var(--gov-text-muted)" }}
                >
                  <span>Knowledge Base Assets</span>
                  <Database size={13} className="text-[#7A1C2C]" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <Link
                  href="/knowledge/projects"
                  className="flex items-center justify-between rounded p-1.5 hover:bg-[#F8FAFC]"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-[#1E252D]">
                    <Layers size={14} className="text-[#7A1C2C]" /> Case Studies / Projects
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1E252D]">
                    {stats.projectsCount}
                  </span>
                </Link>

                <Link
                  href="/knowledge/employees"
                  className="flex items-center justify-between rounded p-1.5 hover:bg-[#F8FAFC]"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-[#1E252D]">
                    <Users size={14} className="text-[#15803D]" /> Key Staff &amp; CVs
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1E252D]">
                    {stats.employeesCount}
                  </span>
                </Link>

                <Link
                  href="/knowledge/technologies"
                  className="flex items-center justify-between rounded p-1.5 hover:bg-[#F8FAFC]"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-[#1E252D]">
                    <Cpu size={14} className="text-[#DDA625]" /> Tech Capabilities
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1E252D]">
                    {stats.techCount}
                  </span>
                </Link>

                <Link
                  href="/knowledge/certifications"
                  className="flex items-center justify-between rounded p-1.5 hover:bg-[#F8FAFC]"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-[#1E252D]">
                    <Award size={14} className="text-[#0284C7]" /> Certifications
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1E252D]">
                    {stats.certsCount}
                  </span>
                </Link>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card className="rounded-lg">
              <CardHeader
                className="border-b px-5 py-3.5"
                style={{ borderColor: "var(--gov-border)" }}
              >
                <CardTitle
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: "var(--gov-text-muted)" }}
                >
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-3">
                {[
                  { href: "/tenders/new", label: "Upload New RFP", icon: FileText },
                  { href: "/knowledge/projects", label: "Add Case Study", icon: Database },
                  { href: "/knowledge/employees", label: "Add Personnel Record", icon: Building2 },
                  {
                    href: "/knowledge/certifications",
                    label: "Register Certificate",
                    icon: CheckCircle2,
                  },
                ].map((a) => (
                  <Link key={a.href} href={a.href} className="block">
                    <Button
                      variant="ghost"
                      className="h-8 w-full justify-start gap-2.5 text-[13px] font-medium text-[var(--gov-text-main)]"
                    >
                      <a.icon size={13} style={{ color: "var(--gov-text-muted)", flexShrink: 0 }} />
                      {a.label}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
