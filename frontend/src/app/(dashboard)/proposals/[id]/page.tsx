"use client";

import { useState, use } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { mockProposalSections, mockTenders } from "@/lib/mock-data";
import {
  FileEdit,
  RefreshCw,
  Search,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Quote,
  ThumbsUp,
  Clock,
  Hash,
  Download,
  FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ProposalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tender = mockTenders.find((t) => t.id === id) ?? mockTenders[0];
  const [activeSection, setActiveSection] = useState(mockProposalSections[0].id);
  const [approvedSections, setApprovedSections] = useState<Set<string>>(
    new Set(["SEC-002", "SEC-010"])
  );

  const current = mockProposalSections.find((s) => s.id === activeSection)!;
  const totalWords = mockProposalSections.reduce((acc, s) => acc + s.wordCount, 0);
  const totalCitations = mockProposalSections.reduce((acc, s) => acc + s.citations, 0);

  const approve = (secId: string) => {
    setApprovedSections((prev) => new Set([...prev, secId]));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FB]">
      <Topbar title="Proposal Editor" breadcrumb={["Proposals", tender.name]} />

      {/* Action Header Strip */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-3">
        <div className="flex items-center gap-3">
          <FileCheck size={18} className="text-[#7A1C2C]" />
          <div>
            <span className="text-xs font-bold text-[#1E252D]">{tender.name}</span>
            <div className="text-[11px] text-[#64748B]">
              Ref: {tender.id} · {totalWords.toLocaleString()} total words · {totalCitations}{" "}
              verified citations
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 gap-1.5 border-[#E2E8F0] px-3 text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
          >
            <Download size={13} /> Export DOCX
          </Button>
          <Button className="h-8 gap-1.5 bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]">
            <CheckCircle size={13} /> Final Sign-Off
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden px-7 py-5">
        {/* Left Section List Panel */}
        <aside className="flex w-72 flex-shrink-0 flex-col gap-4">
          <Card className="flex flex-1 flex-col overflow-hidden border-[#E2E8F0] bg-white">
            <CardHeader className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <CardTitle className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
                Proposal Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
              {mockProposalSections.map((sec) => {
                const isActive = sec.id === activeSection;
                const isApproved = approvedSections.has(sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#7A1C2C] text-white shadow-sm"
                        : "text-[#1E252D] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        isApproved
                          ? "bg-[#15803D]"
                          : sec.status === "Generated"
                            ? "bg-[#DDA625]"
                            : "bg-[#94A3B8]"
                      }`}
                    />
                    <span className="flex-1 truncate">{sec.title}</span>
                    {isActive ? (
                      <ChevronRight size={14} className="flex-shrink-0 text-white" />
                    ) : (
                      <span className="font-mono text-[11px] text-[#64748B]">
                        {sec.wordCount > 0 ? `${sec.wordCount}w` : "—"}
                      </span>
                    )}
                  </button>
                );
              })}
            </CardContent>

            <Separator className="bg-[#E2E8F0]" />

            {/* Quick summary footer */}
            <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-3 text-center text-xs">
              <div className="rounded border border-[#E2E8F0] bg-white p-2">
                <div className="font-bold text-[#15803D] tabular-nums">{approvedSections.size}</div>
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">Approved</div>
              </div>
              <div className="rounded border border-[#E2E8F0] bg-white p-2">
                <div className="font-bold text-[#7A1C2C] tabular-nums">
                  {mockProposalSections.length}
                </div>
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">Total Secs</div>
              </div>
            </div>
          </Card>
        </aside>

        {/* Right Editor & Verification Area */}
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <Card className="flex-1 border-[#E2E8F0] bg-white">
            {/* Section Header */}
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-bold text-[#1E252D]">
                    {current.title}
                  </CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      approvedSections.has(current.id)
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : current.status === "Generated"
                          ? "bg-[#FDF3DA] text-[#92661A]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {approvedSections.has(current.id) ? "Approved" : current.status}
                  </span>
                </div>
                {current.wordCount > 0 && (
                  <div className="mt-1 flex items-center gap-4 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Hash size={12} /> {current.wordCount} words
                    </span>
                    <span className="flex items-center gap-1">
                      <Quote size={12} /> {current.citations} evidence citations
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {current.status !== "Pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-[#E2E8F0] text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
                    >
                      <RefreshCw size={12} /> Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-[#E2E8F0] text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
                    >
                      <Search size={12} /> Find Evidence
                    </Button>
                    {!approvedSections.has(current.id) ? (
                      <Button
                        size="sm"
                        onClick={() => approve(current.id)}
                        className="h-8 gap-1 bg-[#15803D] text-xs font-semibold text-white hover:bg-[#166534]"
                      >
                        <ThumbsUp size={12} /> Approve Section
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 rounded bg-[#DCFCE7] px-2 py-1 text-xs font-bold text-[#15803D]">
                        <CheckCircle size={14} /> Approved &amp; Locked
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardHeader>

            {/* Content Display */}
            <CardContent className="space-y-6 p-6">
              {current.status === "Pending" ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Sparkles size={32} className="mb-3 text-[#7A1C2C]" />
                  <h3 className="mb-1 text-sm font-bold text-[#1E252D]">
                    Section Generation Pending
                  </h3>
                  <p className="mb-4 max-w-sm text-xs text-[#64748B]">
                    This section depends on predecessor requirements and will be auto-generated upon
                    approval of previous clauses.
                  </p>
                  <Button className="h-8 gap-1.5 bg-[#7A1C2C] px-4 text-xs font-semibold text-white hover:bg-[#631724]">
                    <Sparkles size={13} /> Generate Now
                  </Button>
                </div>
              ) : (
                <>
                  {approvedSections.has(current.id) && (
                    <div className="flex items-center gap-2 rounded border border-[#BBF7D0] bg-[#DCFCE7] p-3 text-xs font-semibold text-[#15803D]">
                      <CheckCircle size={16} />
                      Section verified against company project records and approved for final
                      proposal assembly.
                    </div>
                  )}

                  {/* Body text with citation marker */}
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 font-serif text-sm leading-relaxed whitespace-pre-line text-[#1E252D]">
                    {current.content}
                    {current.content.length > 0 && (
                      <span className="ml-1.5 inline-block cursor-pointer rounded border border-[#FDE68A] bg-[#FDF3DA] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#92661A]">
                        [Ref 1]
                      </span>
                    )}
                  </div>

                  {/* Evidence Citations Box */}
                  {current.citations > 0 && (
                    <div className="space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
                      <div className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
                        Verified Evidence Traceability Citations
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: Math.min(current.citations, 2) }, (_, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs"
                          >
                            <span className="rounded bg-[#FDF3DA] px-2 py-0.5 font-mono font-bold text-[#7A1C2C]">
                              [{i + 1}]
                            </span>
                            <div className="flex-1">
                              <div className="font-bold text-[#1E252D]">
                                Healthcare Management Platform · Project ID: PRJ-001
                              </div>
                              <div className="mt-0.5 text-[11px] text-[#64748B]">
                                Similarity Score: 0.{88 + i * 4} · Source Section: Functional Specs
                                p.{4 + i * 5}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
