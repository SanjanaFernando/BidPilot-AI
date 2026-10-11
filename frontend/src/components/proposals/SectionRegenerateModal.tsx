"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, CheckCircle2, Loader2, X, Cpu } from "lucide-react";
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
    setGeneratedPreview(null);
    try {
      const res = await pipelineService.regenerateSection(
        sectionId,
        tenderId,
        DEFAULT_ORG_ID,
        instructions.trim() || undefined,
        tone
      );
      setGeneratedPreview(res.content_markdown);
    } catch (err: any) {
      alert(`Error regenerating section: ${err?.message || "Unknown error"}`);
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-150">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#7A1C2C] uppercase">
              <RefreshCw size={14} /> Section Synthesis &amp; Regeneration
            </div>
            <div className="mt-0.5 text-base font-bold text-[#1E252D]">{sectionTitle}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E252D]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Tone Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[#64748B] uppercase">
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
                      ? "border-[#7A1C2C] bg-[#FDF2F4] text-[#7A1C2C] ring-1 ring-[#7A1C2C]"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="mt-0.5 text-[10px] text-[#64748B]">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Instructions */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[#64748B] uppercase">
              Custom Prompt Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on high-availability cloud deployment, zero-trust RBAC authentication, and ISO 27001 data residency..."
              className="w-full resize-none rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs text-[#1E252D] focus:bg-white focus:border-[#7A1C2C] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
            />
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#64748B]">
              <ShieldCheck size={13} className="text-[#15803D]" />
              Claims are grounded using verified company projects, certifications, and RFP specifications.
            </div>
          </div>

          {/* Preview if generated */}
          {generatedPreview && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#15803D] uppercase">
                <CheckCircle2 size={14} className="text-[#15803D]" />
                Newly Synthesized Content Preview
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 font-mono text-xs whitespace-pre-line text-[#1E252D]">
                {generatedPreview}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="border-[#CBD5E1] text-[#475569]">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!generatedPreview ? (
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={loading}
                className="gap-1.5 bg-[#7A1C2C] font-bold text-white shadow-xs hover:bg-[#631724]"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Synthesizing Content...
                  </>
                ) : (
                  <>
                    <Cpu size={13} /> Synthesize Section
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
                  className="gap-1 border-[#CBD5E1] text-xs text-[#475569]"
                >
                  <RefreshCw size={12} /> Try Again
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="gap-1.5 bg-[#15803D] font-bold text-white shadow-xs hover:bg-[#166534]"
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
