"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ShieldCheck, CheckCircle2, Loader2, X } from "lucide-react";
import { pipelineService } from "@/lib/pipeline-service";
import { DEFAULT_ORG_ID } from "@/lib/rag-service";

interface SectionRegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  tenderId: string;
  onRegenerateComplete: (newContent: string) => void;
}

export function SectionRegenerateModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  tenderId,
  onRegenerateComplete,
}: SectionRegenerateModalProps) {
  const [tone, setTone] = useState<"executive" | "technical" | "persuasive" | "concise">(
    "executive"
  );
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const result = await pipelineService.regenerateSection(
        sectionId,
        tenderId,
        DEFAULT_ORG_ID,
        instructions || undefined,
        tone
      );
      setGeneratedPreview(result.content_markdown);
    } catch (err: any) {
      console.error("Regeneration failed:", err);
      alert(err.message || "Failed to regenerate section.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedPreview) {
      onRegenerateComplete(generatedPreview);
      onClose();
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-700 uppercase">
              <Sparkles size={14} /> AI Section Regeneration
            </div>
            <div className="mt-0.5 text-base font-bold text-slate-900">{sectionTitle}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Tone Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-slate-700 uppercase">
              Select Tone &amp; Emphasis
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: "executive", label: "Executive", desc: "Strategic & ROI" },
                { id: "technical", label: "Technical", desc: "Deep Architecture" },
                { id: "persuasive", label: "Persuasive", desc: "Win Themes & Proof" },
                { id: "concise", label: "Concise", desc: "Bullet & Direct" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id as any)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    tone === t.id
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Instructions */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-slate-700 uppercase">
              Custom Prompt Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on high-availability cloud deployment, zero-trust RBAC authentication, and ISO 27001 data residency..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:outline-none"
            />
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck size={13} className="text-emerald-600" />
              AI will ground claims using verified company projects, certifications, and RFP facts.
            </div>
          </div>

          {/* Preview if generated */}
          {generatedPreview && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-800 uppercase">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Newly Synthesized Content Preview
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 font-mono text-xs whitespace-pre-line text-slate-900">
                {generatedPreview}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!generatedPreview ? (
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={loading}
                className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white hover:from-indigo-500 hover:to-purple-500"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Synthesizing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} /> Synthesize Section
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="gap-1 text-xs"
                >
                  <RefreshCw size={12} /> Try Again
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="gap-1.5 bg-[#15803D] font-bold text-white hover:bg-[#166534]"
                >
                  <CheckCircle2 size={13} /> Apply to Proposal
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
