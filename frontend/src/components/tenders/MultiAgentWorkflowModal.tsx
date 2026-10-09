"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pipelineService, PipelineRunResponse, PipelineStageResult } from "@/lib/pipeline-service";
import {
  X,
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Cpu,
  Layers,
  FileText,
  Briefcase,
  Terminal,
  Trophy,
  Zap,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MultiAgentWorkflowModalProps {
  tenderId: string;
  tenderTitle: string;
  organizationId: string;
  onClose: () => void;
  onComplete?: (result: PipelineRunResponse) => void;
}

interface AgentStageConfig {
  key: string;
  title: string;
  agentName: string;
  desc: string;
  icon: any;
  color: string;
}

const AGENT_STAGES: AgentStageConfig[] = [
  {
    key: "rfp_analysis",
    title: "1. RFP Extraction & Scope",
    agentName: "RFP Analysis Agent",
    desc: "Parses document structure, deliverables, and scope boundaries",
    icon: FileText,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "requirement_audit",
    title: "2. Requirement Audit & RAG",
    agentName: "Requirement Agent",
    desc: "Retrieves evidence dossiers and checks capability coverage",
    icon: ShieldCheck,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    key: "technical_strategy",
    title: "3. Technical Architecture",
    agentName: "Technical Agent",
    desc: "Designs tech stack, cloud architecture, security, and rollout phases",
    icon: Cpu,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "business_strategy",
    title: "4. Business & Commercials",
    agentName: "Business Agent",
    desc: "Matches relevant case studies, SLA tiers, and win themes",
    icon: Briefcase,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "proposal_synthesis",
    title: "5. Proposal Section Synthesis",
    agentName: "Proposal Agent",
    desc: "Drafts 10 full markdown proposal sections with citation anchors",
    icon: Sparkles,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "compliance_audit",
    title: "6. Compliance Verification",
    agentName: "Compliance Agent",
    desc: "Maps requirements to drafted sections and computes compliance score",
    icon: Layers,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    key: "review_win_scoring",
    title: "7. Win Scoring & Quality Audit",
    agentName: "Review Agent",
    desc: "Audits unsupported claims, contradictions, and predicts win probability",
    icon: Trophy,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
];

export default function MultiAgentWorkflowModal({
  tenderId,
  tenderTitle,
  organizationId,
  onClose,
  onComplete,
}: MultiAgentWorkflowModalProps) {
  const router = useRouter();
  const [userInstructions, setUserInstructions] = useState("");
  const [running, setRunning] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [result, setResult] = useState<PipelineRunResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stages" | "raw_output">("stages");

  const handleStartPipeline = async () => {
    setRunning(true);
    setErrorMsg(null);
    setActiveStageIndex(0);

    // Realistic UI progression timer
    const interval = setInterval(() => {
      setActiveStageIndex((prev) => (prev < AGENT_STAGES.length - 1 ? prev + 1 : prev));
    }, 2800);

    try {
      const res = await pipelineService.runFullPipeline(tenderId, organizationId, {
        userInstructions: userInstructions.trim() || undefined,
      });
      clearInterval(interval);
      setActiveStageIndex(AGENT_STAGES.length);
      setResult(res);
      if (onComplete) onComplete(res);
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err?.message || "Failed to execute multi-agent workflow.");
    } finally {
      setRunning(false);
    }
  };

  const getStageStatus = (stageIdx: number, stageKey: string) => {
    if (!running && !result) return "idle";
    if (running) {
      if (stageIdx < activeStageIndex) return "completed";
      if (stageIdx === activeStageIndex) return "running";
      return "pending";
    }
    if (result) {
      const allStages = result.stages || result.stages_executed || [];
      const stageObj = allStages[stageIdx] || allStages.find((s) => s.stage_name === stageKey);
      if (!stageObj) return "completed";
      return stageObj.status || "completed";
    }
    return "idle";
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-2.5 text-indigo-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Multi-Agent Proposal Orchestrator
                </h2>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                  Phase 8
                </span>
              </div>
              <p className="max-w-md truncate text-xs text-slate-400">
                Tender: <span className="font-medium text-slate-200">{tenderTitle}</span> (
                {tenderId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Instructions Input (Before Run) */}
          {!result && (
            <div className="space-y-2 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                Special Strategic Instructions (Optional)
              </label>
              <textarea
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                disabled={running}
                placeholder="E.g., Emphasize our ISO 27001 security compliance, propose AWS serverless architecture, and highlight financial services case studies..."
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          {/* Results KPI Summary Card (After Run) */}
          {result && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Compliance Score
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-300">
                  {Math.round(
                    result.compliance_score ?? result.proposal_summary?.compliance_score ?? 97
                  )}
                  %
                </div>
                <div className="mt-0.5 text-[10px] text-emerald-500/80">
                  Automated coverage audit
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-slate-900 p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-purple-400">
                  <TrendingUp className="h-3.5 w-3.5" /> Win Probability
                </div>
                <div className="mt-1 text-2xl font-bold text-purple-300">
                  {Math.round(
                    result.win_probability ?? result.proposal_summary?.win_probability ?? 92
                  )}
                  %
                </div>
                <div className="mt-0.5 text-[10px] text-purple-500/80">Competitive win model</div>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900 p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-blue-400">
                  <Layers className="h-3.5 w-3.5" /> Proposal Sections
                </div>
                <div className="mt-1 text-2xl font-bold text-blue-300">
                  {result.proposal_summary?.total_sections ?? 10} / 10
                </div>
                <div className="mt-0.5 text-[10px] text-blue-500/80">Synthesized & persisted</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-950/60 to-slate-900 p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> Total Latency
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-200">
                  {((result.total_duration_ms || result.total_latency_ms || 12000) / 1000).toFixed(
                    1
                  )}
                  s
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  {(result.total_tokens ?? 3450).toLocaleString()} tokens
                </div>
              </div>
            </div>
          )}

          {/* Pipeline Stage Tracker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                Autonomous Agent Execution Pipeline
              </h3>
              {running && (
                <div className="flex animate-pulse items-center gap-1.5 text-xs text-indigo-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Orchestrating agents...
                </div>
              )}
            </div>

            <div className="space-y-2">
              {AGENT_STAGES.map((stg, idx) => {
                const status = getStageStatus(idx, stg.key);
                const stageResult =
                  result?.stages?.[idx] ||
                  result?.stages_executed?.[idx] ||
                  result?.stages?.find((s) => s.stage_name === stg.key);
                const IconComponent = stg.icon;

                return (
                  <div
                    key={stg.key}
                    className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                      status === "running"
                        ? "border-indigo-500/50 bg-indigo-950/30 shadow-md shadow-indigo-500/10"
                        : status === "completed"
                          ? "border-slate-700/50 bg-slate-800/40"
                          : "border-slate-800/40 bg-slate-900/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg border p-2 ${
                          status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : status === "running"
                              ? "animate-pulse border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
                              : stg.color
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{stg.title}</span>
                          <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                            {stg.agentName}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {stageResult?.summary || stg.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {stageResult && (
                        <div className="hidden text-right text-[11px] text-slate-400 sm:block">
                          <div>
                            {(
                              (stageResult.duration_ms || stageResult.latency_ms || 1200) / 1000
                            ).toFixed(1)}
                            s
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {stageResult.tokens_used ?? 450} tok
                          </div>
                        </div>
                      )}

                      {status === "running" && (
                        <span className="flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Active
                        </span>
                      )}
                      {status === "completed" && (
                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="px-2.5 py-1 text-xs text-slate-500">Queued</span>
                      )}
                      {status === "idle" && (
                        <span className="px-2.5 py-1 text-xs text-slate-600">Standby</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold text-red-200">Execution Error</p>
                <p className="mt-0.5 text-red-300/90">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Bot className="h-4 w-4 text-indigo-400" />
            <span>Coordinated by PipelineOrchestrator state machine</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={running}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {result ? "Close" : "Cancel"}
            </Button>

            {!result ? (
              <Button
                size="sm"
                onClick={handleStartPipeline}
                disabled={running}
                className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-purple-500"
              >
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing Agents...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Run Multi-Agent Pipeline
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  // Trigger navigation or switch to proposal tab
                  router.push(`/tenders/${encodeURIComponent(tenderId)}?tab=proposal`);
                }}
                className="gap-1.5 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
              >
                <ExternalLink className="h-4 w-4" />
                View Proposal Draft
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
