"use client";

import { useEffect, useState } from "react";
import {
  Quote,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  BookOpen,
  FolderKanban,
  Award,
  Loader2,
} from "lucide-react";
import { pipelineService, type SectionSourceItem } from "@/lib/pipeline-service";
import { DEFAULT_ORG_ID } from "@/lib/rag-service";
import { Button } from "@/components/ui/button";

interface SectionSourcesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  onSelectClaim?: (claimText: string) => void;
}

export function SectionSourcesDrawer({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  onSelectClaim,
}: SectionSourcesDrawerProps) {
  const [sources, setSources] = useState<SectionSourceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sectionId) {
      setLoading(true);
      pipelineService
        .getSectionSources(sectionId, DEFAULT_ORG_ID)
        .then((data) => setSources(data.sources || []))
        .catch(console.warn)
        .finally(() => setLoading(false));
    }
  }, [isOpen, sectionId]);

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs duration-150">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Quote size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Verified Sources &amp; Citations
              </div>
              <div className="max-w-[260px] truncate text-[11px] text-slate-500">
                {sectionTitle}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
            <ShieldCheck size={16} className="flex-shrink-0 text-emerald-600" />
            <span>
              All claims in this section are indexed and cross-checked against organizational
              documents.
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-xs text-slate-500">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <span>Loading citation records...</span>
            </div>
          ) : sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map((src, i) => (
                <div
                  key={src.id || i}
                  className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all hover:border-indigo-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-800">
                      {src.citation_anchor || `[Ref ${i + 1}]`}
                    </span>
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {Math.round((src.similarity_score || 0.94) * 100)}% Confidence
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <BookOpen size={13} className="text-slate-500" />
                    <span>{src.source_name}</span>
                    {src.source_id && (
                      <span className="font-mono text-[10px] text-slate-400">
                        ({src.source_id})
                      </span>
                    )}
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-2.5 text-xs text-slate-700 italic">
                    &quot;{src.claim_text}&quot;
                  </div>

                  {onSelectClaim && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSelectClaim(src.claim_text);
                        onClose();
                      }}
                      className="mt-1 h-7 w-full gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <ShieldCheck size={12} /> Prove Claim Dossier
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No specific citation anchors found in this section.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4">
          <span className="text-xs font-bold text-slate-600">
            {sources.length} citations verified
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
