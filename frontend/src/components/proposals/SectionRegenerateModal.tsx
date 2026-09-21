"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
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
  const [tone, setTone] = useState<"executive" | "technical" | "persuasive" | "concise">("executive");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl overflow-hidden bg-white shadow-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={14} /> AI Section Regeneration
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {sectionTitle}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Tone Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Tone &amp; Emphasis
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  className={`p-3 rounded-lg border text-left transition-all ${
                    tone === t.id
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Instructions */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Custom Prompt Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on high-availability cloud deployment, zero-trust RBAC authentication, and ISO 27001 data residency..."
              className="w-full p-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white resize-none"
            />
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600" />
              AI will ground claims using verified company projects, certifications, and RFP facts.
            </div>
          </div>

          {/* Preview if generated */}
          {generatedPreview && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Newly Synthesized Content Preview
              </div>
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs font-mono text-slate-900 max-h-56 overflow-y-auto whitespace-pre-line">
                {generatedPreview}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!generatedPreview ? (
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={loading}
                className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold"
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
                  className="gap-1.5 bg-[#15803D] hover:bg-[#166534] text-white font-bold"
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
