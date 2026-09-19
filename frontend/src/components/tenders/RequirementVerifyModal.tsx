"use client";

import { useState } from "react";
import {
  evaluateTenderRequirements,
  BatchEvaluateResponse,
} from "@/lib/requirements-service";
import {
  X,
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Database,
  Cpu,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequirementVerifyModalProps {
  tenderId: string;
  tenderName: string;
  organizationId: string;
  totalRequirements: number;
  onClose: () => void;
  onComplete: (result: BatchEvaluateResponse) => void;
}

export default function RequirementVerifyModal({
  tenderId,
  tenderName,
  organizationId,
  totalRequirements,
  onClose,
  onComplete,
}: RequirementVerifyModalProps) {
  const [mode, setMode] = useState<"all" | "unverified_only" | "force_recheck">("all");
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<BatchEvaluateResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const STEPS = [
    { title: "Querying Requirements", desc: "Loading traceable objects from database" },
    { title: "Generating Embeddings", desc: "Vectorizing requirement specifications" },
    { title: "RAG Semantic Retrieval", desc: "Matching company projects, employees & certifications" },
    { title: "AI Compliance Assessment", desc: "Gemini evaluating capability coverage & gap analysis" },
    { title: "Persisting Matrix & Coverage", desc: "Saving citations and recalculating compliance scores" },
  ];

  const handleStartEvaluation = async () => {
    setRunning(true);
    setErrorMsg(null);
    setStepIndex(0);

    // Simulated progress steps for smooth UX
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const res = await evaluateTenderRequirements(tenderId, organizationId, mode);
      clearInterval(interval);
      setStepIndex(STEPS.length - 1);
      setResult(res);
      onComplete(res);
    } catch (err) {
      clearInterval(interval);
      setErrorMsg(err instanceof Error ? err.message : "Requirement evaluation failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#B91C1C] text-white shadow-sm">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E252D]">AI Requirement Verification Agent</h3>
              <p className="text-xs text-[#64748B]">Multi-Source Capability Matching &amp; Compliance Audit</p>
            </div>
          </div>
          {!running && (
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!result && !running && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Target Tender
                </div>
                <div className="text-sm font-bold text-[#1E252D]">{tenderName}</div>
                <div className="text-xs text-[#64748B] mt-0.5">
                  Total Requirements to audit: <strong className="text-[#1E252D]">{totalRequirements}</strong>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-2">
                  Evaluation Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="eval_mode"
                      value="all"
                      checked={mode === "all"}
                      onChange={() => setMode("all")}
                      className="accent-[#7A1C2C]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#1E252D]">Evaluate All Requirements</div>
                      <div className="text-[11px] text-[#64748B]">
                        Run full semantic RAG &amp; Gemini capability assessment on every requirement.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="eval_mode"
                      value="unverified_only"
                      checked={mode === "unverified_only"}
                      onChange={() => setMode("unverified_only")}
                      className="accent-[#7A1C2C]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#1E252D]">Evaluate Unverified Only</div>
                      <div className="text-[11px] text-[#64748B]">
                        Skip requirements that have already been evaluated or manually approved.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Information Banner */}
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-[#DDA625]" />
                <div className="leading-relaxed">
                  The agent scans company project portfolios, employee certifications, and verified technologies
                  to automatically classify requirements as <strong>Covered</strong>, <strong>Partially Covered</strong>, <strong>Missing</strong>, or <strong>Evidence Required</strong>.
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Running Progress State */}
          {running && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-1">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF2F4] text-[#7A1C2C] animate-pulse">
                  <Bot size={24} />
                </div>
                <h4 className="text-sm font-bold text-[#1E252D]">Running Requirement Verification Agent…</h4>
                <p className="text-xs text-[#64748B]">Analyzing {totalRequirements} requirements against company knowledge</p>
              </div>

              {/* Step Tracker */}
              <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                {STEPS.map((s, idx) => {
                  const isDone = idx < stepIndex;
                  const isCurrent = idx === stepIndex;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      {isDone ? (
                        <CheckCircle2 size={16} className="text-[#15803D] shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 size={16} className="animate-spin text-[#7A1C2C] shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-[#CBD5E1] bg-white shrink-0" />
                      )}
                      <div>
                        <div className={`font-bold ${isCurrent ? "text-[#7A1C2C]" : isDone ? "text-[#1E252D]" : "text-[#94A3B8]"}`}>
                          {s.title}
                        </div>
                        <div className="text-[11px] text-[#64748B]">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results State */}
          {result && !running && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
                <CheckCircle2 size={24} className="text-[#15803D] shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Requirement Verification Complete!</h4>
                  <p className="text-xs text-green-800 mt-0.5">{result.message}</p>
                </div>
              </div>

              {/* Stats Summary Grid */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-center">
                  <div className="text-xl font-extrabold text-[#15803D]">{Number(result.stats?.covered ?? 0)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Covered</div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-center">
                  <div className="text-xl font-extrabold text-[#B45309]">{Number(result.stats?.partially_covered ?? 0)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Partial</div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-center">
                  <div className="text-xl font-extrabold text-[#7C3AED]">{Number(result.stats?.evidence_required ?? 0)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Evidence Req.</div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-center">
                  <div className="text-xl font-extrabold text-[#B91C1C]">{Number(result.stats?.missing ?? 0)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Missing</div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#64748B]">Overall Compliance Coverage</div>
                  <div className="text-lg font-bold text-[#1E252D]">
                    {Number(result.stats?.coverage_percentage ?? 0)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#64748B]">Execution Latency</div>
                  <div className="text-sm font-mono text-[#64748B]">{result.latency_ms} ms</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={running}
            className="border-[#CBD5E1] text-xs font-semibold text-[#64748B]"
          >
            {result ? "Close" : "Cancel"}
          </Button>

          {!result && (
            <Button
              onClick={handleStartEvaluation}
              disabled={running}
              className="gap-2 bg-[#7A1C2C] px-5 text-xs font-bold text-white hover:bg-[#631724]"
            >
              {running ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-[#DDA625]" /> Start Verification Agent
                </>
              )}
            </Button>
          )}

          {result && (
            <Button
              onClick={onClose}
              className="bg-[#7A1C2C] px-5 text-xs font-bold text-white hover:bg-[#631724]"
            >
              View Updated Matrix
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
