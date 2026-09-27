"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Search, QrCode, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEMO_HASH = "c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2";

export default function VerifyPortalIndexPage() {
  const [hashInput, setHashInput] = useState("");
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    router.push(`/verify/${encodeURIComponent(hashInput.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-700 to-amber-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/50">
            BP
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              BidPilot AI <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">VERIFY PORTAL</span>
            </div>
            <p className="text-[11px] text-slate-400">Public Document Integrity & E-Signature Verification</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto w-full px-4 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-xl">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bid Verification Authority</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
            Enter the 64-character SHA-256 cryptographic hash printed on the proposal document or scanned from the certification QR badge.
          </p>
        </div>

        <form onSubmit={handleVerify} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Proposal Document Hash (SHA-256)</label>
            <div className="relative">
              <Input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="e.g. c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
                className="bg-slate-950 border-slate-700 text-slate-100 font-mono text-xs pr-10 focus:ring-rose-500"
              />
              <Search className="absolute right-3 top-2.5 text-slate-500" size={16} />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!hashInput.trim()}
            className="w-full bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-rose-950 flex items-center justify-center gap-2"
          >
            Verify Cryptographic Seal <ArrowRight size={14} />
          </Button>

          <div className="pt-2 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">Want to test with a verified demo bid? </span>
            <button
              type="button"
              onClick={() => setHashInput(DEMO_HASH)}
              className="text-[11px] text-emerald-400 hover:underline font-mono"
            >
              Load Sample Hash
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-center">
          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
            <Lock size={16} className="text-rose-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">Tamper-Proof</div>
            <div className="text-[10px] text-slate-500">SHA-256 state matching</div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
            <ShieldCheck size={16} className="text-emerald-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">Legally Binding</div>
            <div className="text-[10px] text-slate-500">Signer identity sealed</div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
            <QrCode size={16} className="text-amber-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">QR Badge Ready</div>
            <div className="text-[10px] text-slate-500">Direct mobile scanning</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-slate-500 text-xs">
        BidPilot Enterprise Verification Portal • LankaTech Solutions Ltd
      </footer>
    </div>
  );
}
