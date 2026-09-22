"use client";

import { useState, useEffect, use, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { mockRequirements } from "@/lib/mock-data";
import { TendersService, TenderItem } from "@/lib/tenders-service";
import {
  searchKnowledge,
  searchRAG,
  DEFAULT_ORG_ID,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_COLORS,
  type KnowledgeChunkResult,
  type RAGChunkResult,
} from "@/lib/rag-service";
import {
  runAnalysis,
  loadAnalysisState,
  clearCachedAnalysis,
  type AnalysisProgress,
} from "@/lib/analysis-service";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { type RFPAnalysis, type ExtractedRequirement } from "@/lib/ai-service";
import {
  Clock,
  DollarSign,
  Building2,
  List,
  ShieldCheck,
  FileEdit,
  BarChart3,
  ArrowLeft,
  Bot,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  X,
  Sparkles,
  ExternalLink,
  Search,
  RefreshCw,
  Cpu,
  Tag,
  Award,
  Boxes,
  ChevronRight,
  Info,
  FileText,
  Zap,
  Trash2,
  Download,
  Filter,
  Eye,
  Check,
} from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  fetchRequirementMatrix,
  updateRequirement,
  downloadRequirementsCSV,
  evaluateSingleRequirement,
  type RequirementMatrixItem,
  type RequirementStatus,
  type RequirementSummaryStats,
} from "@/lib/requirements-service";
import RequirementEvidenceDrawer from "@/components/tenders/RequirementEvidenceDrawer";
import RequirementVerifyModal from "@/components/tenders/RequirementVerifyModal";
import MultiAgentWorkflowModal from "@/components/tenders/MultiAgentWorkflowModal";
import { useUserPermissions } from "@/hooks/useUserPermissions";


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_ORG_ID_STR = DEFAULT_ORG_ID;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SimilarityPill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const bg =
    pct >= 80 ? "#15803D" : pct >= 60 ? "#D97706" : pct >= 40 ? "#B45309" : "#94A3B8";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
      style={{ background: bg }}
    >
      {pct}% match
    </span>
  );
}

function RequirementStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    covered: { label: "Covered", color: "#15803D", bg: "#DCFCE7" },
    partially_covered: { label: "Partial", color: "#B45309", bg: "#FEF3C7" },
    missing: { label: "Missing", color: "#B91C1C", bg: "#FEE2E2" },
    evidence_required: { label: "Evidence Req.", color: "#7C3AED", bg: "#EDE9FE" },
    unverified: { label: "Unverified", color: "#64748B", bg: "#F1F5F9" },
  };
  const s = map[status] ?? map["unverified"];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Analysis Progress Modal
// ---------------------------------------------------------------------------

type AnalysisStep = "idle" | "running" | "done" | "error";

interface AnalysisState {
  step: AnalysisStep;
  progress: AnalysisProgress | null;
  errorMsg: string | null;
  analysis: RFPAnalysis | null;
  requirementsSaved: number;
  latencyMs: number;
  runId: string | null;
}

function AnalysisProgressModal({
  tender,
  onClose,
  onComplete,
}: {
  tender: TenderItem;
  onClose: () => void;
  onComplete: (analysis: RFPAnalysis, requirements: ExtractedRequirement[]) => void;
}) {
  const [state, setState] = useState<AnalysisState>({
    step: "idle",
    progress: null,
    errorMsg: null,
    analysis: null,
    requirementsSaved: 0,
    latencyMs: 0,
    runId: null,
  });

  const STEP_LABELS: Record<AnalysisProgress["step"], string> = {
    fetching_document: "Resolving RFP document & text",
    calling_gemini: "Gemini 2.0 Flash analyzing tender",
    parsing_output: "Parsing requirements & evaluation criteria",
    saving_requirements: "Saving requirements to database",
    done: "Analysis complete",
    error: "Error",
  };

  const STEPS_ORDER: AnalysisProgress["step"][] = [
    "fetching_document",
    "calling_gemini",
    "parsing_output",
    "saving_requirements",
    "done",
  ];

  const handleRun = useCallback(async () => {
    setState((s) => ({ ...s, step: "running", progress: null, errorMsg: null }));

    try {
      const result = await runAnalysis(
        {
          tenderId: tender.id,
          organizationId: DEFAULT_ORG_ID_STR,
          saveRequirements: true,
        },
        (p) => setState((s) => ({ ...s, progress: p })),
      );

      setState((s) => ({
        ...s,
        step: "done",
        analysis: result.analysis,
        requirementsSaved: result.requirements_saved,
        latencyMs: result.latency_ms,
        runId: result.run_id,
      }));

      onComplete(result.analysis, result.analysis.requirements);
    } catch (err) {
      setState((s) => ({
        ...s,
        step: "error",
        errorMsg: err instanceof Error ? err.message : "Analysis failed.",
      }));
    }
  }, [tender.id, onComplete]);

  const currentStep = state.progress?.step ?? "fetching_document";
  const currentPct = state.progress?.percent ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7A1C2C] to-[#B91C1C]">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1E252D]">AI RFP Analysis Agent</div>
              <div className="text-xs text-[#64748B]">Automated Tender Intelligence · Gemini Flash</div>
            </div>
          </div>
          {state.step !== "running" && (
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F1F5F9]">
              <X size={16} className="text-[#64748B]" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Idle State — Automated Agent Overview */}
          {state.step === "idle" && (
            <div className="space-y-4">
              {/* Tender Context Card */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Target Tender
                </div>
                <div className="text-sm font-bold text-[#1E252D] line-clamp-1">{tender.name}</div>
                <div className="text-xs text-[#64748B] mt-0.5 flex items-center gap-2">
                  <span>Client: <strong className="text-[#1E252D]">{tender.client}</strong></span>
                  <span>•</span>
                  <span>Industry: <strong className="text-[#1E252D]">{tender.industry}</strong></span>
                </div>
              </div>

              {/* Automated Extraction Highlights */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-3">
                <div className="text-xs font-bold text-[#1E252D] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#DDA625]" /> What the AI Agent will extract:
                </div>
                <div className="grid grid-cols-1 gap-2.5 text-xs text-[#475569]">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                      <CheckCircle2 size={11} />
                    </div>
                    <div>
                      <strong className="text-[#1E252D]">Categorized Requirements:</strong> Technical, Functional, Security & Compliance clauses with mandatory flags.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                      <CheckCircle2 size={11} />
                    </div>
                    <div>
                      <strong className="text-[#1E252D]">Evaluation Criteria:</strong> Scoring weights, technical qualification hurdles & financial matrices.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                      <CheckCircle2 size={11} />
                    </div>
                    <div>
                      <strong className="text-[#1E252D]">Scope & Tech Stack:</strong> Deliverables, timelines, certifications, and required technologies.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#64748B] text-center italic">
                The agent will automatically locate and process the uploaded RFP document for this tender.
              </div>
            </div>
          )}

          {/* Running — progress steps */}
          {state.step === "running" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {STEPS_ORDER.map((s) => {
                  const idx = STEPS_ORDER.indexOf(s);
                  const curIdx = STEPS_ORDER.indexOf(currentStep);
                  const done = idx < curIdx || state.progress?.step === "done";
                  const active = s === currentStep && state.step === "running";
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all
                          ${done ? "bg-[#15803D] text-white" : active ? "bg-[#7A1C2C] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}
                      >
                        {done ? (
                          <CheckCircle2 size={14} />
                        ) : active ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div
                        className={`text-xs font-medium ${active ? "text-[#1E252D]" : done ? "text-[#15803D]" : "text-[#94A3B8]"}`}
                      >
                        {STEP_LABELS[s]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-full rounded-full bg-[#7A1C2C] transition-all duration-500"
                    style={{ width: `${currentPct}%` }}
                  />
                </div>
                <div className="text-right text-[10px] text-[#94A3B8]">{currentPct}%</div>
              </div>

              {state.progress?.label && (
                <p className="text-xs italic text-[#64748B]">{state.progress.label}</p>
              )}
            </div>
          )}

          {/* Done */}
          {state.step === "done" && state.analysis && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <div className="text-sm font-bold text-green-800">Analysis Complete</div>
                  <div className="mt-0.5 text-xs text-green-700">
                    {state.analysis.requirements.length} requirements extracted in{" "}
                    {(state.latencyMs / 1000).toFixed(1)}s ·{" "}
                    {state.requirementsSaved} saved to database
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#1E252D]">RFP Summary</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#F7F9FB] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Title</div>
                    <div className="mt-0.5 text-xs font-medium text-[#1E252D] line-clamp-2">{state.analysis.title}</div>
                  </div>
                  <div className="rounded-lg bg-[#F7F9FB] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Client</div>
                    <div className="mt-0.5 text-xs font-medium text-[#1E252D] line-clamp-2">{state.analysis.client_name}</div>
                  </div>
                  <div className="rounded-lg bg-[#F7F9FB] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Deadline</div>
                    <div className="mt-0.5 text-xs font-medium text-[#1E252D]">{state.analysis.submission_deadline ?? "Not specified"}</div>
                  </div>
                  <div className="rounded-lg bg-[#F7F9FB] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Requirements</div>
                    <div className="mt-0.5 text-2xl font-extrabold text-[#7A1C2C]">{state.analysis.requirements.length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {state.step === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-red-800">
                <AlertTriangle size={14} /> Analysis Failed
              </div>
              <div className="text-xs text-red-700">{state.errorMsg}</div>
              <div className="mt-2 text-[11px] text-red-500">
                Make sure the AI service is running at <code className="font-mono">localhost:8000</code>{" "}
                and GEMINI_API_KEY is set.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between gap-3">
          {state.step === "idle" && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-9 border-[#E2E8F0] px-4 text-xs text-[#64748B]"
              >
                Cancel
              </Button>
              <Button
                id="start-analysis-btn"
                onClick={handleRun}
                className="h-9 gap-2 bg-[#7A1C2C] px-5 text-xs font-bold text-white hover:bg-[#631724]"
              >
                <Zap size={13} /> Start AI Analysis
              </Button>
            </>
          )}
          {state.step === "running" && (
            <div className="text-xs text-[#64748B] italic">
              Analysis in progress — please wait…
            </div>
          )}
          {(state.step === "done" || state.step === "error") && (
            <>
              {state.step === "error" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setState((s) => ({ ...s, step: "idle", errorMsg: null }))
                  }
                  className="h-9 border-[#E2E8F0] px-4 text-xs text-[#64748B]"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={onClose}
                className="ml-auto h-9 bg-[#7A1C2C] px-5 text-xs font-bold text-white hover:bg-[#631724]"
              >
                {state.step === "done" ? "View Results" : "Close"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RAG Evidence Modal (keep as secondary action)
// ---------------------------------------------------------------------------

type UnifiedResult =
  | ({ kind: "rfp" } & RAGChunkResult)
  | ({ kind: "kb" } & KnowledgeChunkResult);

function RAGResultModal({
  tender,
  onClose,
}: {
  tender: TenderItem;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(
    `Healthcare cloud platform experience for ${tender.name}`,
  );
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const [kbRes, rfpRes] = await Promise.allSettled([
        searchKnowledge(q, DEFAULT_ORG_ID, { topK: 4, similarityThreshold: 0.25 }),
        searchRAG(q, DEFAULT_ORG_ID, { topK: 3, similarityThreshold: 0.25 }),
      ]);
      const collected: UnifiedResult[] = [];
      if (kbRes.status === "fulfilled")
        kbRes.value.results.forEach((r) => collected.push({ kind: "kb", ...r }));
      if (rfpRes.status === "fulfilled")
        rfpRes.value.results.forEach((r) => collected.push({ kind: "rfp", ...r }));
      collected.sort((a, b) => b.similarity - a.similarity);
      setResults(collected);
      setLatencyMs(Math.round(performance.now() - t0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7A1C2C]/10">
              <Sparkles size={15} className="text-[#7A1C2C]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1E252D]">AI Evidence Retrieval</div>
              <div className="text-xs text-[#64748B]">Semantic search across KB + RFP</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F1F5F9]">
            <X size={16} className="text-[#64748B]" />
          </button>
        </div>

        <div className="border-b border-[#E2E8F0] px-6 py-3">
          <div className="flex items-center gap-2">
            <Search size={14} className="flex-shrink-0 text-[#94A3B8]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              className="flex-1 bg-transparent text-sm text-[#1E252D] outline-none placeholder:text-[#94A3B8]"
              placeholder="Search query…"
            />
            <Button
              onClick={() => runSearch(query)}
              disabled={loading}
              className="h-7 bg-[#7A1C2C] px-3 text-xs font-bold text-white hover:bg-[#631724]"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : "Re-run"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin text-[#7A1C2C]" />
                <p className="text-xs text-[#64748B]">Searching knowledge base + RFP chunks…</p>
              </div>
            </div>
          )}
          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <strong>Search error:</strong> {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} className="mb-3 text-[#CBD5E1]" />
              <div className="text-sm font-semibold text-[#475569]">No evidence found</div>
              <div className="mt-1 text-xs text-[#94A3B8]">
                Ingest your knowledge base first using the RAG Search Lab.
              </div>
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  <strong className="text-[#1E252D]">{results.length}</strong> evidence snippets
                </span>
                {latencyMs !== null && (
                  <span className="text-[11px] text-[#94A3B8]">{latencyMs}ms</span>
                )}
              </div>
              {results.map((r) => {
                if (r.kind === "kb") {
                  const color = SOURCE_TYPE_COLORS[r.source_type] || "#64748B";
                  return (
                    <div key={r.chunk_id} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white"
                          style={{ background: color }}
                        >
                          {SOURCE_TYPE_LABELS[r.source_type] || r.source_type}
                        </span>
                        <span className="text-xs font-bold text-[#1E252D]">{r.source_name}</span>
                        <SimilarityPill score={r.similarity} />
                      </div>
                      <p className="line-clamp-4 text-xs leading-relaxed text-[#475569]">{r.content}</p>
                    </div>
                  );
                }
                return (
                  <div key={r.chunk_id} className="rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                        RFP
                      </span>
                      <span className="text-xs font-semibold text-[#1E252D]">
                        {r.source_filename || "Document"} · Page {r.page_number}
                        {r.section ? ` · §${r.section}` : ""}
                      </span>
                      <SimilarityPill score={r.similarity} />
                    </div>
                    <p className="line-clamp-4 text-xs leading-relaxed text-[#475569]">{r.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
          <Link
            href="/knowledge/search"
            className="flex items-center gap-1 text-xs font-semibold text-[#7A1C2C] hover:underline"
          >
            <Sparkles size={11} /> Open full RAG Search Lab <ExternalLink size={10} />
          </Link>
          <Button
            onClick={onClose}
            variant="outline"
            className="h-8 border-[#E2E8F0] px-3 text-xs text-[#64748B]"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RFP Summary Card (shown after analysis)
// ---------------------------------------------------------------------------

function RFPSummaryCard({ analysis }: { analysis: RFPAnalysis }) {
  return (
    <Card className="border-[#E2E8F0] bg-white overflow-hidden">
      <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1E252D]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7A1C2C] to-[#B91C1C]">
              <Bot size={13} className="text-white" />
            </div>
            AI-Extracted RFP Intelligence
          </CardTitle>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700">
            ✓ Gemini Flash
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {/* Summary */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1">
            Executive Summary
          </div>
          <p className="text-sm leading-relaxed text-[#475569]">{analysis.summary}</p>
        </div>

        <Separator className="bg-[#E2E8F0]" />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Evaluation Criteria */}
          {analysis.evaluation_criteria.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                <BarChart3 size={12} className="text-[#7A1C2C]" /> Evaluation Criteria
              </div>
              <ul className="space-y-1">
                {analysis.evaluation_criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#475569]">
                    <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-[#7A1C2C]" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deliverables */}
          {analysis.deliverables.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                <Boxes size={12} className="text-[#DDA625]" /> Key Deliverables
              </div>
              <ul className="space-y-1">
                {analysis.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#475569]">
                    <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-[#DDA625]" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technologies required */}
          {analysis.technologies.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                <Cpu size={12} className="text-blue-600" /> Technologies Required
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.technologies.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications required */}
          {analysis.certifications_required.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                <Award size={12} className="text-[#15803D]" /> Certifications Required
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.certifications_required.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { hasPermission, roleDef } = useUserPermissions();
  const canRunAgents = hasPermission("agents:run");
  const canVerifyCompliance = hasPermission("compliance:verify");
  const canEditRequirements = hasPermission("requirements:edit");
  const canDeleteTender = hasPermission("tenders:delete");

  const [tender, setTender] = useState<TenderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showRAGModal, setShowRAGModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteTender = async () => {
    if (!id) return;
    if (confirm(`Are you sure you want to delete tender "${tender?.name || id}"?`)) {
      setDeleting(true);
      try {
        await TendersService.delete(id);
        clearCachedAnalysis(id);
        router.push("/tenders");
      } catch (err) {
        console.error("Failed to delete tender:", err);
        setDeleting(false);
      }
    }
  };

  // Phase 6 & 7 state
  const [analysis, setAnalysis] = useState<RFPAnalysis | null>(null);
  const [aiRequirements, setAiRequirements] = useState<ExtractedRequirement[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // Phase 7 Matrix State
  const [matrixRequirements, setMatrixRequirements] = useState<RequirementMatrixItem[]>([]);
  const [matrixStats, setMatrixStats] = useState<RequirementSummaryStats | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mandatoryFilter, setMandatoryFilter] = useState<"all" | "mandatory" | "optional">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReqForEvidence, setSelectedReqForEvidence] = useState<RequirementMatrixItem | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [showPipelineModal, setShowPipelineModal] = useState<boolean>(false);
  const [updatingReqId, setUpdatingReqId] = useState<string | null>(null);

  // Load tender
  useEffect(() => {
    let isMounted = true;
    async function fetchTender() {
      setLoading(true);
      try {
        const found = await TendersService.getById(id);
        if (isMounted) setTender(found);
      } catch (err) {
        console.error("Failed to load tender:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchTender();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Load requirement matrix from Phase 7 API
  const loadMatrix = useCallback(async () => {
    if (!id) return;
    setMatrixLoading(true);
    try {
      const data = await fetchRequirementMatrix(id, DEFAULT_ORG_ID_STR);
      setMatrixRequirements(data.requirements);
      setMatrixStats(data.stats);
    } catch (err) {
      console.warn("Could not fetch requirement matrix:", err);
    } finally {
      setMatrixLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Load cached/saved analysis state
  useEffect(() => {
    if (!id) return;
    setAnalysisLoading(true);
    loadAnalysisState(id, DEFAULT_ORG_ID_STR)
      .then(({ analysis: a, requirements: r }) => {
        if (a) setAnalysis(a);
        if (r.length > 0) setAiRequirements(r);
      })
      .catch(console.warn)
      .finally(() => setAnalysisLoading(false));
  }, [id]);

  const handleAnalysisComplete = useCallback(
    (a: RFPAnalysis, reqs: ExtractedRequirement[]) => {
      setAnalysis(a);
      setAiRequirements(reqs);
      setShowAnalysisModal(false);
      loadMatrix();
      setActiveTab("requirements");
    },
    [loadMatrix],
  );

  const handleInlineStatusChange = async (reqId: string, newStatus: RequirementStatus) => {
    setUpdatingReqId(reqId);
    try {
      await updateRequirement(reqId, DEFAULT_ORG_ID_STR, { status: newStatus });
      setMatrixRequirements((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );
      loadMatrix();
    } catch (e) {
      console.error("Inline status update failed:", e);
    } finally {
      setUpdatingReqId(null);
    }
  };

  const handleSingleRowVerify = async (reqItem: RequirementMatrixItem) => {
    setUpdatingReqId(reqItem.id);
    try {
      const res = await evaluateSingleRequirement(id, DEFAULT_ORG_ID_STR, reqItem.id);
      const ev = res.evaluation;
      setMatrixRequirements((prev) =>
        prev.map((r) =>
          r.id === reqItem.id
            ? {
                ...r,
                status: ev.status as RequirementStatus,
                match_score: ev.match_score,
                notes: ev.assessment_rationale,
                evidence_metadata: ev.evidence || [],
              }
            : r
        )
      );
      loadMatrix();
    } catch (e) {
      console.error("Single row verify failed:", e);
    } finally {
      setUpdatingReqId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#7A1C2C]" />
        <p className="text-xs text-[#64748B]">Loading tender details…</p>
      </div>
    );
  }

  if (!tender) notFound();

  // Requirements to display: prioritize Phase 7 live matrix, then Phase 6 extracted, then mock
  const hasLiveMatrix = matrixRequirements.length > 0;
  const isLiveData = hasLiveMatrix || aiRequirements.length > 0;

  // Filtered requirements for matrix table
  const filteredMatrix = matrixRequirements.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (mandatoryFilter === "mandatory" && !r.is_mandatory) return false;
    if (mandatoryFilter === "optional" && r.is_mandatory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.req_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = Array.from(new Set(matrixRequirements.map((r) => r.category))).filter(Boolean);

  const formattedDeadline =
    tender.deadline && !isNaN(Date.parse(tender.deadline))
      ? new Date(tender.deadline).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : tender.deadline || "TBD";

  const totalReqCount = matrixStats?.total ?? (isLiveData ? aiRequirements.length : tender.requirements || 0);
  const coveredCount = matrixStats?.covered ?? (isLiveData ? aiRequirements.filter((r) => r.is_mandatory).length : 0);
  const partialCount = matrixStats?.partially_covered ?? 0;
  const evidenceNeededCount = matrixStats?.evidence_required ?? 0;
  const missingCount = matrixStats?.missing ?? 0;
  const unverifiedCount = matrixStats?.unverified ?? 0;
  const coveragePercentage = matrixStats?.coverage_percentage ?? (tender.coverage || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Phase 6 RFP Analysis Modal */}
      {showAnalysisModal && tender && (
        <AnalysisProgressModal
          tender={tender}
          onClose={() => setShowAnalysisModal(false)}
          onComplete={handleAnalysisComplete}
        />
      )}

      {/* Phase 7 Batch Verification Agent Modal */}
      {showVerifyModal && tender && (
        <RequirementVerifyModal
          tenderId={id}
          tenderName={tender.name}
          organizationId={DEFAULT_ORG_ID_STR}
          totalRequirements={totalReqCount}
          onClose={() => setShowVerifyModal(false)}
          onComplete={() => {
            loadMatrix();
          }}
        />
      )}

      {/* Phase 8 Multi-Agent Proposal Pipeline Modal */}
      {showPipelineModal && tender && (
        <MultiAgentWorkflowModal
          tenderId={id}
          tenderTitle={tender.name}
          organizationId={DEFAULT_ORG_ID_STR}
          onClose={() => setShowPipelineModal(false)}
          onComplete={() => {
            loadMatrix();
          }}
        />
      )}

      {/* Phase 7 Traceable Object & Evidence Drawer ("Prove This Claim") */}
      {selectedReqForEvidence && (
        <RequirementEvidenceDrawer
          requirement={selectedReqForEvidence}
          organizationId={DEFAULT_ORG_ID_STR}
          onClose={() => setSelectedReqForEvidence(null)}
          onUpdated={(updated) => {
            setMatrixRequirements((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            loadMatrix();
          }}
        />
      )}

      {/* Phase 5 RAG Lab Modal */}
      {showRAGModal && tender && (
        <RAGResultModal tender={tender} onClose={() => setShowRAGModal(false)} />
      )}

      <Topbar title={tender.name} breadcrumb={["Tenders", tender.id]} />

      <main className="space-y-6 px-7">
        {/* Back Link */}
        <Link
          href="/tenders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] transition-colors hover:text-[#7A1C2C]"
        >
          <ArrowLeft size={14} /> Back to Tender Register
        </Link>

        {/* Tender Header Card */}
        <Card className="border-[#E2E8F0] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge status={tender.status} />
                  <span className="rounded bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-[#475569]">
                    {tender.industry}
                  </span>
                  <span className="font-mono text-xs text-[#64748B]">Ref: {tender.id}</span>
                  {analysis && (
                    <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7A1C2C] to-[#B91C1C] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      <Bot size={9} /> AI Analyzed
                    </span>
                  )}
                  {hasLiveMatrix && (
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700">
                      <ShieldCheck size={9} /> Requirement Matrix Active
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-[#1E252D]">{tender.name}</h2>
                <p className="max-w-3xl text-sm leading-relaxed text-[#64748B]">
                  {analysis?.summary || tender.description}
                </p>

                <div className="flex flex-wrap gap-6 pt-2 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building2 size={14} className="text-[#7A1C2C]" />
                    <strong className="text-[#1E252D]">Authority:</strong>{" "}
                    {analysis?.client_name || tender.client}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <DollarSign size={14} className="text-[#DDA625]" />
                    <strong className="text-[#1E252D]">Estimated Value:</strong> {tender.value}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock size={14} className="text-[#64748B]" />
                    <strong className="text-[#1E252D]">Deadline:</strong>{" "}
                    {analysis?.submission_deadline || formattedDeadline}
                  </span>
                </div>
              </div>

              {/* Coverage Gauge */}
              <div className="flex min-w-[140px] flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
                <div className="text-3xl font-extrabold text-[#7A1C2C] tabular-nums">
                  {coveragePercentage}%
                </div>
                <div className="mt-1 text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
                  Coverage Score
                </div>
                <div className="mt-1 text-[10px] text-[#94A3B8]">
                  {coveredCount} of {totalReqCount} Covered
                </div>
              </div>
            </div>

            <Separator className="my-5 bg-[#E2E8F0]" />

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                id="run-ai-analysis-btn"
                disabled={!canRunAgents}
                onClick={() => canRunAgents && setShowAnalysisModal(true)}
                title={
                  !canRunAgents
                    ? `Running RFP Analysis requires 'agents:run' permission (Disabled for ${roleDef.displayName})`
                    : undefined
                }
                className={`h-9 gap-2 px-4 text-xs font-semibold ${
                  canRunAgents
                    ? "bg-[#7A1C2C] text-white hover:bg-[#631724] cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
                }`}
              >
                <Bot size={14} />
                {analysis ? "Re-Analyze RFP" : "Run AI RFP Analysis"}
              </Button>

              <Button
                id="run-ai-verify-btn"
                disabled={!canRunAgents && !canVerifyCompliance}
                onClick={() => (canRunAgents || canVerifyCompliance) && setShowVerifyModal(true)}
                title={
                  !canRunAgents && !canVerifyCompliance
                    ? `Running verification requires 'agents:run' or 'compliance:verify' permission (Disabled for ${roleDef.displayName})`
                    : undefined
                }
                className={`h-9 gap-2 px-4 text-xs font-bold ${
                  canRunAgents || canVerifyCompliance
                    ? "border-none bg-gradient-to-r from-[#DDA625] to-[#B45309] text-white shadow-xs hover:opacity-90 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
                }`}
              >
                <Sparkles size={14} />
                Run Requirement Verification Agent
              </Button>

              <Button
                id="run-multi-agent-pipeline-btn"
                disabled={!canRunAgents}
                onClick={() => canRunAgents && setShowPipelineModal(true)}
                title={
                  !canRunAgents
                    ? `Running multi-agent pipeline requires 'agents:run' permission (Disabled for ${roleDef.displayName})`
                    : undefined
                }
                className={`h-9 gap-2 px-4 text-xs font-bold ${
                  canRunAgents
                    ? "border-none bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
                }`}
              >
                <Zap size={14} />
                Run Multi-Agent Proposal Pipeline
              </Button>

              <Button
                variant="outline"
                onClick={() => downloadRequirementsCSV(id, DEFAULT_ORG_ID_STR, tender.name)}
                className="h-9 gap-2 border-[#CBD5E1] px-4 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                <Download size={14} /> Export Compliance Matrix (CSV)
              </Button>

              <Link href={`/proposals/${tender.id}`}>
                <Button className="h-9 gap-2 border border-[#E2E8F0] bg-white px-4 text-xs font-semibold text-[#1E252D] hover:bg-[#F8FAFC]">
                  <FileEdit size={14} /> Open Proposal Editor
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={() => canDeleteTender && handleDeleteTender()}
                disabled={deleting || !canDeleteTender}
                title={
                  !canDeleteTender
                    ? `Deleting tenders requires 'tenders:delete' permission (Disabled for ${roleDef.displayName})`
                    : undefined
                }
                className={`ml-auto h-9 gap-2 text-xs font-semibold ${
                  canDeleteTender
                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    : "border-slate-200 text-slate-300 cursor-not-allowed opacity-40 pointer-events-auto"
                }`}
              >
                <Trash2 size={14} />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="h-auto rounded-lg border border-[#E2E8F0] bg-white p-1">
            <TabsTrigger
              value="overview"
              className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-[#7A1C2C] data-[state=active]:text-white"
            >
              <BarChart3 size={14} /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-[#7A1C2C] data-[state=active]:text-white"
            >
              <List size={14} /> Requirement Matrix ({totalReqCount})
              {hasLiveMatrix && (
                <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0 text-[9px] font-bold text-green-700">
                  Live
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-[#7A1C2C] data-[state=active]:text-white"
            >
              <ShieldCheck size={14} /> Compliance Audit
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-4 pt-1">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#7A1C2C] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#1E252D] tabular-nums">
                    {totalReqCount}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Total Requirements
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#15803D] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#15803D] tabular-nums">
                    {coveredCount}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Fully Covered
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#B45309] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#B45309] tabular-nums">
                    {partialCount}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Partially Covered
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#B91C1C] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#B91C1C] tabular-nums">
                    {missingCount + evidenceNeededCount}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Gaps &amp; Evidence Needed
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RFP Intelligence Card */}
            {analysis ? (
              <RFPSummaryCard analysis={analysis} />
            ) : (
              <Card className="border-[#E2E8F0] bg-white">
                <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1E252D]">
                      <Bot size={16} className="text-[#7A1C2C]" />
                      Run AI RFP Analysis First
                    </div>
                    <div className="mt-1 text-xs text-[#64748B]">
                      Upload the RFP PDF and run the AI analysis to extract structured
                      requirements, evaluation criteria, technologies, and certifications.
                    </div>
                  </div>
                  <Button
                    disabled={!canRunAgents}
                    onClick={() => canRunAgents && setShowAnalysisModal(true)}
                    title={
                      !canRunAgents
                        ? `Running analysis requires 'agents:run' permission (Disabled for ${roleDef.displayName})`
                        : undefined
                    }
                    className={`h-9 shrink-0 px-4 text-xs font-semibold ${
                      canRunAgents
                        ? "bg-[#7A1C2C] text-white hover:bg-[#631724] cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
                    }`}
                  >
                    Start Analysis
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Multi-Agent Orchestration Card */}
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 text-white shadow-md">
              <CardContent className="flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                      <Zap size={14} />
                    </span>
                    <span className="text-sm font-bold text-white">
                      Phase 8 — Autonomous Multi-Agent Proposal Generation
                    </span>
                    <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-200 border border-indigo-500/40">
                      7 Specialized Agents
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Execute the end-to-end pipeline: Technical Agent (architecture &amp; cloud), Business Agent (case studies &amp; SLAs), Proposal Agent (10 markdown sections), Compliance Agent, and Review Agent (win probability scoring).
                  </p>
                </div>
                <Button
                  disabled={!canRunAgents}
                  onClick={() => canRunAgents && setShowPipelineModal(true)}
                  title={
                    !canRunAgents
                      ? `Running multi-agent pipeline requires 'agents:run' permission (Disabled for ${roleDef.displayName})`
                      : undefined
                  }
                  className={`h-9 shrink-0 gap-1.5 px-4 text-xs font-bold border ${
                    canRunAgents
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/30 border-indigo-400/30 cursor-pointer"
                      : "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-60 pointer-events-auto"
                  }`}
                >
                  <Zap size={14} />
                  Launch Multi-Agent Pipeline
                </Button>
              </CardContent>
            </Card>

            {/* Proposal Status */}
            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <CardTitle className="text-sm font-bold text-[#1E252D]">
                  Quick Actions &amp; Proposal Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
                <div>
                  <div className="text-sm font-semibold text-[#1E252D]">
                    Proposal Draft Ready for Review
                  </div>
                  <div className="mt-1 text-xs text-[#64748B]">
                    Requirements traceability matrix verified with {coveragePercentage}% compliance coverage.
                  </div>
                </div>
                <Link href={`/proposals/${tender.id}`}>
                  <Button className="h-9 bg-[#7A1C2C] px-4 text-xs font-semibold text-white hover:bg-[#631724]">
                    Open Full Proposal Editor
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Requirements Tab (Phase 7 Traceable Matrix) ── */}
          <TabsContent value="requirements" className="space-y-4 pt-1">
            {/* Status Filter Tabs Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "all", label: "All", count: totalReqCount, bg: "#F1F5F9", text: "#475569" },
                  { key: "covered", label: "Covered", count: coveredCount, bg: "#DCFCE7", text: "#15803D" },
                  { key: "partially_covered", label: "Partial", count: partialCount, bg: "#FEF3C7", text: "#B45309" },
                  { key: "evidence_required", label: "Evidence Req.", count: evidenceNeededCount, bg: "#EDE9FE", text: "#7C3AED" },
                  { key: "missing", label: "Missing", count: missingCount, bg: "#FEE2E2", text: "#B91C1C" },
                  { key: "unverified", label: "Unverified", count: unverifiedCount, bg: "#F8FAFC", text: "#64748B" },
                ].map((st) => {
                  const isActive = statusFilter === st.key;
                  return (
                    <button
                      key={st.key}
                      onClick={() => setStatusFilter(st.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#7A1C2C] text-white shadow-xs"
                          : "text-[#475569] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <span>{st.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                          isActive ? "bg-white/20 text-white" : ""
                        }`}
                        style={!isActive ? { background: st.bg, color: st.text } : {}}
                      >
                        {st.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  disabled={!canRunAgents && !canVerifyCompliance}
                  onClick={() => (canRunAgents || canVerifyCompliance) && setShowVerifyModal(true)}
                  title={
                    !canRunAgents && !canVerifyCompliance
                      ? `AI verification requires 'agents:run' or 'compliance:verify' permission (Disabled for ${roleDef.displayName})`
                      : undefined
                  }
                  size="sm"
                  className={`h-8 gap-1.5 px-3 text-xs font-semibold ${
                    canRunAgents || canVerifyCompliance
                      ? "bg-[#7A1C2C] text-white hover:bg-[#631724] cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
                  }`}
                >
                  <Bot size={13} /> Run AI Verification
                </Button>

                <Button
                  onClick={() => downloadRequirementsCSV(id, DEFAULT_ORG_ID_STR, tender.name)}
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-[#CBD5E1] px-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  <Download size={13} /> Export CSV
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[220px] flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Filter requirements by keyword or ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white py-1.5 pl-9 pr-3 text-xs text-[#1E252D] placeholder:text-[#94A3B8] focus:border-[#7A1C2C] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-[#94A3B8] hover:text-[#1E252D]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category selector */}
                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] focus:border-[#7A1C2C] focus:outline-none"
                  >
                    <option value="all">All Categories ({categories.length})</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                {/* Mandatory toggle */}
                <select
                  value={mandatoryFilter}
                  onChange={(e) => setMandatoryFilter(e.target.value as any)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] focus:border-[#7A1C2C] focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="mandatory">Mandatory Only</option>
                  <option value="optional">Optional Only</option>
                </select>
              </div>

              <div className="text-xs text-[#64748B]">
                Showing <strong>{filteredMatrix.length}</strong> of {totalReqCount} requirements
              </div>
            </div>

            {/* Matrix Table */}
            <Card className="overflow-hidden border-[#E2E8F0] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="gov-table w-full">
                  <thead>
                    <tr>
                      <th className="w-24">Ref. ID</th>
                      <th className="w-28">Category</th>
                      <th>Requirement Specification</th>
                      <th className="w-24">Priority</th>
                      <th className="w-28">RFP Source</th>
                      <th className="w-40">Coverage Status</th>
                      <th className="w-24">Match</th>
                      <th className="w-36 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrix.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                          <Search size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
                          No requirements match your current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMatrix.map((req) => {
                        const isUpdating = updatingReqId === req.id;
                        return (
                          <tr key={req.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td>
                              <span className="font-mono text-xs font-extrabold text-[#7A1C2C]">
                                {req.req_code}
                              </span>
                            </td>
                            <td>
                              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
                                {req.category}
                              </span>
                            </td>
                            <td className="max-w-md">
                              <div className="text-xs font-bold text-[#1E252D]">{req.title}</div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-[#64748B]">
                                {req.description}
                              </div>
                              {req.notes && (
                                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#7A1C2C] italic">
                                  <Info size={10} /> {req.notes.slice(0, 80)}…
                                </div>
                              )}
                            </td>
                            <td>
                              <span
                                className="rounded px-2 py-0.5 text-[10px] font-bold"
                                style={{
                                  background: req.is_mandatory ? "#FEE2E2" : "#F1F5F9",
                                  color: req.is_mandatory ? "#B91C1C" : "#64748B",
                                }}
                              >
                                {req.is_mandatory ? "Mandatory" : "Optional"}
                              </span>
                            </td>
                            <td className="font-mono text-xs text-[#64748B]">
                              {req.source_page ? `Page ${req.source_page}` : "—"}
                              {req.source_section && (
                                <div className="text-[10px] text-[#94A3B8] truncate max-w-[100px]">
                                  §{req.source_section}
                                </div>
                              )}
                            </td>
                            <td>
                              {/* Interactive Inline Status Selector */}
                              <select
                                value={req.status}
                                disabled={isUpdating || !canEditRequirements}
                                onChange={(e) =>
                                  canEditRequirements &&
                                  handleInlineStatusChange(req.id, e.target.value as RequirementStatus)
                                }
                                title={
                                  !canEditRequirements
                                    ? `Changing status requires 'requirements:edit' permission (Disabled for ${roleDef.displayName})`
                                    : undefined
                                }
                                className={`rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] font-bold text-[#1E252D] focus:border-[#7A1C2C] focus:outline-none ${
                                  canEditRequirements && !isUpdating
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed opacity-60 pointer-events-auto"
                                }`}
                              >
                                <option value="covered">✓ Covered</option>
                                <option value="partially_covered">⚠ Partial</option>
                                <option value="evidence_required">? Evidence Req.</option>
                                <option value="missing">✗ Missing</option>
                                <option value="unverified">○ Unverified</option>
                              </select>
                            </td>
                            <td>
                              <div className="flex flex-col gap-1">
                                <span className="font-mono text-xs font-bold text-[#1E252D]">
                                  {req.match_score || 0}%
                                </span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E2E8F0]">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(100, req.match_score || 0)}%`,
                                      background:
                                        (req.match_score || 0) >= 75
                                          ? "#15803D"
                                          : (req.match_score || 0) >= 40
                                          ? "#B45309"
                                          : "#B91C1C",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Prove Claim / Evidence Drawer Button */}
                                <Button
                                  onClick={() => setSelectedReqForEvidence(req)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 border-[#CBD5E1] px-2 text-[10px] font-bold text-[#7A1C2C] hover:bg-[#FDF2F4] cursor-pointer"
                                  title="Signature Feature: Prove this claim with company evidence citations"
                                >
                                  <Eye size={11} /> Evidence
                                </Button>

                                {/* AI Verify Button */}
                                <Button
                                  onClick={() =>
                                    (canRunAgents || canVerifyCompliance) &&
                                    handleSingleRowVerify(req)
                                  }
                                  disabled={isUpdating || (!canRunAgents && !canVerifyCompliance)}
                                  size="sm"
                                  className={`h-7 w-7 p-0 transition-all ${
                                    (canRunAgents || canVerifyCompliance) && !isUpdating
                                      ? "bg-[#F1F5F9] text-[#475569] hover:bg-[#7A1C2C] hover:text-white cursor-pointer"
                                      : "bg-slate-100 text-slate-300 cursor-not-allowed opacity-50 pointer-events-auto"
                                  }`}
                                  title={
                                    !canRunAgents && !canVerifyCompliance
                                      ? `AI evaluation requires 'agents:run' or 'compliance:verify' permission (Disabled for ${roleDef.displayName})`
                                      : "Run AI capability evaluation"
                                  }
                                >
                                  {isUpdating ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={11} />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Compliance Tab ── */}
          <TabsContent value="compliance" className="space-y-4 pt-1">
            <div className="space-y-3">
              {[
                {
                  label: "Mandatory Requirements Verification",
                  desc: `${coveredCount} of ${matrixStats?.mandatory_total ?? totalReqCount} mandatory requirements covered with direct company evidence citations.`,
                  status: coveredCount === totalReqCount ? "Covered" : "Partial",
                  icon: <AlertTriangle size={18} className="text-[#B45309]" />,
                },
                {
                  label: "Evidence Citations & Traceability Dossier",
                  desc: `${evidenceNeededCount} requirements flagged with 'Evidence Required' requiring verification against company case studies.`,
                  status: evidenceNeededCount === 0 ? "Covered" : "Evidence Required",
                  icon: <HelpCircle size={18} className="text-[#B45309]" />,
                },
                {
                  label: "ISO 27001 Security Standard & Regulatory Compliance",
                  desc: "Security requirements mapped against active company credentials and architecture standards.",
                  status: "Covered",
                  icon: <CheckCircle2 size={18} className="text-[#15803D]" />,
                },
                {
                  label: "Capability Contradiction & Gap Detection",
                  desc: `${missingCount} capability gaps detected. Partnering or alternative solutions suggested.`,
                  status: missingCount === 0 ? "Covered" : "Missing",
                  icon: <ShieldCheck size={18} className="text-[#15803D]" />,
                },
              ].map((item, i) => (
                <Card key={i} className="border-[#E2E8F0] bg-white">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-[#1E252D]">{item.label}</div>
                      <div className="mt-0.5 text-xs text-[#64748B]">{item.desc}</div>
                    </div>
                    <Badge status={item.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

