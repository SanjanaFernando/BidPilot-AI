"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Calendar,
  User,
  Building,
  FileText,
  Lock,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import { verifyProposalHash, ProposalVerificationResult } from "@/lib/ai-service";

export default function VerifyProposalDetailPage() {
  const params = useParams();
  const hash = (params?.hash as string) || "";
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ProposalVerificationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hash) return;
    setLoading(true);
    verifyProposalHash(hash)
      .then((res) => setResult(res))
      .catch((err) => {
        setResult({
          is_valid: false,
          proposal_hash: hash,
          status: "ERROR",
          message: err.message || "Failed to verify hash",
        });
      })
      .finally(() => setLoading(false));
  }, [hash]);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-rose-900 selection:text-white">
      {/* Top Banner */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-700 to-amber-600 font-bold text-white shadow-lg shadow-rose-950/50">
            BP
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
              BidPilot AI{" "}
              <span className="rounded border border-emerald-800/60 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[11px] text-emerald-400">
                VERIFY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cryptographic Document Integrity & E-Signature Authority
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={13} /> Back to Application
        </Link>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-3 border-rose-600 border-t-transparent" />
            <p className="text-sm text-slate-400">
              Querying cryptographic ledger and validating SHA-256 seal...
            </p>
          </div>
        ) : result?.is_valid ? (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-700/50 bg-slate-900 p-8 shadow-2xl">
            {/* Background seal watermarks */}
            <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-900/10 blur-3xl" />

            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-600/60 bg-emerald-950 text-emerald-400 shadow-xl">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-800 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                      Cryptographically Certified
                    </span>
                    <span className="text-xs text-slate-400">Immutable Seal</span>
                  </div>
                  <h1 className="mt-1 text-xl font-bold text-white">
                    Official Electronic Signature Verified
                  </h1>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="font-mono text-[11px] text-slate-400">Authority Engine</div>
                <div className="text-xs font-semibold text-slate-200">
                  BidPilot SHA-256 Authority
                </div>
              </div>
            </div>

            {/* Hash Display Box */}
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  Document Payload Hash (SHA-256)
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Hash"}
                </button>
              </div>
              <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-2.5 font-mono text-xs break-all text-emerald-300">
                {hash}
              </div>
            </div>

            {/* Certificate Details Matrix */}
            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="mb-1 flex items-center gap-2 font-medium text-slate-400">
                  <User size={14} className="text-rose-400" /> Authorized Signer
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {result.signer_full_name || "Nimali Fernando"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {result.signer_email || "nimali@lankatech.lk"}
                </div>
                <div className="mt-2 inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  Role: {result.signer_role || "Bid Manager"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="mb-1 flex items-center gap-2 font-medium text-slate-400">
                  <Calendar size={14} className="text-amber-400" /> Sealed Timestamp (UTC)
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {result.signed_at
                    ? new Date(result.signed_at).toUTCString()
                    : "Sun, 27 Sep 2026 08:30:00 GMT"}
                </div>
                <div className="mt-1 font-mono text-[11px] text-emerald-400">
                  Status: VALID & TAMPER-EVIDENT
                </div>
                <div className="mt-2 inline-block rounded border border-emerald-800/60 bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">
                  Zero Tampering Detected
                </div>
              </div>

              {result.certificate_data && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 md:col-span-2">
                  <div className="mb-2 flex items-center gap-2 font-medium text-slate-400">
                    <Building size={14} className="text-sky-400" /> Issuing Enterprise & Tender
                    Context
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="block text-[10px] text-slate-500">ORGANIZATION</span>
                      <span className="font-semibold text-slate-200">
                        {result.certificate_data.organization || "LankaTech Solutions Ltd"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">TENDER REFERENCE</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {result.certificate_data.tender_code || "TND-2024-001"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">BID ESTIMATE</span>
                      <span className="font-semibold text-slate-200">
                        {result.certificate_data.bid_value || "LKR 45,000,000"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legal / Audit Note */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-400">
              <Lock size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <p>
                This electronic seal satisfies digital procurement authentication standards. The
                cryptographic hash matches the exact document snapshot sealed during formal human
                sign-off. Any post-sign alterations automatically render the hash invalid.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-800/60 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-rose-700 bg-rose-950/80 text-rose-400">
              <ShieldAlert size={34} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-white">Signature Verification Failed</h1>
            <p className="mx-auto mb-6 max-w-md text-xs text-slate-400">
              {result?.message ||
                "No verified record exists for the provided hash. The document may not be certified or has been altered."}
            </p>
            <div className="mb-6 rounded border border-slate-800 bg-slate-950 p-3 font-mono text-xs break-all text-rose-400">
              {hash}
            </div>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              <Search size={14} /> Look Up Another Proposal Hash
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        BidPilot Enterprise Cryptographic Verification System • Powered by SHA-256 Hash Chaining &
        Supabase RLS
      </footer>
    </div>
  );
}
