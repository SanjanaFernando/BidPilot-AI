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
  Award,
  TrendingUp,
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200">
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white text-[#1E252D] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#991B1B] text-white shadow-sm">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1E252D]">
                  Authorized Human Proposal Sign-Off
                </h2>
                <span className="rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">
                  Governance Gate
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Executive Review: Human sign-off required prior to tender submission
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E252D]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {/* Proposal Summary Badge */}
          <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="text-xs font-medium text-[#64748B]">Proposal Target</div>
            <div className="line-clamp-1 text-sm font-bold text-[#1E252D]">{proposalTitle}</div>
            <div className="flex items-center gap-4 pt-1 text-xs">
              <span className="flex items-center gap-1 font-semibold text-[#15803D]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {complianceScore}% Compliance
              </span>
              <span className="flex items-center gap-1 font-semibold text-[#B45309]">
                <TrendingUp className="h-3.5 w-3.5" />
                {winProbability}% Win Probability
              </span>
            </div>
          </div>

          {/* Submission Readiness Checklist */}
          <div>
            <label className="mb-2.5 block text-xs font-bold tracking-wider text-[#64748B] uppercase">
              Submission Readiness Checklist
            </label>
            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1] hover:bg-white">
                <input
                  type="checkbox"
                  checked={checklist.mandatory_clauses_met}
                  onChange={(e) =>
                    setChecklist({ ...checklist, mandatory_clauses_met: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#7A1C2C] focus:ring-[#7A1C2C]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#1E252D]">
                    100% Mandatory Clauses Addressed
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    All mandatory criteria verified by Compliance Agent and supported by citations.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1] hover:bg-white">
                <input
                  type="checkbox"
                  checked={checklist.sla_confirmed}
                  onChange={(e) => setChecklist({ ...checklist, sla_confirmed: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#7A1C2C] focus:ring-[#7A1C2C]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#1E252D]">
                    Technical Architecture &amp; SLA Confirmed
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Delivery timeline, high availability, and 99.9% uptime SLA commitments approved.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1] hover:bg-white">
                <input
                  type="checkbox"
                  checked={checklist.pricing_approved}
                  onChange={(e) =>
                    setChecklist({ ...checklist, pricing_approved: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#7A1C2C] focus:ring-[#7A1C2C]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#1E252D]">
                    Commercial Model &amp; Pricing Approved
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Financial schedule, rate cards, and billing milestones signed off by Finance.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1] hover:bg-white">
                <input
                  type="checkbox"
                  checked={checklist.legal_sign_off}
                  onChange={(e) => setChecklist({ ...checklist, legal_sign_off: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#7A1C2C] focus:ring-[#7A1C2C]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#1E252D]">
                    Legal &amp; Contractual Terms Validated
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    No liability contradictions, confidentiality agreements aligned with master terms.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1] hover:bg-white">
                <input
                  type="checkbox"
                  checked={checklist.human_authorization}
                  onChange={(e) =>
                    setChecklist({ ...checklist, human_authorization: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#7A1C2C] focus:ring-[#7A1C2C]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#1E252D]">
                    Executive Authorization Confirmed
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Authorizing officer asserts that proposal claims represent true organizational capabilities.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Approver Details */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#1E252D]">
                Authorized Approver Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#1E252D] focus:border-[#7A1C2C] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#1E252D]">
                Signer Role / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={approverRole}
                onChange={(e) => setApproverRole(e.target.value)}
                placeholder="e.g. VP of Enterprise Bids"
                required
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#1E252D] focus:border-[#7A1C2C] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
              />
            </div>
          </div>

          {/* Executive Review Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#1E252D]">
              Executive Review Notes / Sign-Off Remarks
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any formal notes or stipulations for the submission record..."
              className="w-full resize-none rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#1E252D] focus:border-[#7A1C2C] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
            />
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-[#BBF7D0] bg-[#DCFCE7] p-3 text-xs text-[#15803D]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Proposal successfully signed off and marked ready for submission!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#E2E8F0] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569] transition-colors hover:bg-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !allChecked || success}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                submitting || !allChecked || success
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "bg-[#7A1C2C] text-white shadow-sm hover:bg-[#631724]"
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
                  Authorized &amp; Approved!
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
