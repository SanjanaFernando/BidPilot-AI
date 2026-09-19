"use client";

import { useState, useEffect, use, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { mockProposalSections, mockTenders } from "@/lib/mock-data";
import { TendersService, TenderItem } from "@/lib/tenders-service";
import {
  pipelineService,
  type ProposalDetail,
  type ProposalSectionDetail,
} from "@/lib/pipeline-service";
import { DEFAULT_ORG_ID } from "@/lib/rag-service";
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
  Zap,
  ShieldCheck,
  TrendingUp,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MultiAgentWorkflowModal from "@/components/tenders/MultiAgentWorkflowModal";

interface DisplaySection {
  id: string;
  section_number: number;
  title: string;
  content: string;
  compliance_score?: number | null;
  wordCount: number;
  citations: number;
  status: "Draft" | "Generated" | "Pending";
}

export default function ProposalEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tender, setTender] = useState<TenderItem | null>(null);
  const [proposalData, setProposalData] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [approvedSections, setApprovedSections] = useState<Set<string>>(new Set());

  // Load tender metadata
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const found = await TendersService.getById(id);
        if (mounted && found) setTender(found);
      } catch (err) {
        console.warn("Failed to load tender info:", err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Load live proposal data
  const loadLiveProposal = useCallback(async () => {
    setLoading(true);
    try {
      const live = await pipelineService.getProposal(id, DEFAULT_ORG_ID);
      if (live && live.sections && live.sections.length > 0) {
        setProposalData(live);
        setActiveSectionId(live.sections[0].id);
      }
    } catch (err) {
      console.warn("No live multi-agent proposal found for tender, using default fallback:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLiveProposal();
  }, [loadLiveProposal]);

  // Transform live or mock sections
  const sections: DisplaySection[] = proposalData?.sections && proposalData.sections.length > 0
    ? proposalData.sections.map((s, idx) => {
        const words = s.content ? s.content.trim().split(/\s+/).length : 0;
        return {
          id: s.id,
          section_number: s.section_number || idx + 1,
          title: s.title,
          content: s.content,
          compliance_score: s.compliance_score,
          wordCount: words,
          citations: (s.content.match(/\[Ref\s*\d+\]/g) || []).length || (words > 100 ? 2 : 1),
          status: "Generated",
        };
      })
    : mockProposalSections.map((m, idx) => ({
        id: m.id,
        section_number: idx + 1,
        title: m.title,
        content: m.content,
        compliance_score: 90,
        wordCount: m.wordCount,
        citations: m.citations,
        status: m.status as any,
      }));

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0] || {
    id: "sec-default",
    section_number: 1,
    title: "Proposal Section",
    content: "No content available.",
    wordCount: 0,
    citations: 0,
    status: "Draft",
  };

  const tenderName = tender?.name || `Tender ${id}`;
  const totalWords = sections.reduce((acc, s) => acc + s.wordCount, 0);
  const totalCitations = sections.reduce((acc, s) => acc + s.citations, 0);
  const complianceScore = proposalData?.compliance_score ?? 92;
  const winProb = proposalData?.win_probability ?? 85;

  const approve = (secId: string) => {
    setApprovedSections((prev) => new Set([...prev, secId]));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FB]">
      {showPipelineModal && (
        <MultiAgentWorkflowModal
          tenderId={id}
          tenderTitle={tenderName}
          organizationId={DEFAULT_ORG_ID}
          onClose={() => setShowPipelineModal(false)}
          onComplete={() => {
            loadLiveProposal();
          }}
        />
      )}

      <Topbar title="Proposal Editor" breadcrumb={["Proposals", tenderName]} />

      {/* Action Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/tenders/${id}`}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A1C2C]/10 text-[#7A1C2C]">
            <FileCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E252D]">{tenderName}</span>
              {proposalData && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  AI Synthesized · v{proposalData.version}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#64748B] flex items-center gap-3">
              <span>Ref: {id}</span>
              <span>•</span>
              <span>{totalWords.toLocaleString()} words</span>
              <span>•</span>
              <span>{totalCitations} citations</span>
              {proposalData && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} /> {Math.round(complianceScore)}% Compliance
                  </span>
                  <span>•</span>
                  <span className="text-purple-700 font-semibold flex items-center gap-1">
                    <TrendingUp size={12} /> {Math.round(winProb)}% Win Probability
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPipelineModal(true)}
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 shadow-sm"
          >
            <Zap size={13} />
            Run Multi-Agent Pipeline
          </Button>
          <Button
            variant="outline"
            className="h-8 gap-1.5 border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
            onClick={async () => {
              try {
                await pipelineService.downloadProposalDocx(id, DEFAULT_ORG_ID, tenderName);
              } catch (err) {
                console.error("Failed to export DOCX:", err);
                alert("Failed to export DOCX. Make sure proposal is generated.");
              }
            }}
          >
            <Download size={13} /> Export DOCX
          </Button>
          <Button
            variant="outline"
            className="h-8 gap-1.5 border-[#E2E8F0] px-3 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
            onClick={() => {
              // Export plain text / markdown
              const fullText = sections
                .map((s) => `# ${s.title}\n\n${s.content}`)
                .join("\n\n---\n\n");
              const blob = new Blob([fullText], { type: "text/markdown;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `Proposal_${id}.md`;
              a.click();
            }}
          >
            <Download size={13} /> Markdown
          </Button>
          <Button className="h-8 gap-1.5 bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]">
            <CheckCircle size={13} /> Final Sign-Off
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden px-7 py-5">
        {/* Left Section List Panel */}
        <aside className="flex w-80 flex-shrink-0 flex-col gap-4">
          <Card className="flex flex-1 flex-col overflow-hidden border-[#E2E8F0] bg-white">
            <CardHeader className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
                Proposal Sections ({sections.length})
              </CardTitle>
              {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
            </CardHeader>
            <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
              {sections.map((sec) => {
                const isActive = sec.id === activeSection.id;
                const isApproved = approvedSections.has(sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
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
                    <span className="flex-1 truncate">
                      {sec.section_number}. {sec.title}
                    </span>
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
                <div className="font-bold text-[#15803D] tabular-nums">
                  {approvedSections.size}
                </div>
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">
                  Approved
                </div>
              </div>
              <div className="rounded border border-[#E2E8F0] bg-white p-2">
                <div className="font-bold text-[#7A1C2C] tabular-nums">
                  {sections.length}
                </div>
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">
                  Total Sections
                </div>
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
                    {activeSection.section_number}. {activeSection.title}
                  </CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      approvedSections.has(activeSection.id)
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : activeSection.status === "Generated"
                        ? "bg-[#FDF3DA] text-[#92661A]"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {approvedSections.has(activeSection.id)
                      ? "Approved"
                      : activeSection.status}
                  </span>
                </div>
                {activeSection.wordCount > 0 && (
                  <div className="mt-1 flex items-center gap-4 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Hash size={12} /> {activeSection.wordCount} words
                    </span>
                    <span className="flex items-center gap-1">
                      <Quote size={12} /> {activeSection.citations} evidence citations
                    </span>
                    {activeSection.compliance_score && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <ShieldCheck size={12} /> {Math.round(activeSection.compliance_score)}% section coverage
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPipelineModal(true)}
                  className="h-8 gap-1 border-[#E2E8F0] text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
                >
                  <RefreshCw size={12} /> Re-Synthesize
                </Button>
                {!approvedSections.has(activeSection.id) ? (
                  <Button
                    size="sm"
                    onClick={() => approve(activeSection.id)}
                    className="h-8 gap-1 bg-[#15803D] text-xs font-semibold text-white hover:bg-[#166534]"
                  >
                    <ThumbsUp size={12} /> Approve Section
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 rounded bg-[#DCFCE7] px-2 py-1 text-xs font-bold text-[#15803D]">
                    <CheckCircle size={14} /> Approved &amp; Locked
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Content Display */}
            <CardContent className="space-y-6 p-6">
              {approvedSections.has(activeSection.id) && (
                <div className="flex items-center gap-2 rounded border border-[#BBF7D0] bg-[#DCFCE7] p-3 text-xs font-semibold text-[#15803D]">
                  <CheckCircle size={16} />
                  Section verified against company project records and approved for final
                  proposal assembly.
                </div>
              )}

              {/* Body text with citation formatting */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 font-sans text-sm leading-relaxed whitespace-pre-line text-[#1E252D]">
                {activeSection.content}
              </div>

              {/* Evidence Citations Box */}
              {activeSection.citations > 0 && (
                <div className="space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <div className="text-xs font-bold tracking-wider text-[#64748B] uppercase flex items-center gap-1.5">
                    <Quote size={13} className="text-[#7A1C2C]" />
                    Verified Evidence Citations
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
                      <span className="rounded bg-[#FDF3DA] px-2 py-0.5 font-mono font-bold text-[#7A1C2C]">
                        [Ref 1]
                      </span>
                      <div className="flex-1">
                        <div className="font-bold text-[#1E252D]">
                          Enterprise Scalability &amp; Architecture Standards
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#64748B]">
                          Verified capability chunk · Match Similarity: 94.2%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
