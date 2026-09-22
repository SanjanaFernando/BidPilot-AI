"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Building2, FileText, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { TendersService, TenderItem } from "@/lib/tenders-service";
import { useUserPermissions } from "@/hooks/useUserPermissions";

const FILTERS = ["All", "Analyzing", "Draft", "Review", "Approved"];

export default function TendersPage() {
  const { hasPermission, roleDef } = useUserPermissions();
  const canDelete = hasPermission("tenders:delete");
  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTenders();
  }, []);

  async function loadTenders() {
    setLoading(true);
    try {
      const data = await TendersService.getAll();
      setTenders(data);
    } catch (err) {
      console.error("Failed to load tenders:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to remove this tender record?")) {
      // Optimistically remove from state immediately
      setTenders((prev) => prev.filter((t) => t.id.toLowerCase() !== id.toLowerCase()));
      try {
        await TendersService.delete(id);
      } catch (err) {
        console.error("Failed to delete tender:", err);
      }
      await loadTenders();
    }
  }

  const filteredTenders = tenders.filter((t) => {
    const matchesFilter = selectedStatus === "All" || t.status === selectedStatus;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <Topbar
        title="Tender Register"
        breadcrumb={["BidPilot AI", "Tenders"]}
        action={{ label: "New Tender", href: "/tenders/new" }}
      />

      <div className="page-header flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div className="flex items-center gap-2">
          <FileText size={17} style={{ color: "var(--gov-maroon)" }} />
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--gov-text-main)" }}>
              Active Tender Register
            </h2>
            <p style={{ fontSize: "12.5px", color: "var(--gov-text-muted)" }}>
              {tenders.length} registered tenders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
            <Input
              placeholder="Search tenders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {FILTERS.map((s) => (
              <Button
                key={s}
                onClick={() => setSelectedStatus(s)}
                variant={s === selectedStatus ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs"
                style={
                  s === selectedStatus ? { background: "var(--gov-maroon)", color: "#fff" } : {}
                }
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <main style={{ padding: "22px 28px" }}>
        <Card className="overflow-hidden rounded-lg">
          <CardContent className="p-0">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Tender Name</th>
                  <th>Client Authority</th>
                  <th>Industry</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th>Deadline</th>
                  <th style={{ textAlign: "right" }}>Req.</th>
                  <th style={{ textAlign: "right" }}>Coverage</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-[#64748B]">
                      Loading tenders from repository...
                    </td>
                  </tr>
                ) : filteredTenders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-[#64748B]">
                      No tenders found. Click &quot;New Tender&quot; to upload an RFP.
                    </td>
                  </tr>
                ) : (
                  filteredTenders.map((t) => {
                    const daysLeft = Math.ceil(
                      (new Date(t.deadline).getTime() - Date.now()) / 86400000
                    );
                    return (
                      <tr key={t.id} className="hover:bg-[#F8FAFC]">
                        <td>
                          <span
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
                        <td style={{ maxWidth: "230px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--gov-text-main)",
                              fontSize: "13px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
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
                            {t.description?.slice(0, 50)}…
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              color: "var(--gov-text-main)",
                              fontSize: "13px",
                            }}
                          >
                            <Building2
                              size={11}
                              style={{ color: "var(--gov-text-muted)", flexShrink: 0 }}
                            />
                            {t.client}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "12px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "oklch(0.955 0.006 234)",
                              color: "oklch(0.38 0.02 234)",
                              fontWeight: 500,
                            }}
                          >
                            {t.industry}
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
                              color: daysLeft < 20 ? "var(--gov-danger)" : "var(--gov-text-muted)",
                            }}
                          >
                            {daysLeft > 0 ? `${daysLeft}d` : "Overdue"}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className="tabnum"
                            style={{ fontWeight: 600, color: "var(--gov-text-main)" }}
                          >
                            {t.requirements || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", minWidth: "100px" }}>
                          {t.coverage > 0 ? (
                            <div>
                              <span
                                className="tabnum"
                                style={{
                                  fontSize: "12.5px",
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
                        <td style={{ textAlign: "center" }}>
                          <Badge status={t.status} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/tenders/${t.id}`}>
                              <Button
                                size="sm"
                                className="h-7 bg-[var(--gov-maroon)] px-3 text-xs text-white hover:bg-[var(--gov-maroon-dark)]"
                              >
                                Open
                              </Button>
                            </Link>
                            <button
                              disabled={!canDelete}
                              onClick={() => canDelete && handleDelete(t.id)}
                              title={
                                !canDelete
                                  ? `Deleting tenders requires 'tenders:delete' permission (Disabled for ${roleDef.displayName})`
                                  : "Delete tender"
                              }
                              className={`rounded p-1 transition-all ${
                                canDelete
                                  ? "text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626] cursor-pointer"
                                  : "text-slate-300 cursor-not-allowed opacity-40 pointer-events-auto"
                              }`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
          <div
            style={{
              padding: "9px 18px",
              borderTop: "1px solid var(--gov-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--gov-text-muted)" }}>
              Showing {filteredTenders.length} of {tenders.length} records
            </span>
            <span style={{ fontSize: "12px", color: "var(--gov-text-muted)" }}>
              Phase 1-3 Connected Pipeline
            </span>
          </div>
        </Card>
      </main>
    </div>
  );
}
