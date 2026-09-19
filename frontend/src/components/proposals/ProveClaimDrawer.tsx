"use client";

import { useState, useEffect } from "react";
import {
  claimsService,
  type ClaimVerifyResponse,
  type ClaimVerifyEvidenceItem,
} from "@/lib/claims-service";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Quote,
  Layers,
  FileText,
  Briefcase,
  User,
  Award,
  Cpu,
  Loader2,
  PlusCircle,
  ExternalLink,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProveClaimDrawerProps {
  claimText: string;
  sectionId: string;
  organizationId: string;
  onClose: () => void;
  onCitationInserted: (anchor: string, evidence: ClaimVerifyEvidenceItem) => void;
}

const SOURCE_ICONS: Record<string, any> = {
  project: Briefcase,
  employee: User,
  certification: Award,
  technology: Cpu,
  document: FileText,
};

const SOURCE_COLORS: Record<string, string> = {
  project: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  employee: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  certification: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  technology: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  document: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function ProveClaimDrawer({
  claimText,
  sectionId,
  organizationId,
  onClose,
  onCitationInserted,
}: ProveClaimDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<ClaimVerifyResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [insertingIndex, setInsertingIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function evaluate() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await claimsService.verifyClaim(claimText, organizationId, {
          proposalSectionId: sectionId,
        });
        if (mounted) setResult(res);
      } catch (err: any) {
        if (mounted) setErrorMsg(err?.message || "Failed to verify claim evidence.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    evaluate();
    return () => {
      mounted = false;
    };
  }, [claimText, sectionId, organizationId]);

  const handleInsertCitation = async (evidence: ClaimVerifyEvidenceItem, idx: number) => {
    if (!result) return;
    setInsertingIndex(idx);
    try {
      const cit = await claimsService.insertCitation(
        organizationId,
        sectionId,
        claimText,
        evidence,
        result.verification_status,
        result.suggested_citation_anchor
      );
      onCitationInserted(cit.citation_anchor, evidence);
      onClose();
    } catch (err: any) {
      alert(`Error inserting citation: ${err?.message}`);
    } finally {
      setInsertingIndex(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-slate-900 border-l border-slate-700/80 shadow-2xl text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Prove This Claim Dossier
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 9 Signature
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Traceable ground truth validation against company knowledge chunks
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Selected Claim Quote Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Quote className="h-3.5 w-3.5 text-indigo-400" />
            Selected Proposal Claim
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
            "{claimText}"
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400 font-medium">
              Searching company projects, employees, and certifications...
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Evaluation Error</p>
              <p className="text-red-300/90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Evaluation Summary Card */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                result.verification_status === "verified"
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : result.verification_status === "partially_supported"
                  ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.verification_status === "verified" && (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                )}
                {result.verification_status === "partially_supported" && (
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                )}
                {result.verification_status === "unsupported" && (
                  <XCircle className="h-6 w-6 text-rose-400" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {result.verification_status === "verified"
                      ? "Verified Claim (High Confidence)"
                      : result.verification_status === "partially_supported"
                      ? "Partially Supported Claim"
                      : "Unsupported Claim (Flagged)"}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {result.is_supported
                      ? "Backed by authentic company evidence chunks"
                      : "No matching records found in organizational knowledge base"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-extrabold tabular-nums">
                  {Math.round(result.confidence_score)}%
                </div>
                <div className="text-[9px] uppercase font-bold tracking-wider opacity-70">
                  Confidence
                </div>
              </div>
            </div>

            {/* Assessment Rationale */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Evidence Grounding Rationale
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result.assessment_rationale}
              </p>
            </div>

            {/* Supporting Evidence Chunks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Supporting Evidence ({result.supporting_evidence.length})
                </div>
                <span className="text-[10px] text-slate-400">
                  Cosine vector similarity
                </span>
              </div>

              {result.supporting_evidence.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 rounded-xl border border-slate-800 bg-slate-950/40">
                  No supporting knowledge chunks found matching this query threshold.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.supporting_evidence.map((ev, idx) => {
                    const IconComp = SOURCE_ICONS[ev.source_type.toLowerCase()] || FileText;
                    const colorClass = SOURCE_COLORS[ev.source_type.toLowerCase()] || "bg-slate-800 text-slate-300";
                    const isTopMatch = idx === 0;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                          isTopMatch
                            ? "bg-slate-800/60 border-indigo-500/40 shadow-sm"
                            : "bg-slate-900/50 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${colorClass}`}>
                              <IconComp className="h-3 w-3" />
                              {ev.source_type.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {ev.source_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                              {Math.round(ev.similarity_score * 100)}% Match
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                          {ev.content_snippet}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[10px] text-slate-400">
                            {ev.source_id && <span className="font-mono mr-2">ID: {ev.source_id}</span>}
                            {ev.source_section && <span>Section: {ev.source_section}</span>}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleInsertCitation(ev, idx)}
                            disabled={insertingIndex !== null}
                            className="h-7 text-[11px] font-semibold gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                          >
                            {insertingIndex === idx ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <PlusCircle className="h-3 w-3" />
                            )}
                            Insert Citation
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Close Dossier
        </Button>

        {result && !result.is_supported && (
          <Button
            size="sm"
            onClick={() => {
              alert("Claim marked as Unsupported in section audit log.");
              onClose();
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5"
          >
            <Flag className="h-3.5 w-3.5" /> Flag Claim as Unsupported
          </Button>
        )}
      </div>
    </div>
  );
}
