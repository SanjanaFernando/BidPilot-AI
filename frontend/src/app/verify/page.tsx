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
    <div className="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-rose-900 selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-700 to-amber-600 font-bold text-white shadow-lg shadow-rose-950/50">
            BP
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
              BidPilot AI{" "}
              <span className="rounded border border-emerald-800/60 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[11px] text-emerald-400">
                VERIFY PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Public Document Integrity & E-Signature Verification
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-emerald-400 shadow-xl">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bid Verification Authority
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
            Enter the 64-character SHA-256 cryptographic hash printed on the proposal document or
            scanned from the certification QR badge.
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        >
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300">
              Proposal Document Hash (SHA-256)
            </label>
            <div className="relative">
              <Input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="e.g. c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
                className="border-slate-700 bg-slate-950 pr-10 font-mono text-xs text-slate-100 focus:ring-rose-500"
              />
              <Search className="absolute top-2.5 right-3 text-slate-500" size={16} />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!hashInput.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-950 hover:bg-rose-600"
          >
            Verify Cryptographic Seal <ArrowRight size={14} />
          </Button>

          <div className="border-t border-slate-800 pt-2 text-center">
            <span className="text-[11px] text-slate-400">
              Want to test with a verified demo bid?{" "}
            </span>
            <button
              type="button"
              onClick={() => setHashInput(DEMO_HASH)}
              className="font-mono text-[11px] text-emerald-400 hover:underline"
            >
              Load Sample Hash
            </button>
          </div>
        </form>

        <div className="mt-8 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
            <Lock size={16} className="mx-auto mb-1 text-rose-400" />
            <div className="text-[11px] font-bold text-slate-200">Tamper-Proof</div>
            <div className="text-[10px] text-slate-500">SHA-256 state matching</div>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
            <ShieldCheck size={16} className="mx-auto mb-1 text-emerald-400" />
            <div className="text-[11px] font-bold text-slate-200">Legally Binding</div>
            <div className="text-[10px] text-slate-500">Signer identity sealed</div>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
            <QrCode size={16} className="mx-auto mb-1 text-amber-400" />
            <div className="text-[11px] font-bold text-slate-200">QR Badge Ready</div>
            <div className="text-[10px] text-slate-500">Direct mobile scanning</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        BidPilot Enterprise Verification Portal • LankaTech Solutions Ltd
      </footer>
    </div>
  );
}
