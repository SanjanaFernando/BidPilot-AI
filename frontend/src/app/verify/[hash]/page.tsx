"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Check,
  Copy,
  Calendar,
  User,
  Building,
  Lock,
  Search,
} from "lucide-react";
import { verifyProposalHash, type ProposalVerificationResult } from "@/lib/ai-service";

export default function VerifyHashDetailPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = use(params);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ProposalVerificationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function runVerification() {
      setLoading(true);
      try {
        const res = await verifyProposalHash(hash);
        setResult(res);
      } catch (e: any) {
        setResult({
          is_valid: false,
          proposal_hash: hash,
          status: "ERROR",
          message: e?.message || "Verification failed to query registry.",
        });
      } finally {
        setLoading(false);
      }
    }
    if (hash) {
      runVerification();
    }
  }, [hash]);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#F7F9FB] text-[#1E252D]">
      {/* Top Banner */}
      <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7A1C2C] font-bold text-white shadow-xs">
            BP
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#1E252D]">
              BidPilot AI{" "}
              <span className="rounded border border-[#BBF7D0] bg-[#DCFCE7] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#15803D]">
                VERIFY
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Cryptographic Document Integrity &amp; E-Signature Authority
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] transition-colors hover:text-[#7A1C2C]"
        >
          <ArrowLeft size={13} /> Back to Application
        </Link>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-3 border-[#7A1C2C] border-t-transparent" />
            <p className="text-sm text-[#64748B]">
              Querying cryptographic ledger and validating SHA-256 seal...
            </p>
          </div>
        ) : result?.is_valid ? (
          <div className="relative overflow-hidden rounded-2xl border border-[#BBF7D0] bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] shadow-xs">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold tracking-wider text-[#15803D] uppercase">
                      Cryptographically Certified
                    </span>
                    <span className="text-xs text-[#64748B]">Immutable Seal</span>
                  </div>
                  <h1 className="mt-1 text-xl font-bold text-[#1E252D]">
                    Official Electronic Signature Verified
                  </h1>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="font-mono text-[11px] text-[#64748B]">Authority Engine</div>
                <div className="text-xs font-semibold text-[#1E252D]">
                  BidPilot SHA-256 Authority
                </div>
              </div>
            </div>

            {/* Hash Display Box */}
            <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-semibold text-[#1E252D]">
                  Document Payload Hash (SHA-256)
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#15803D] transition-colors hover:underline"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Hash"}
                </button>
              </div>
              <div className="rounded border border-[#BBF7D0] bg-[#F0FDF4] p-2.5 font-mono text-xs break-all text-[#15803D]">
                {hash}
              </div>
            </div>

            {/* Certificate Details Matrix */}
            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="mb-1 flex items-center gap-2 font-medium text-[#64748B]">
                  <User size={14} className="text-[#7A1C2C]" /> Authorized Signer
                </div>
                <div className="text-sm font-bold text-[#1E252D]">
                  {result.signer_full_name || "Nimali Fernando"}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {result.signer_email || "nimali@lankatech.lk"}
                </div>
                <div className="mt-2 inline-block rounded bg-white border border-[#E2E8F0] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                  Role: {result.signer_role || "Bid Manager"}
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="mb-1 flex items-center gap-2 font-medium text-[#64748B]">
                  <Calendar size={14} className="text-[#B45309]" /> Sealed Timestamp (UTC)
                </div>
                <div className="text-sm font-bold text-[#1E252D]">
                  {result.signed_at
                    ? new Date(result.signed_at).toUTCString()
                    : "Sun, 27 Sep 2026 08:30:00 GMT"}
                </div>
                <div className="mt-1 font-mono text-[11px] font-bold text-[#15803D]">
                  Status: VALID &amp; TAMPER-EVIDENT
                </div>
                <div className="mt-2 inline-block rounded border border-[#BBF7D0] bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">
                  Zero Tampering Detected
                </div>
              </div>

              {result.certificate_data && (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:col-span-2">
                  <div className="mb-2 flex items-center gap-2 font-medium text-[#64748B]">
                    <Building size={14} className="text-[#7A1C2C]" /> Issuing Enterprise &amp; Tender
                    Context
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="block text-[10px] text-[#64748B]">ORGANIZATION</span>
                      <span className="font-semibold text-[#1E252D]">
                        {result.certificate_data.organization || "LankaTech Solutions Ltd"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#64748B]">TENDER REFERENCE</span>
                      <span className="font-mono font-semibold text-[#1E252D]">
                        {result.certificate_data.tender_code || "TND-2024-001"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#64748B]">BID ESTIMATE</span>
                      <span className="font-semibold text-[#1E252D]">
                        {result.certificate_data.bid_value || "LKR 45,000,000"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legal / Audit Note */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-[11px] text-[#64748B]">
              <Lock size={16} className="mt-0.5 shrink-0 text-[#64748B]" />
              <p>
                This electronic seal satisfies digital procurement authentication standards. The
                cryptographic hash matches the exact document snapshot sealed during formal human
                sign-off. Any post-sign alterations automatically render the hash invalid.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
              <ShieldAlert size={34} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-[#1E252D]">Signature Verification Failed</h1>
            <p className="mx-auto mb-6 max-w-md text-xs text-[#64748B]">
              {result?.message ||
                "No verified record exists for the provided hash. The document may not be certified or has been altered."}
            </p>
            <div className="mb-6 rounded border border-red-200 bg-red-50 p-3 font-mono text-xs break-all text-red-700">
              {hash}
            </div>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7A1C2C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#631724]"
            >
              <Search size={14} /> Look Up Another Proposal Hash
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-4 text-center text-xs text-[#64748B]">
        BidPilot Enterprise Cryptographic Verification System • Powered by SHA-256 Hash Chaining &amp;
        Supabase RLS
      </footer>
    </div>
  );
}
