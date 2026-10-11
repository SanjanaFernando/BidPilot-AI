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
    <div className="flex min-h-screen flex-col justify-between bg-[#F7F9FB] text-[#1E252D]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7A1C2C] font-bold text-white shadow-xs">
            BP
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#1E252D]">
              BidPilot AI{" "}
              <span className="rounded border border-[#BBF7D0] bg-[#DCFCE7] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#15803D]">
                VERIFY PORTAL
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Public Document Integrity &amp; E-Signature Verification
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] transition-colors hover:text-[#7A1C2C]"
        >
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] shadow-xs">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E252D]">
            Bid Verification Authority
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#64748B]">
            Enter the 64-character SHA-256 cryptographic hash printed on the proposal document or
            scanned from the certification QR badge.
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#1E252D]">
              Proposal Document Hash (SHA-256)
            </label>
            <div className="relative">
              <Input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="e.g. c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
                className="border-[#CBD5E1] bg-[#F8FAFC] pr-10 font-mono text-xs text-[#1E252D] focus:border-[#7A1C2C] focus:bg-white focus:ring-[#7A1C2C]"
              />
              <Search className="absolute top-2.5 right-3 text-[#94A3B8]" size={16} />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!hashInput.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1C2C] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#631724]"
          >
            Verify Cryptographic Seal <ArrowRight size={14} />
          </Button>

          <div className="border-t border-[#E2E8F0] pt-3 text-center">
            <span className="text-[11px] text-[#64748B]">
              Want to test with a verified demo bid?{" "}
            </span>
            <button
              type="button"
              onClick={() => setHashInput(DEMO_HASH)}
              className="font-mono text-[11px] font-semibold text-[#15803D] hover:underline"
            >
              Load Sample Hash
            </button>
          </div>
        </form>

        <div className="mt-8 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xs">
            <Lock size={16} className="mx-auto mb-1 text-[#7A1C2C]" />
            <div className="text-[11px] font-bold text-[#1E252D]">Tamper-Proof</div>
            <div className="text-[10px] text-[#64748B]">SHA-256 state matching</div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xs">
            <ShieldCheck size={16} className="mx-auto mb-1 text-[#15803D]" />
            <div className="text-[11px] font-bold text-[#1E252D]">Legally Binding</div>
            <div className="text-[10px] text-[#64748B]">Signer identity sealed</div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xs">
            <QrCode size={16} className="mx-auto mb-1 text-[#B45309]" />
            <div className="text-[11px] font-bold text-[#1E252D]">QR Badge Ready</div>
            <div className="text-[10px] text-[#64748B]">Direct mobile scanning</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-4 text-center text-xs text-[#64748B]">
        BidPilot Enterprise Verification Portal • LankaTech Solutions Ltd
      </footer>
    </div>
  );
}
