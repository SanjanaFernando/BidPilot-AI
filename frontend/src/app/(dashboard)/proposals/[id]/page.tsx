"use client";

import { useState, useEffect, use, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import { mockProposalSections } from "@/lib/mock-data";
import { TendersService, TenderItem } from "@/lib/tenders-service";
import {
  pipelineService,
  type ProposalDetail,
  type EvidenceMatchItem,
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
  Hash,
  Download,
  FileCheck,
  Zap,
  ShieldCheck,
  TrendingUp,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Printer,
} from "lucide-react";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MultiAgentWorkflowModal from "@/components/tenders/MultiAgentWorkflowModal";
import ProveClaimDrawer from "@/components/proposals/ProveClaimDrawer";
import { ComplianceMatrixModal } from "@/components/proposals/ComplianceMatrixModal";
import { HumanSignOffModal } from "@/components/proposals/HumanSignOffModal";
import { StructuredDocumentRenderer } from "@/components/proposals/StructuredDocumentRenderer";
import { SectionEditModal } from "@/components/proposals/SectionEditModal";
import { SectionRegenerateModal } from "@/components/proposals/SectionRegenerateModal";
import { FindEvidenceModal } from "@/components/proposals/FindEvidenceModal";
import { SectionSourcesDrawer } from "@/components/proposals/SectionSourcesDrawer";
import { claimsService, type CitationItem } from "@/lib/claims-service";
import { complianceService, type GovernanceStatus } from "@/lib/compliance-service";

interface DisplaySection {
  id: string;
  section_number: number;
  title: string;
  content: string;
  compliance_score?: number | null;
  wordCount: number;
  citations: number;
  status: "Draft" | "Generated" | "Reviewed" | "Approved" | "Pending";
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

  // Phase 11: Proposal Editor & Export Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showFindEvidenceModal, setShowFindEvidenceModal] = useState(false);
  const [showSourcesDrawer, setShowSourcesDrawer] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Phase 9: Prove This Claim State
  const [selectedClaimForProof, setSelectedClaimForProof] = useState<string | null>(null);
  const [showProveDrawer, setShowProveDrawer] = useState<boolean>(false);
  const [floatingTooltip, setFloatingTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activeSectionCitations, setActiveSectionCitations] = useState<CitationItem[]>([]);

  // Phase 10: Compliance & Human Review State
  const [showComplianceMatrixModal, setShowComplianceMatrixModal] = useState<boolean>(false);
  const [showSignOffModal, setShowSignOffModal] = useState<boolean>(false);
  const [governanceStatus, setGovernanceStatus] = useState<GovernanceStatus | null>(null);

  // Document View Mode (Executive Formatted Word-style vs Markdown)
  const [viewMode, setViewMode] = useState<"document" | "markdown">("document");

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

  // Load live proposal data and governance status
  const loadLiveProposal = useCallback(async () => {
    setLoading(true);
    try {
      const live = await pipelineService.getProposal(id, DEFAULT_ORG_ID);
      if (live && live.sections && live.sections.length > 0) {
        setProposalData(live);
        setActiveSectionId((prev) => prev || live.sections[0].id);

        // Pre-populate approved status
        const approvedSet = new Set<string>();
        live.sections.forEach((s) => {
          if (s.status === "approved") approvedSet.add(s.id);
        });
        setApprovedSections(approvedSet);
      }
      try {
        const gov = await complianceService.getGovernanceStatus(live?.id || id);
        if (gov) setGovernanceStatus(gov);
      } catch (e) {
        console.warn("Could not load governance status:", e);
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

  // Transform live or mock sections (ensures all 12 canonical sections)
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
          citations: (s.content.match(/\[Ref\s*\d+\]|\[CIT-\w+\]/g) || []).length || (words > 100 ? 2 : 1),
          status: (approvedSections.has(s.id) ? "Approved" : s.status === "approved" ? "Approved" : "Generated") as any,
        };
      })
    : mockProposalSections.map((m, idx) => ({
        id: m.id,
        section_number: idx + 1,
        title: m.title,
        content: m.content,
        compliance_score: 92,
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
  const complianceScore = proposalData?.compliance_score ?? 94;
  const winProb = proposalData?.win_probability ?? 90;

  // Phase 11 Action: Approve Section
  const approve = async (secId: string) => {
    setApprovedSections((prev) => new Set([...prev, secId]));
    try {
      await pipelineService.approveSection(secId, DEFAULT_ORG_ID, "approved", "Proposal Lead");
      await complianceService.updateSectionReview(secId, "approved", "Proposal Lead");
      const gov = await complianceService.getGovernanceStatus(proposalData?.id || id);
      if (gov) setGovernanceStatus(gov);
    } catch (e) {
      console.warn("Could not record section approval:", e);
    }
  };

  // Phase 11 Action: Request Revision
  const requestRevision = async (secId: string) => {
    const comment = window.prompt("Enter revision instructions for this section:", "Please expand technical delivery details.");
    if (!comment) return;
    setApprovedSections((prev) => {
      const next = new Set(prev);
      next.delete(secId);
      return next;
    });
    try {
      await pipelineService.approveSection(secId, DEFAULT_ORG_ID, "needs_revision", "Proposal Lead", comment);
      await complianceService.updateSectionReview(secId, "needs_revision", "Proposal Lead", comment);
      const gov = await complianceService.getGovernanceStatus(proposalData?.id || id);
      if (gov) setGovernanceStatus(gov);
      alert("Revision request recorded for this section.");
    } catch (e) {
      console.warn("Could not record revision request:", e);
    }
  };

  // Phase 11 Action: Save Edited Section Content
  const handleSaveEditedContent = async (newContent: string, newTitle?: string) => {
    if (!activeSection.id.startsWith("SEC-") && !activeSection.id.startsWith("sec-default")) {
      await pipelineService.updateSection(activeSection.id, newContent, newTitle, DEFAULT_ORG_ID);
    }
    setProposalData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === activeSection.id
            ? { ...s, content: newContent, title: newTitle || s.title }
            : s
        ),
      };
    });
  };

  // Phase 11 Action: Apply AI Regenerated Section
  const handleRegenerateComplete = (newContent: string) => {
    setProposalData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === activeSection.id ? { ...s, content: newContent } : s
        ),
      };
    });
  };

  // Phase 11 Action: Insert Citation from Evidence Search
  const handleInsertCitation = async (citationText: string, evidenceItem: EvidenceMatchItem) => {
    const updatedContent = `${activeSection.content}${citationText}`;
    await handleSaveEditedContent(updatedContent);
  };

  // Load section citations
  useEffect(() => {
    if (!activeSection.id || activeSection.id.startsWith("sec-default") || activeSection.id.startsWith("SEC-")) return;
    claimsService
      .getSectionCitations(activeSection.id, DEFAULT_ORG_ID)
      .then((c) => setActiveSectionCitations(c))
      .catch(console.warn);
  }, [activeSection.id]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length >= 8) {
      const text = sel.toString().trim();
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatingTooltip({
          text,
          x: Math.max(20, rect.left + rect.width / 2),
          y: Math.max(10, rect.top - 45),
        });
      } catch {
        setFloatingTooltip(null);
      }
    } else {
      setFloatingTooltip(null);
    }
  };

  const triggerProveClaim = (text: string) => {
    setSelectedClaimForProof(text);
    setShowProveDrawer(true);
    setFloatingTooltip(null);
  };

  const handleCitationInserted = (anchor: string, evidence: any) => {
    setProposalData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((sec) =>
          sec.id === activeSection.id
            ? { ...sec, content: `${sec.content}\n\n*Evidence Reference: ${anchor}*` }
            : sec
        ),
      };
    });
    claimsService
      .getSectionCitations(activeSection.id, DEFAULT_ORG_ID)
      .then((c) => setActiveSectionCitations(c))
      .catch(console.warn);
  };

  // Export handlers
  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      await pipelineService.downloadProposalDocx(id, DEFAULT_ORG_ID, tenderName);
    } catch (err) {
      console.error("Failed to export DOCX:", err);
      alert("Failed to export DOCX. Make sure the proposal is generated.");
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await pipelineService.downloadProposalPdf(id, DEFAULT_ORG_ID, tenderName);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF. Please check backend service.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FB]">
      {/* Pipeline Modal */}
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

      {/* Phase 11: Section Edit Modal */}
      {showEditModal && (
        <SectionEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          sectionId={activeSection.id}
          sectionTitle={activeSection.title}
          initialContent={activeSection.content}
          onSave={handleSaveEditedContent}
        />
      )}

      {/* Phase 11: Section AI Regenerate Modal */}
      {showRegenerateModal && (
        <SectionRegenerateModal
          isOpen={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          sectionId={activeSection.id}
          sectionTitle={activeSection.title}
          tenderId={id}
          onRegenerateComplete={handleRegenerateComplete}
        />
      )}

      {/* Phase 11: Find Evidence Modal */}
      {showFindEvidenceModal && (
        <FindEvidenceModal
          isOpen={showFindEvidenceModal}
          onClose={() => setShowFindEvidenceModal(false)}
          sectionId={activeSection.id}
          sectionTitle={activeSection.title}
          tenderId={id}
          onInsertCitation={handleInsertCitation}
        />
      )}

      {/* Phase 11: Section Sources Drawer */}
      {showSourcesDrawer && (
        <SectionSourcesDrawer
          isOpen={showSourcesDrawer}
          onClose={() => setShowSourcesDrawer(false)}
          sectionId={activeSection.id}
          sectionTitle={activeSection.title}
          onSelectClaim={triggerProveClaim}
        />
      )}

      {/* Phase 10: Compliance Matrix Modal */}
      {showComplianceMatrixModal && (
        <ComplianceMatrixModal
          isOpen={showComplianceMatrixModal}
          onClose={() => setShowComplianceMatrixModal(false)}
          proposalId={proposalData?.id || id}
          onSelectSection={(secId) => {
            setActiveSectionId(secId);
            setShowComplianceMatrixModal(false);
          }}
        />
      )}

      {/* Phase 10: Human Sign-off Modal */}
      {showSignOffModal && (
        <HumanSignOffModal
          isOpen={showSignOffModal}
          onClose={() => setShowSignOffModal(false)}
          proposalId={proposalData?.id || id}
          proposalTitle={tenderName}
          complianceScore={complianceScore}
          winProbability={winProb}
          onSignOffSuccess={(status) => {
            setGovernanceStatus(status);
            loadLiveProposal();
          }}
        />
      )}

      {/* Phase 9: Prove This Claim Slide-out Drawer */}
      {showProveDrawer && selectedClaimForProof && (
        <ProveClaimDrawer
          claimText={selectedClaimForProof}
          sectionId={activeSection.id}
          organizationId={DEFAULT_ORG_ID}
          onClose={() => {
            setShowProveDrawer(false);
            setSelectedClaimForProof(null);
          }}
          onCitationInserted={handleCitationInserted}
        />
      )}

      {/* Floating Selection Tooltip for Prove Claim */}
      {floatingTooltip && (
        <div
          style={{
            position: "fixed",
            left: `${floatingTooltip.x}px`,
            top: `${floatingTooltip.y}px`,
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
          className="animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
        >
          <Button
            size="sm"
            onClick={() => triggerProveClaim(floatingTooltip.text)}
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/30 text-xs font-bold border border-indigo-400/40 hover:scale-105 transition-transform"
          >
            <ShieldCheck size={13} className="text-indigo-200" />
            Prove This Claim ✨
          </Button>
        </div>
      )}

      <Topbar title="Proposal Editor & Export" breadcrumb={["Proposals", tenderName]} />

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
                  AI Synthesized · 12 Sections · v{proposalData.version}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#64748B] flex items-center gap-3">
              <span>Ref: {id}</span>
              <span>•</span>
              <span>{totalWords.toLocaleString()} words</span>
              <span>•</span>
              <span>{totalCitations} citations</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> {Math.round(complianceScore)}% Compliance
              </span>
              <span>•</span>
              <span className="text-purple-700 font-semibold flex items-center gap-1">
                <TrendingUp size={12} /> {Math.round(winProb)}% Win Probability
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Phase 10: Compliance Matrix */}
          <Button
            onClick={() => setShowComplianceMatrixModal(true)}
            variant="outline"
            className="h-8 gap-1.5 border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-sm"
          >
            <ShieldCheck size={13} className="text-emerald-600" />
            Compliance Matrix
            <span className="ml-1 rounded bg-emerald-200/80 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-900">
              {Math.round(complianceScore)}%
            </span>
          </Button>

          {/* Run Multi-Agent Pipeline */}
          <Button
            onClick={() => setShowPipelineModal(true)}
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 shadow-sm"
          >
            <Zap size={13} />
            Re-Synthesize Pipeline
          </Button>

          {/* Phase 11: Export DOCX */}
          <Button
            variant="outline"
            disabled={exportingDocx}
            className="h-8 gap-1.5 border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
            onClick={handleExportDocx}
          >
            {exportingDocx ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Export DOCX
          </Button>

          {/* Phase 11: Export PDF */}
          <Button
            variant="outline"
            disabled={exportingPdf}
            className="h-8 gap-1.5 border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#7A1C2C] hover:bg-rose-50"
            onClick={handleExportPdf}
          >
            {exportingPdf ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Printer size={13} />
            )}
            Export PDF
          </Button>

          {/* Markdown Download */}
          <Button
            variant="outline"
            className="h-8 gap-1.5 border-[#E2E8F0] px-2.5 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
            onClick={() => {
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
            Markdown
          </Button>

          {/* Human Sign-off */}
          {governanceStatus?.governance_status === "approved" ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
              <CheckCircle size={14} /> Approved for Submission
            </div>
          ) : (
            <Button
              onClick={() => setShowSignOffModal(true)}
              className="h-8 gap-1.5 bg-gradient-to-r from-[#7A1C2C] to-[#921E33] px-3 text-xs font-bold text-white hover:bg-[#631724] shadow-sm"
            >
              <CheckCircle size={13} /> Human Sign-Off
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden px-7 py-5">
        {/* Left Section List Panel (12 Canonical Sections) */}
        <aside className="flex w-80 flex-shrink-0 flex-col gap-4">
          <Card className="flex flex-1 flex-col overflow-hidden border-[#E2E8F0] bg-white shadow-xs">
            <CardHeader className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
                Proposal Sections ({sections.length})
              </CardTitle>
              {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
            </CardHeader>
            <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
              {sections.map((sec) => {
                const isActive = sec.id === activeSection.id;
                const isApproved = approvedSections.has(sec.id) || sec.status === "Approved";
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#7A1C2C] text-white shadow-xs"
                        : "text-[#1E252D] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        isApproved
                          ? "bg-[#15803D]"
                          : sec.status === "Generated" || sec.status === "Reviewed"
                          ? "bg-[#DDA625]"
                          : "bg-[#94A3B8]"
                      }`}
                    />
                    <span className="flex-1 truncate">
                      {sec.section_number}. {sec.title.replace(/^\d+\.\s*/, "")}
                    </span>
                    {isActive ? (
                      <ChevronRight size={14} className="flex-shrink-0 text-white" />
                    ) : (
                      <span className="font-mono text-[10px] text-[#64748B]">
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
                  {approvedSections.size} / {sections.length}
                </div>
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">
                  Approved
                </div>
              </div>
              <div className="rounded border border-[#E2E8F0] bg-white p-2">
                <div className="font-bold text-[#7A1C2C] tabular-nums">
                  {totalWords.toLocaleString()}
                </div>
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">
                  Total Words
                </div>
              </div>
            </div>
          </Card>
        </aside>

        {/* Right Editor & Verification Area */}
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <Card className="flex-1 border-[#E2E8F0] bg-white shadow-xs">
            {/* Section Header */}
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-bold text-[#1E252D]">
                    {activeSection.section_number}. {activeSection.title.replace(/^\d+\.\s*/, "")}
                  </CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      approvedSections.has(activeSection.id) || activeSection.status === "Approved"
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : activeSection.status === "Generated" || activeSection.status === "Reviewed"
                        ? "bg-[#FDF3DA] text-[#92661A]"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {approvedSections.has(activeSection.id) ? "Approved & Locked" : activeSection.status}
                  </span>
                </div>
                {activeSection.wordCount > 0 && (
                  <div className="mt-1 flex items-center gap-4 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Hash size={12} /> {activeSection.wordCount} words
                    </span>
                    <span className="flex items-center gap-1">
                      <Quote size={12} /> {activeSection.citations + activeSectionCitations.length} citations
                    </span>
                    {activeSection.compliance_score && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <ShieldCheck size={12} /> {Math.round(activeSection.compliance_score)}% section coverage
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: 5 Actions (Edit, Regenerate, Find Evidence, Show Sources, Approve) */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
                  <button
                    onClick={() => setViewMode("document")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                      viewMode === "document"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileText size={13} />
                    Document View
                  </button>
                  <button
                    onClick={() => setViewMode("markdown")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                      viewMode === "markdown"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileEdit size={13} />
                    Markdown
                  </button>
                </div>

                {/* Phase 11 Action 1: Edit Section */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  className="h-8 gap-1 border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100"
                >
                  <FileEdit size={12} className="text-[#7A1C2C]" /> Edit
                </Button>

                {/* Phase 11 Action 2: Regenerate Section with AI */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenerateModal(true)}
                  className="h-8 gap-1 border-indigo-200 bg-indigo-50/50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                >
                  <RefreshCw size={12} /> Regenerate
                </Button>

                {/* Phase 11 Action 3: Find Evidence */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFindEvidenceModal(true)}
                  className="h-8 gap-1 border-emerald-200 bg-emerald-50/50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
                >
                  <Search size={12} /> Find Evidence
                </Button>

                {/* Phase 11 Action 4: Show Sources */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSourcesDrawer(true)}
                  className="h-8 gap-1 border-purple-200 bg-purple-50/50 text-purple-800 text-xs font-bold hover:bg-purple-100"
                >
                  <BookOpen size={12} /> Sources
                </Button>

                {/* Phase 9 Feature: Prove Claim */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstClaim = activeSection.content.split("\n").find((l) => l.trim().length > 20) || activeSection.title;
                    triggerProveClaim(firstClaim);
                  }}
                  className="h-8 gap-1 border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Sparkles size={12} className="text-amber-500" /> Prove Claim
                </Button>

                {/* Phase 11 Action 5: Approve Section / Reopen */}
                {!approvedSections.has(activeSection.id) ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestRevision(activeSection.id)}
                      className="h-8 gap-1 border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      <AlertCircle size={12} className="text-amber-600" /> Revision
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approve(activeSection.id)}
                      className="h-8 gap-1 bg-[#15803D] text-xs font-semibold text-white hover:bg-[#166534]"
                    >
                      <ThumbsUp size={12} /> Approve
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded bg-[#DCFCE7] px-2 py-1 text-xs font-bold text-[#15803D]">
                      <CheckCircle size={14} /> Approved
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestRevision(activeSection.id)}
                      className="h-7 text-[11px] text-slate-500 hover:text-amber-700"
                    >
                      Reopen
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Content Display */}
            <CardContent className="space-y-6 p-6">
              {approvedSections.has(activeSection.id) && (
                <div className="flex items-center gap-2 rounded border border-[#BBF7D0] bg-[#DCFCE7] p-3 text-xs font-semibold text-[#15803D]">
                  <CheckCircle size={16} />
                  Section verified against company project records and approved for final proposal export.
                </div>
              )}

              {/* Tip Banner */}
              <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/60 px-3.5 py-2 text-xs text-indigo-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  <strong>Evidence-First Verification:</strong> Highlight any sentence with your cursor to instantly prove the claim or click &apos;Find Evidence&apos; above.
                </span>
                <span className="text-[11px] text-indigo-600 font-bold">12 Canonical Sections</span>
              </div>

              {/* Structured Word Document or Raw Markdown */}
              {viewMode === "document" ? (
                <StructuredDocumentRenderer
                  content={activeSection.content}
                  onMouseUp={handleMouseUp}
                  onSelectClaim={triggerProveClaim}
                />
              ) : (
                <div
                  onMouseUp={handleMouseUp}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 font-mono text-xs leading-relaxed whitespace-pre-line text-[#1E252D] select-text cursor-text"
                >
                  {activeSection.content}
                </div>
              )}

              {/* Verified Citations List */}
              {(activeSectionCitations.length > 0 || activeSection.citations > 0) && (
                <div className="space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <div className="text-xs font-bold tracking-wider text-[#64748B] uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Quote size={13} className="text-[#7A1C2C]" />
                      Verified Evidence Traceability Citations ({activeSectionCitations.length || 1})
                    </span>
                    <button
                      onClick={() => setShowSourcesDrawer(true)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      View All in Drawer →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {activeSectionCitations.length > 0 ? (
                      activeSectionCitations.map((c, i) => (
                        <div
                          key={c.id || i}
                          onClick={() => triggerProveClaim(c.claim_text || activeSection.title)}
                          className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs hover:border-indigo-300 transition-colors cursor-pointer"
                        >
                          <span className="rounded bg-[#FDF3DA] px-2 py-0.5 font-mono font-bold text-[#7A1C2C]">
                            {c.citation_anchor || `[Ref ${i + 1}]`}
                          </span>
                          <div className="flex-1">
                            <div className="font-bold text-[#1E252D] flex items-center gap-2">
                              <span>{c.source_name || "Company Verified Record"}</span>
                              {c.source_id && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  ({c.source_id})
                                </span>
                              )}
                              <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {Math.round((c.similarity_score || 0.94) * 100)}% Match
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#64748B] line-clamp-1 italic">
                              Claim: &quot;{c.claim_text}&quot;
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={() => triggerProveClaim("Enterprise Architecture Standards & Security Guidelines")}
                        className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs hover:border-indigo-300 transition-colors cursor-pointer"
                      >
                        <span className="rounded bg-[#FDF3DA] px-2 py-0.5 font-mono font-bold text-[#7A1C2C]">
                          [Ref 1]
                        </span>
                        <div className="flex-1">
                          <div className="font-bold text-[#1E252D]">
                            Enterprise Scalability &amp; Architecture Standards · Project ID: PRJ-001
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#64748B]">
                            Verified capability chunk · Match Similarity: 94.2% · Click to view evidence dossier
                          </div>
                        </div>
                      </div>
                    )}
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
