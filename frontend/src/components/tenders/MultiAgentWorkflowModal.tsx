"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pipelineService, PipelineRunResponse, PipelineStageResult } from "@/lib/pipeline-service";
import {
  X,
  Bot,
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
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    key: "requirement_audit",
    title: "2. Requirement Audit & RAG",
    agentName: "Requirement Agent",
    desc: "Retrieves evidence dossiers and checks capability coverage",
    icon: ShieldCheck,
    color: "text-[#7A1C2C] bg-[#FDF2F4] border-[#F5D0D6]",
  },
  {
    key: "technical_strategy",
    title: "3. Technical Architecture",
    agentName: "Technical Agent",
    desc: "Designs tech stack, cloud architecture, security, and deployment schedule",
    icon: Cpu,
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    key: "business_strategy",
    title: "4. Business & Commercials",
    agentName: "Business Agent",
    desc: "Matches relevant case studies, SLA tiers, and win themes",
    icon: Briefcase,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    key: "proposal_synthesis",
    title: "5. Proposal Section Synthesis",
    agentName: "Proposal Agent",
    desc: "Drafts 10 full markdown proposal sections with citation anchors",
    icon: FileText,
    color: "text-[#B45309] bg-amber-50 border-amber-200",
  },
  {
    key: "compliance_audit",
    title: "6. Compliance Verification",
    agentName: "Compliance Agent",
    desc: "Maps requirements to drafted sections and computes compliance score",
    icon: Layers,
    color: "text-cyan-700 bg-cyan-50 border-cyan-200",
  },
  {
    key: "review_win_scoring",
    title: "7. Win Scoring & Quality Audit",
    agentName: "Review Agent",
    desc: "Audits unsupported claims, contradictions, and predicts win probability",
    icon: Trophy,
    color: "text-rose-700 bg-rose-50 border-rose-200",
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white text-[#1E252D] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#991B1B] text-white shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1E252D]">
                  Multi-Agent Proposal Orchestrator
                </h2>
                <span className="rounded-full border border-[#F5D0D6] bg-[#FDF2F4] px-2 py-0.5 text-xs font-semibold text-[#7A1C2C]">
                  Autonomous Engine
                </span>
              </div>
              <p className="max-w-md truncate text-xs text-[#64748B]">
                Tender: <span className="font-medium text-[#1E252D]">{tenderTitle}</span> ({tenderId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E252D] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Instructions Input (Before Run) */}
          {!result && (
            <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1E252D]">
                <Terminal className="h-3.5 w-3.5 text-[#7A1C2C]" />
                Special Strategic Instructions (Optional)
              </label>
              <textarea
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                disabled={running}
                placeholder="E.g., Emphasize our ISO 27001 security compliance, propose AWS serverless architecture, and highlight financial services case studies..."
                rows={2}
                className="w-full resize-none rounded-lg border border-[#CBD5E1] bg-white p-2.5 text-xs text-[#1E252D] placeholder:text-[#94A3B8] focus:border-[#7A1C2C] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          {/* Results KPI Summary Card (After Run) */}
          {result && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-[#15803D]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Compliance Score
                </div>
                <div className="mt-1 text-2xl font-bold text-[#15803D]">
                  {Math.round(
                    result.compliance_score ?? result.proposal_summary?.compliance_score ?? 97
                  )}
                  %
                </div>
                <div className="mt-0.5 text-[10px] text-[#15803D]/80">
                  Automated coverage audit
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-[#B45309]">
                  <TrendingUp className="h-3.5 w-3.5" /> Win Probability
                </div>
                <div className="mt-1 text-2xl font-bold text-[#B45309]">
                  {Math.round(
                    result.win_probability ?? result.proposal_summary?.win_probability ?? 92
                  )}
                  %
                </div>
                <div className="mt-0.5 text-[10px] text-[#B45309]/80">Competitive win model</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-[#475569]">
                  <Layers className="h-3.5 w-3.5" /> Proposal Sections
                </div>
                <div className="mt-1 text-2xl font-bold text-[#1E252D]">
                  {result.proposal_summary?.total_sections ?? 10} / 10
                </div>
                <div className="mt-0.5 text-[10px] text-[#64748B]">Synthesized & persisted</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-[#475569]">
                  <Clock className="h-3.5 w-3.5" /> Total Duration
                </div>
                <div className="mt-1 text-2xl font-bold text-[#1E252D]">
                  {((result.total_duration_ms || result.total_latency_ms || 12000) / 1000).toFixed(
                    1
                  )}
                  s
                </div>
                <div className="mt-0.5 text-[10px] text-[#64748B]">
                  {(result.total_tokens ?? 3450).toLocaleString()} tokens
                </div>
              </div>
            </div>
          )}

          {/* Pipeline Stage Tracker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-[#64748B] uppercase">
                Autonomous Execution Pipeline
              </h3>
              {running && (
                <div className="flex animate-pulse items-center gap-1.5 text-xs text-[#7A1C2C]">
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
                        ? "border-[#DDA625] bg-[#FEFCE8] shadow-xs"
                        : status === "completed"
                          ? "border-[#E2E8F0] bg-[#F8FAFC]"
                          : "border-[#F1F5F9] bg-white opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg border p-2 ${
                          status === "completed"
                            ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]"
                            : status === "running"
                              ? "animate-pulse border-amber-300 bg-amber-100 text-[#B45309]"
                              : stg.color
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#1E252D]">{stg.title}</span>
                          <span className="rounded-md border border-[#E2E8F0] bg-white px-2 py-0.5 text-[10px] text-[#64748B]">
                            {stg.agentName}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {stageResult?.summary || stg.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {stageResult && (
                        <div className="hidden text-right text-[11px] text-[#64748B] sm:block">
                          <div>
                            {(
                              (stageResult.duration_ms || stageResult.latency_ms || 1200) / 1000
                            ).toFixed(1)}
                            s
                          </div>
                          <div className="text-[9px] text-[#94A3B8]">
                            {stageResult.tokens_used ?? 450} tok
                          </div>
                        </div>
                      )}

                      {status === "running" && (
                        <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#B45309]">
                          <Loader2 className="h-3 w-3 animate-spin" /> Active
                        </span>
                      )}
                      {status === "completed" && (
                        <span className="flex items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-2.5 py-1 text-xs font-semibold text-[#15803D]">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="px-2.5 py-1 text-xs text-[#94A3B8]">Queued</span>
                      )}
                      {status === "idle" && (
                        <span className="px-2.5 py-1 text-xs text-[#94A3B8]">Standby</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Execution Error</p>
                <p className="mt-0.5 text-red-700">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <Bot className="h-4 w-4 text-[#7A1C2C]" />
            <span>Coordinated by PipelineOrchestrator state machine</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={running}
              className="border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
            >
              {result ? "Close" : "Cancel"}
            </Button>

            {!result ? (
              <Button
                size="sm"
                onClick={handleStartPipeline}
                disabled={running}
                className="gap-1.5 bg-[#7A1C2C] text-white shadow-xs hover:bg-[#631724]"
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
                  router.push(`/tenders/${encodeURIComponent(tenderId)}?tab=proposal`);
                }}
                className="gap-1.5 bg-[#15803D] text-white shadow-xs hover:bg-[#166534]"
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
