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
  project: "bg-blue-50 text-blue-700 border-blue-200",
  employee: "bg-purple-50 text-purple-700 border-purple-200",
  certification: "bg-emerald-50 text-emerald-700 border-emerald-200",
  technology: "bg-amber-50 text-amber-700 border-amber-200",
  document: "bg-slate-100 text-slate-700 border-slate-200",
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
    <div className="animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[#E2E8F0] bg-white text-[#1E252D] shadow-2xl duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#991B1B] text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-[#1E252D]">
                Prove This Claim Dossier
              </h2>
              <span className="rounded-full border border-[#F5D0D6] bg-[#FDF2F4] px-2 py-0.5 text-[10px] font-bold text-[#7A1C2C]">
                Verified Evidence
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Traceable ground truth validation against company knowledge chunks
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E252D]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Selected Claim Quote Card */}
        <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
            <Quote className="h-3.5 w-3.5 text-[#7A1C2C]" />
            Selected Proposal Claim
          </div>
          <p className="font-sans text-xs leading-relaxed text-[#1E252D] italic">&ldquo;{claimText}&rdquo;</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-3 p-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#7A1C2C]" />
            <p className="text-xs font-medium text-[#64748B]">
              Searching company projects, employees, and certifications...
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <span className="font-bold text-red-800">Verification Engine Notice:</span>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {result && (
          <div className="space-y-4">
            {/* Status Strip */}
            <div
              className={`flex items-center justify-between rounded-xl border p-4 ${
                result.verification_status === "verified"
                  ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]"
                  : result.verification_status === "partially_supported"
                    ? "border-amber-200 bg-amber-50 text-[#B45309]"
                    : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.verification_status === "verified" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : result.verification_status === "partially_supported" ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase">
                    {result.verification_status === "verified"
                      ? "Fully Grounded & Verified Claim"
                      : result.verification_status === "partially_supported"
                        ? "Partially Supported Claim"
                        : "Unsupported Claim (Flagged)"}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-80">
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
                <div className="text-[9px] font-bold tracking-wider uppercase opacity-70">
                  Confidence
                </div>
              </div>
            </div>

            {/* Assessment Rationale */}
            <div className="space-y-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1E252D]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#7A1C2C]" />
                Evidence Grounding Rationale
              </div>
              <p className="text-xs leading-relaxed text-[#475569]">
                {result.assessment_rationale}
              </p>
            </div>

            {/* Supporting Evidence Chunks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#64748B] uppercase">
                  <Layers className="h-3.5 w-3.5 text-[#7A1C2C]" />
                  Supporting Evidence ({result.supporting_evidence.length})
                </div>
                <span className="text-[10px] text-[#94A3B8]">Cosine vector similarity</span>
              </div>

              {result.supporting_evidence.length === 0 ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center text-xs text-[#64748B]">
                  No supporting knowledge chunks found matching this query threshold.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.supporting_evidence.map((ev, idx) => {
                    const IconComp = SOURCE_ICONS[ev.source_type.toLowerCase()] || FileText;
                    const colorClass =
                      SOURCE_COLORS[ev.source_type.toLowerCase()] || "bg-slate-100 text-slate-700 border-slate-200";
                    const isTopMatch = idx === 0;

                    return (
                      <div
                        key={idx}
                        className={`space-y-2 rounded-xl border p-3.5 transition-all ${
                          isTopMatch
                            ? "border-[#CBD5E1] bg-white shadow-xs"
                            : "border-[#E2E8F0] bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${colorClass}`}
                            >
                              <IconComp className="h-3 w-3" />
                              {ev.source_type.toUpperCase()}
                            </span>
                            <span className="truncate text-xs font-bold text-[#1E252D]">
                              {ev.source_name}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-md border border-[#BBF7D0] bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">
                              {Math.round(ev.similarity_score * 100)}% Match
                            </span>
                          </div>
                        </div>

                        <p className="line-clamp-3 rounded-lg border border-[#E2E8F0] bg-white p-2.5 font-sans text-xs leading-relaxed text-[#475569]">
                          &ldquo;{ev.content_snippet}&rdquo;
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[10px] text-[#64748B]">
                            {ev.source_id && (
                              <span className="mr-2 font-mono">ID: {ev.source_id}</span>
                            )}
                            {ev.source_section && <span>Section: {ev.source_section}</span>}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleInsertCitation(ev, idx)}
                            disabled={insertingIndex !== null}
                            className="h-7 gap-1 bg-[#7A1C2C] text-[11px] font-semibold text-white hover:bg-[#631724]"
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
      <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
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
            className="gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700"
          >
            <Flag className="h-3.5 w-3.5" /> Flag Claim as Unsupported
          </Button>
        )}
      </div>
    </div>
  );
}
