"use client";

import React, { useState } from "react";
import {
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Lock,
  Calendar,
  Sparkles,
  Award,
} from "lucide-react";
import { complianceService, GovernanceStatus } from "@/lib/compliance-service";

interface HumanSignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalTitle: string;
  complianceScore: number;
  winProbability: number;
  onSignOffSuccess?: (status: GovernanceStatus) => void;
}

export function HumanSignOffModal({
  isOpen,
  onClose,
  proposalId,
  proposalTitle,
  complianceScore,
  winProbability,
  onSignOffSuccess,
}: HumanSignOffModalProps) {
  const [approverName, setApproverName] = useState("Jane Doe");
  const [approverRole, setApproverRole] = useState("Director of Bid Management");
  const [reviewNotes, setReviewNotes] = useState(
    "All mandatory RFP criteria cross-checked and verified. Technical architecture, SLA governance, and past performance case studies confirmed."
  );
  const [checklist, setChecklist] = useState({
    mandatory_clauses_met: true,
    sla_confirmed: true,
    pricing_approved: true,
    legal_sign_off: true,
    human_authorization: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const allChecked = Object.values(checklist).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverName.trim()) {
      setError("Please enter the authorized approver name.");
      return;
    }
    if (!allChecked) {
      setError("Please verify all checklist items before authorizing proposal submission.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await complianceService.signOffProposal(
        proposalId,
        approverName,
        approverRole,
        reviewNotes,
        checklist
      );
      setSuccess(true);
      if (onSignOffSuccess) {
        onSignOffSuccess(res);
      }
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to submit proposal sign-off");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm duration-200">
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Authorized Human Proposal Sign-Off
                </h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  Governance Gate
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Phase 10: Human executive review required prior to tender submission
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {/* Proposal Summary Badge */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-xs font-medium text-slate-400">Proposal Target</div>
            <div className="line-clamp-1 text-sm font-bold text-white">{proposalTitle}</div>
            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {complianceScore}% Compliance
              </span>
              <span className="flex items-center gap-1 font-semibold text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" />
                {winProbability}% Win Probability
              </span>
            </div>
          </div>

          {/* Submission Readiness Checklist */}
          <div>
            <label className="mb-2.5 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Submission Readiness Checklist
            </label>
            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 transition-colors hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={checklist.mandatory_clauses_met}
                  onChange={(e) =>
                    setChecklist({ ...checklist, mandatory_clauses_met: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">
                    100% Mandatory Clauses Addressed
                  </div>
                  <div className="text-[11px] text-slate-400">
                    All mandatory criteria verified by Compliance Agent and supported by citations.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 transition-colors hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={checklist.sla_confirmed}
                  onChange={(e) => setChecklist({ ...checklist, sla_confirmed: e.target.checked })}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">
                    Technical Architecture & SLA Confirmed
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Delivery timeline, high availability, and 99.9% uptime SLA commitments approved.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 transition-colors hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={checklist.pricing_approved}
                  onChange={(e) =>
                    setChecklist({ ...checklist, pricing_approved: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">
                    Commercial Pricing & Team Allocation Reviewed
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Senior key personnel and milestone deliverables validated against budget.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 transition-colors hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={checklist.legal_sign_off}
                  onChange={(e) => setChecklist({ ...checklist, legal_sign_off: e.target.checked })}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">
                    ISO 27001 & Non-Disclosure Governance
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Security claims verified without synthetic hallucinations.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Approver Details */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Authorized Approver Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Signer Role / Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={approverRole}
                onChange={(e) => setApproverRole(e.target.value)}
                placeholder="e.g. VP of Enterprise Bids"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Executive Review Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Executive Review Notes / Sign-Off Remarks
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any formal notes or stipulations for the submission record..."
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Proposal successfully signed off and marked ready for submission!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !allChecked || success}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                submitting || !allChecked || success
                  ? "cursor-not-allowed bg-slate-800 text-slate-500"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950 hover:from-emerald-500 hover:to-teal-500"
              }`}
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Recording Authorization...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Authorized & Approved!
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Authorize Tender Submission
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
