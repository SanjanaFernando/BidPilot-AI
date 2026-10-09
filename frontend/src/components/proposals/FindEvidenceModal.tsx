"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  BookOpen,
  Quote,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  FolderKanban,
  Award,
  Users,
  Code2,
  X,
} from "lucide-react";
import { pipelineService, type EvidenceMatchItem } from "@/lib/pipeline-service";
import { DEFAULT_ORG_ID } from "@/lib/rag-service";

interface FindEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  tenderId: string;
  onInsertCitation: (citationText: string, evidenceItem: EvidenceMatchItem) => void;
}

export function FindEvidenceModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  tenderId,
  onInsertCitation,
}: FindEvidenceModalProps) {
  const [query, setQuery] = useState(sectionTitle);
  const [results, setResults] = useState<EvidenceMatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [insertedIds, setInsertedIds] = useState<Set<string>>(new Set());

  const search = async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await pipelineService.findSectionEvidence(
        sectionId,
        DEFAULT_ORG_ID,
        tenderId,
        searchTerm,
        6
      );
      setResults(data.evidence || []);
    } catch (err) {
      console.error("Find evidence error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setQuery(sectionTitle);
      search(sectionTitle);
    }
  }, [isOpen, sectionTitle, sectionId]);

  if (!isOpen) return null;

  const handleInsert = (item: EvidenceMatchItem, index: number) => {
    const citationAnchor = `\n\n*Evidence Reference: [Ref ${index + 1}: ${item.source_name} | Match ${(item.similarity * 100).toFixed(0)}%]*`;
    onInsertCitation(citationAnchor, item);
    setInsertedIds((prev) => new Set([...prev, item.id || `idx-${index}`]));
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "project":
        return <FolderKanban size={13} className="text-blue-600" />;
      case "certification":
        return <Award size={13} className="text-amber-600" />;
      case "employee":
        return <Users size={13} className="text-purple-600" />;
      case "technology":
        return <Code2 size={13} className="text-emerald-600" />;
      default:
        return <BookOpen size={13} className="text-slate-600" />;
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#7A1C2C] uppercase">
              <Search size={14} /> Grounded Knowledge Retrieval
            </div>
            <div className="mt-0.5 text-base font-bold text-slate-900">
              Find Evidence for &quot;{sectionTitle}&quot;
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Box */}
        <div className="border-b border-slate-200 bg-white px-6 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, certifications, technology specs..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#7A1C2C] px-4 text-xs font-bold text-white hover:bg-[#621623]"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : "Search KB"}
            </Button>
          </form>
        </div>

        {/* Results List */}
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-xs text-slate-500">
              <Loader2 size={24} className="animate-spin text-[#7A1C2C]" />
              <span>Querying vector knowledge embeddings...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => {
              const isInserted = insertedIds.has(item.id || `idx-${idx}`);
              return (
                <div
                  key={item.id || idx}
                  className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-indigo-300 hover:bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 p-1">
                        {getTypeIcon(item.source_type)}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{item.source_name}</span>
                      {item.source_id && (
                        <span className="font-mono text-[10px] text-slate-500">
                          ({item.source_id})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {(item.similarity * 100).toFixed(0)}% Similarity
                      </span>
                      <Button
                        size="sm"
                        variant={isInserted ? "outline" : "default"}
                        onClick={() => handleInsert(item, idx)}
                        disabled={isInserted}
                        className={`h-7 gap-1 px-2.5 text-xs font-semibold ${
                          isInserted
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-500"
                        }`}
                      >
                        {isInserted ? (
                          <>
                            <CheckCircle2 size={12} /> Inserted
                          </>
                        ) : (
                          <>
                            <Quote size={12} /> + Insert Citation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="line-clamp-3 rounded border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-700 italic">
                    &quot;{item.content}&quot;
                  </p>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching knowledge chunks found for this query.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck size={13} className="text-emerald-600" />
            Zero-hallucination guarantee: only ground claims from retrieved organization records.
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
