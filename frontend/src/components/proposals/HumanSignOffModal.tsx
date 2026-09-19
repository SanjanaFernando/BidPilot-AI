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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Authorized Human Proposal Sign-Off
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Governance Gate
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Phase 10: Human executive review required prior to tender submission
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Proposal Summary Badge */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-medium">Proposal Target</div>
            <div className="text-sm font-bold text-white line-clamp-1">{proposalTitle}</div>
            <div className="flex items-center gap-3 text-xs pt-1">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {complianceScore}% Compliance
              </span>
              <span className="text-indigo-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {winProbability}% Win Probability
              </span>
            </div>
          </div>

          {/* Submission Readiness Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Submission Readiness Checklist
            </label>
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.mandatory_clauses_met}
                  onChange={(e) =>
                    setChecklist({ ...checklist, mandatory_clauses_met: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">100% Mandatory Clauses Addressed</div>
                  <div className="text-slate-400 text-[11px]">
                    All mandatory criteria verified by Compliance Agent and supported by citations.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.sla_confirmed}
                  onChange={(e) =>
                    setChecklist({ ...checklist, sla_confirmed: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Technical Architecture & SLA Confirmed</div>
                  <div className="text-slate-400 text-[11px]">
                    Delivery timeline, high availability, and 99.9% uptime SLA commitments approved.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.pricing_approved}
                  onChange={(e) =>
                    setChecklist({ ...checklist, pricing_approved: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Commercial Pricing & Team Allocation Reviewed</div>
                  <div className="text-slate-400 text-[11px]">
                    Senior key personnel and milestone deliverables validated against budget.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.legal_sign_off}
                  onChange={(e) =>
                    setChecklist({ ...checklist, legal_sign_off: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">ISO 27001 & Non-Disclosure Governance</div>
                  <div className="text-slate-400 text-[11px]">
                    Security claims verified without synthetic hallucinations.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Approver Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorized Approver Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Signer Role / Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={approverRole}
                onChange={(e) => setApproverRole(e.target.value)}
                placeholder="e.g. VP of Enterprise Bids"
                required
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Executive Review Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Executive Review Notes / Sign-Off Remarks
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any formal notes or stipulations for the submission record..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Proposal successfully signed off and marked ready for submission!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !allChecked || success}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                submitting || !allChecked || success
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording Authorization...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Authorized & Approved!
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
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
