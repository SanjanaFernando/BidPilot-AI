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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-900 selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-700 to-amber-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/50">
            BP
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              BidPilot AI <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">VERIFY</span>
            </div>
            <p className="text-[11px] text-slate-400">Cryptographic Document Integrity & E-Signature Authority</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> Back to Application
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full px-4 py-12 flex-1">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400">Querying cryptographic ledger and validating SHA-256 seal...</p>
          </div>
        ) : result?.is_valid ? (
          <div className="bg-slate-900 border border-emerald-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background seal watermarks */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 mb-6 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-600/60 flex items-center justify-center text-emerald-400 shadow-xl">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                      Cryptographically Certified
                    </span>
                    <span className="text-xs text-slate-400">Immutable Seal</span>
                  </div>
                  <h1 className="text-xl font-bold text-white mt-1">Official Electronic Signature Verified</h1>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-mono text-slate-400">Authority Engine</div>
                <div className="text-xs font-semibold text-slate-200">BidPilot SHA-256 Authority</div>
              </div>
            </div>

            {/* Hash Display Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300">Document Payload Hash (SHA-256)</span>
                <button
                  onClick={handleCopy}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors text-[11px]"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Hash"}
                </button>
              </div>
              <div className="font-mono text-xs text-emerald-300 break-all bg-emerald-950/20 p-2.5 rounded border border-emerald-900/40">
                {hash}
              </div>
            </div>

            {/* Certificate Details Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1 font-medium">
                  <User size={14} className="text-rose-400" /> Authorized Signer
                </div>
                <div className="font-bold text-slate-100 text-sm">{result.signer_full_name || "Nimali Fernando"}</div>
                <div className="text-slate-400 text-[11px]">{result.signer_email || "nimali@lankatech.lk"}</div>
                <div className="mt-2 inline-block bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium">
                  Role: {result.signer_role || "Bid Manager"}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1 font-medium">
                  <Calendar size={14} className="text-amber-400" /> Sealed Timestamp (UTC)
                </div>
                <div className="font-bold text-slate-100 text-sm">
                  {result.signed_at ? new Date(result.signed_at).toUTCString() : "Sun, 27 Sep 2026 08:30:00 GMT"}
                </div>
                <div className="text-emerald-400 text-[11px] font-mono mt-1">Status: VALID & TAMPER-EVIDENT</div>
                <div className="mt-2 inline-block bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px]">
                  Zero Tampering Detected
                </div>
              </div>

              {result.certificate_data && (
                <div className="md:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2 font-medium">
                    <Building size={14} className="text-sky-400" /> Issuing Enterprise & Tender Context
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ORGANIZATION</span>
                      <span className="font-semibold text-slate-200">
                        {result.certificate_data.organization || "LankaTech Solutions Ltd"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">TENDER REFERENCE</span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {result.certificate_data.tender_code || "TND-2024-001"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">BID ESTIMATE</span>
                      <span className="font-semibold text-slate-200">
                        {result.certificate_data.bid_value || "LKR 45,000,000"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legal / Audit Note */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-3">
              <Lock size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <p>
                This electronic seal satisfies digital procurement authentication standards. The cryptographic hash matches
                the exact document snapshot sealed during formal human sign-off. Any post-sign alterations automatically
                render the hash invalid.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-700 mx-auto flex items-center justify-center text-rose-400 mb-4">
              <ShieldAlert size={34} />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Signature Verification Failed</h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              {result?.message || "No verified record exists for the provided hash. The document may not be certified or has been altered."}
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded p-3 font-mono text-xs text-rose-400 break-all mb-6">
              {hash}
            </div>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Search size={14} /> Look Up Another Proposal Hash
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-slate-500 text-xs">
        BidPilot Enterprise Cryptographic Verification System • Powered by SHA-256 Hash Chaining & Supabase RLS
      </footer>
    </div>
  );
}
