"use client";

import { useState } from "react";
import {
  RequirementMatrixItem,
  RequirementStatus,
  RequirementEvidenceItem,
  updateRequirement,
  evaluateSingleRequirement,
} from "@/lib/requirements-service";
import {
  searchKnowledge,
  DEFAULT_ORG_ID,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_COLORS,
  KnowledgeChunkResult,
} from "@/lib/rag-service";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Sparkles,
  Bot,
  Save,
  Loader2,
  ExternalLink,
  Search,
  BookOpen,
  UserCheck,
  Award,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface RequirementEvidenceDrawerProps {
  requirement: RequirementMatrixItem;
  organizationId: string;
  onClose: () => void;
  onUpdated: (updated: RequirementMatrixItem) => void;
}

export default function RequirementEvidenceDrawer({
  requirement: initialReq,
  organizationId,
  onClose,
  onUpdated,
}: RequirementEvidenceDrawerProps) {
  const [req, setReq] = useState<RequirementMatrixItem>(initialReq);
  const [selectedStatus, setSelectedStatus] = useState<RequirementStatus>(req.status);
  const [matchScore, setMatchScore] = useState<number>(req.match_score || 0);
  const [reviewerNotes, setReviewerNotes] = useState<string>(req.notes || "");
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [ragQuery, setRagQuery] = useState(req.title);
  const [ragSearching, setRagSearching] = useState(false);
  const [customRagResults, setCustomRagResults] = useState<KnowledgeChunkResult[] | null>(null);

  // Status mapping colors and icons
  const STATUS_CONFIG: Record<
    RequirementStatus,
    { label: string; color: string; bg: string; icon: any }
  > = {
    covered: { label: "Covered", color: "#15803D", bg: "#DCFCE7", icon: CheckCircle2 },
    partially_covered: {
      label: "Partially Covered",
      color: "#B45309",
      bg: "#FEF3C7",
      icon: AlertTriangle,
    },
    missing: { label: "Missing", color: "#B91C1C", bg: "#FEE2E2", icon: XCircle },
    evidence_required: {
      label: "Evidence Required",
      color: "#7C3AED",
      bg: "#EDE9FE",
      icon: HelpCircle,
    },
    unverified: {
      label: "Unverified",
      color: "#64748B",
      bg: "#F1F5F9",
      icon: Info,
    },
  };

  const currentStatusConf = STATUS_CONFIG[selectedStatus] || STATUS_CONFIG.unverified;
  const StatusIcon = currentStatusConf.icon;

  // Handle manual save
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateRequirement(req.id, organizationId, {
        status: selectedStatus,
        match_score: matchScore,
        notes: reviewerNotes,
      });
      setReq((prev) => ({
        ...prev,
        ...updated,
        status: selectedStatus,
        match_score: matchScore,
        notes: reviewerNotes,
      }));
      onUpdated({
        ...req,
        ...updated,
        status: selectedStatus,
        match_score: matchScore,
        notes: reviewerNotes,
      });
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // Handle single AI evaluation on-demand
  const handleAIVerify = async () => {
    setEvaluating(true);
    try {
      const res = await evaluateSingleRequirement(req.tender_id, organizationId, req.id);
      const ev = res.evaluation;
      const newStatus = ev.status as RequirementStatus;
      setSelectedStatus(newStatus);
      setMatchScore(ev.match_score);
      const combinedNotes =
        ev.assessment_rationale + (ev.gap_analysis ? ` | Gap: ${ev.gap_analysis}` : "");
      setReviewerNotes(combinedNotes);

      const updatedReq: RequirementMatrixItem = {
        ...req,
        status: newStatus,
        match_score: ev.match_score,
        notes: combinedNotes,
        evidence_metadata: ev.evidence || [],
      };
      setReq(updatedReq);
      onUpdated(updatedReq);
    } catch (err) {
      console.error("AI Verify error:", err);
      alert("AI evaluation failed. Check AI Service connection.");
    } finally {
      setEvaluating(false);
    }
  };

  // Run live RAG search inside modal
  const handleLiveRAGSearch = async () => {
    if (!ragQuery.trim()) return;
    setRagSearching(true);
    try {
      const results = await searchKnowledge(ragQuery, organizationId, { topK: 5 });
      setCustomRagResults(results.results);
    } catch (err) {
      console.error("RAG search failed:", err);
    } finally {
      setRagSearching(false);
    }
  };

  const evidenceList = req.evidence_metadata || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#B91C1C] text-white shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-[#7A1C2C]">
                  {req.req_code}
                </span>
                <span className="rounded bg-[#E2E8F0] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                  {req.category}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: req.is_mandatory ? "#B91C1C" : "#64748B" }}
                >
                  {req.is_mandatory ? "Mandatory" : "Optional"}
                </span>
              </div>
              <div className="text-xs text-[#64748B]">
                RFP Traceability &amp; Evidence Citation Dossier
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Requirement Context Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1 flex items-center justify-between">
              <span>Requirement Specification</span>
              {req.source_page && (
                <span className="font-mono font-normal lowercase text-[#7A1C2C] bg-[#FDF2F4] px-2 py-0.5 rounded">
                  RFP Page {req.source_page} {req.source_section ? `· §${req.source_section}` : ""}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-[#1E252D] mb-1">{req.title}</h3>
            <p className="text-xs leading-relaxed text-[#475569]">{req.description}</p>
          </div>

          {/* AI Assessment & Coverage Overview */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FAF5F0]/50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-[#7A1C2C]" />
                <h4 className="text-sm font-bold text-[#1E252D]">AI Capability Assessment</h4>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-xs" style={{ background: currentStatusConf.bg, color: currentStatusConf.color }}>
                  <StatusIcon size={14} />
                  <span>{currentStatusConf.label}</span>
                </div>

                <div className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#1E252D] border border-[#E2E8F0] shadow-2xs">
                  {matchScore}% Match
                </div>

                <Button
                  onClick={handleAIVerify}
                  disabled={evaluating}
                  size="sm"
                  className="h-8 gap-1.5 bg-[#7A1C2C] px-3 text-xs font-semibold text-white hover:bg-[#631724]"
                >
                  {evaluating ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} className="text-[#DDA625]" /> Re-Evaluate AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Assessment Note */}
            <div className="text-xs text-[#334155] leading-relaxed bg-white rounded-lg p-3.5 border border-[#E2E8F0]">
              <span className="font-bold text-[#1E252D]">Evaluation Assessment: </span>
              {req.notes || "No AI evaluation run yet. Click 'Re-Evaluate AI' to search company knowledge."}
            </div>
          </div>

          {/* Signature Feature: Supporting Evidence Citations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E252D]">
                <BookOpen size={14} className="text-[#7A1C2C]" />
                <span>Supporting Company Evidence ({evidenceList.length})</span>
              </div>
              <span className="text-[11px] text-[#64748B]">
                Direct citations from verified knowledge base
              </span>
            </div>

            {evidenceList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
                <Search size={24} className="mx-auto mb-2 text-[#94A3B8]" />
                <p className="text-xs font-medium text-[#64748B]">
                  No structured evidence attached yet.
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Click 'Re-Evaluate AI' or use the Prove Claim search below to link company assets.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {evidenceList.map((ev, idx) => {
                  const color =
                    SOURCE_TYPE_COLORS[ev.source_type] ||
                    (ev.source_type === "project" ? "#7A1C2C" : "#2563EB");
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:border-[#CBD5E1] hover:shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded px-2 py-0.5 text-[10px] font-extrabold uppercase text-white"
                            style={{ background: color }}
                          >
                            {ev.source_type}
                          </span>
                          <span className="text-xs font-bold text-[#1E252D]">
                            {ev.source_name}
                          </span>
                        </div>
                        {ev.similarity_score !== undefined && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {Math.round(ev.similarity_score * 100)}% Similarity
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-[#475569] italic bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9]">
                        &ldquo;{ev.content_snippet}&rdquo;
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive "Prove This Claim" RAG Explorer */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E252D] flex items-center gap-1.5">
                <Search size={13} className="text-[#7A1C2C]" /> Prove this Claim / Search Live Knowledge
              </span>
              <span className="text-[10px] text-[#64748B]">Real-time RAG Search</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Search projects, certifications, staff skills..."
                className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#1E252D] placeholder:text-[#94A3B8] focus:border-[#7A1C2C] focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleLiveRAGSearch()}
              />
              <Button
                onClick={handleLiveRAGSearch}
                disabled={ragSearching}
                size="sm"
                className="h-8 bg-[#1E252D] px-3 text-xs font-semibold text-white hover:bg-[#334155]"
              >
                {ragSearching ? <Loader2 size={12} className="animate-spin" /> : "Search Evidence"}
              </Button>
            </div>

            {/* Live Search Results */}
            {customRagResults && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-[#64748B]">
                  Found {customRagResults.length} matching snippets:
                </div>
                {customRagResults.map((r, i) => (
                  <div key={i} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-[#1E252D]">{r.source_name}</strong>
                      <span className="text-[10px] text-[#64748B]">
                        {Math.round(r.similarity * 100)}% match
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[#475569]">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-[#E2E8F0]" />

          {/* Human-in-the-Loop Review Controls */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-[#7A1C2C]" />
              <h4 className="text-sm font-bold text-[#1E252D]">Human Review &amp; Compliance Sign-off</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Override */}
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  Coverage Status Override
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as RequirementStatus)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#1E252D] focus:border-[#7A1C2C] focus:outline-none"
                >
                  <option value="covered">Covered (Full Match)</option>
                  <option value="partially_covered">Partially Covered (Adaptation Needed)</option>
                  <option value="evidence_required">Evidence Required (Pending Documents)</option>
                  <option value="missing">Missing (Capability Gap)</option>
                  <option value="unverified">Unverified (Not Evaluated)</option>
                </select>
              </div>

              {/* Match Score Slider */}
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 flex justify-between">
                  <span>Match Score</span>
                  <span className="font-bold text-[#7A1C2C]">{matchScore}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={matchScore}
                  onChange={(e) => setMatchScore(Number(e.target.value))}
                  className="w-full accent-[#7A1C2C] cursor-pointer"
                />
              </div>
            </div>

            {/* Reviewer / Bid Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                Reviewer &amp; Compliance Notes (Included in Proposal Context)
              </label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={3}
                placeholder="Add notes on bid strategy, reference architecture, or missing certificates..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-white p-3 text-xs text-[#1E252D] placeholder:text-[#94A3B8] focus:border-[#7A1C2C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#CBD5E1] text-xs font-semibold text-[#64748B]"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-[#7A1C2C] px-5 text-xs font-bold text-white hover:bg-[#631724]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save &amp; Update Matrix
          </Button>
        </div>
      </div>
    </div>
  );
}
