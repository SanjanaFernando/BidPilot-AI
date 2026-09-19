"use client";

import { useState, useRef, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  Search,
  Loader2,
  Zap,
  Database,
  FileText,
  Users,
  Cpu,
  Award,
  BookOpen,
  Copy,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  searchRAG,
  searchKnowledge,
  getRAGStats,
  ingestKnowledge,
  checkRAGHealth,
  DEFAULT_ORG_ID,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_COLORS,
  type RAGChunkResult,
  type KnowledgeChunkResult,
  type RAGStatsResponse,
  type RAGHealthResponse,
} from "@/lib/rag-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchScope = "rfp" | "knowledge" | "both";
type SourceTypeFilter = "all" | "project" | "employee" | "technology" | "certification";

type UnifiedResult =
  | ({ kind: "rfp" } & RAGChunkResult)
  | ({ kind: "kb" } & KnowledgeChunkResult);

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "#15803D" : pct >= 60 ? "#D97706" : pct >= 40 ? "#B45309" : "#94A3B8";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-[#E2E8F0]">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function SourceBadge({ type }: { type: string }) {
  const label = SOURCE_TYPE_LABELS[type] ?? type;
  const color = SOURCE_TYPE_COLORS[type] ?? "#64748B";
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ background: color }}
    >
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Copy citation"
      className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#7A1C2C]"
    >
      {copied ? <CheckCheck size={12} className="text-[#15803D]" /> : <Copy size={12} />}
      {copied ? "Copied" : "Cite"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F7F9FB] text-[#7A1C2C]">
        {icon}
      </div>
      <div>
        <div className="text-xl font-extrabold tabular-nums text-[#1E252D]">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">{label}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RAGSearchPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("knowledge");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.3);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [stats, setStats] = useState<RAGStatsResponse | null>(null);
  const [health, setHealth] = useState<RAGHealthResponse | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load stats + health on mount
  const loadStats = useCallback(async () => {
    const [s, h] = await Promise.all([
      getRAGStats(DEFAULT_ORG_ID),
      checkRAGHealth(),
    ]);
    setStats(s);
    setHealth(h);
  }, []);

  useState(() => {
    loadStats();
  });

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const runSearch = async () => {
    if (!query.trim() || query.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    const t0 = performance.now();

    try {
      const collected: UnifiedResult[] = [];

      if (scope === "rfp" || scope === "both") {
        const res = await searchRAG(query, DEFAULT_ORG_ID, {
          topK,
          similarityThreshold: threshold,
        });
        for (const r of res.results) {
          collected.push({ kind: "rfp", ...r });
        }
      }

      if (scope === "knowledge" || scope === "both") {
        const res = await searchKnowledge(query, DEFAULT_ORG_ID, {
          sourceType:
            sourceTypeFilter === "all"
              ? undefined
              : (sourceTypeFilter as "project" | "employee" | "technology" | "certification"),
          topK,
          similarityThreshold: threshold,
        });
        for (const r of res.results) {
          collected.push({ kind: "kb", ...r });
        }
      }

      // Sort by similarity descending, then deduplicate by source_id (KB) or document+page (RFP)
      collected.sort((a, b) => b.similarity - a.similarity);

      const seen = new Set<string>();
      const deduped: UnifiedResult[] = [];
      for (const r of collected) {
        const key =
          r.kind === "kb"
            ? `kb:${(r as { kind: "kb" } & KnowledgeChunkResult).source_id}`
            : `rfp:${(r as { kind: "rfp" } & RAGChunkResult).document_id}:${(r as { kind: "rfp" } & RAGChunkResult).page_number}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }

      setResults(deduped);
      setLatencyMs(Math.round(performance.now() - t0));
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Search failed. Make sure the AI service is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runSearch();
  };

  // ---------------------------------------------------------------------------
  // Ingest
  // ---------------------------------------------------------------------------

  const handleIngest = async () => {
    setIngestLoading(true);
    setIngestMsg(null);
    try {
      const res = await ingestKnowledge(DEFAULT_ORG_ID, true); // overwrite=true clears duplicates
      setIngestMsg(res.message);
      await loadStats();
    } catch (e: unknown) {
      setIngestMsg(e instanceof Error ? e.message : "Ingestion failed.");
    } finally {
      setIngestLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 pb-12">
      <Topbar
        title="RAG Search Lab"
        breadcrumb={["Knowledge Base", "RAG Search"]}
      />

      <main className="space-y-6 px-7">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1E252D]">Semantic Retrieval Lab</h2>
            <p className="text-sm text-[#64748B]">
              Test RAG retrieval over RFP chunks and company knowledge base records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Health badge */}
            <div
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                health?.status === "ok"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  health?.status === "ok" ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {health?.status === "ok"
                ? `Embedding: ${health.model?.split("/").pop()}`
                : "Checking embedding API…"}
            </div>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="RFP Chunks" value={stats.rfp_chunks} icon={<FileText size={16} />} />
            <StatCard label="KB Chunks" value={stats.knowledge_chunks} icon={<Database size={16} />} />
            <StatCard label="Total Vectors" value={stats.total_chunks} icon={<Zap size={16} />} />
            <div
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#7A1C2C] bg-white p-4 transition hover:bg-[#FDF5F6]"
              onClick={handleIngest}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#FDF5F6] text-[#7A1C2C]">
                {ingestLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UploadCloud size={16} />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-[#7A1C2C]">
                  {ingestLoading ? "Ingesting…" : "Embed KB"}
                </div>
                <div className="text-[11px] text-[#64748B]">Ingest knowledge base</div>
              </div>
            </div>
          </div>
        )}

        {ingestMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>{ingestMsg}</span>
          </div>
        )}

        {/* Search box */}
        <Card className="border-[#E2E8F0] bg-white shadow-sm">
          <CardContent className="p-5">
            {/* Query input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              />
              <input
                ref={inputRef}
                type="text"
                id="rag-query-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder='e.g. "Which previous project demonstrates healthcare cloud-platform experience?"'
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] py-3 pl-10 pr-28 text-sm text-[#1E252D] outline-none placeholder:text-[#94A3B8] focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10"
              />
              <Button
                id="rag-search-btn"
                onClick={runSearch}
                disabled={loading || query.trim().length < 3}
                className="absolute right-2 top-1/2 h-8 -translate-y-1/2 bg-[#7A1C2C] px-4 text-xs font-bold text-white hover:bg-[#631724] disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : "Search"}
              </Button>
            </div>

            {/* Scope toggles */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-[#64748B]">Search scope:</span>
              {(["rfp", "knowledge", "both"] as SearchScope[]).map((s) => (
                <button
                  key={s}
                  id={`scope-${s}`}
                  onClick={() => setScope(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    scope === s
                      ? "border-[#7A1C2C] bg-[#7A1C2C] text-white"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#7A1C2C] hover:text-[#7A1C2C]"
                  }`}
                >
                  {s === "rfp" ? "RFP Chunks" : s === "knowledge" ? "Knowledge Base" : "Both"}
                </button>
              ))}

              {(scope === "knowledge" || scope === "both") && (
                <>
                  <span className="ml-2 text-xs font-bold text-[#64748B]">Type:</span>
                  {(["all", "project", "employee", "technology", "certification"] as SourceTypeFilter[]).map((t) => (
                    <button
                      key={t}
                      id={`type-${t}`}
                      onClick={() => setSourceTypeFilter(t)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                        sourceTypeFilter === t
                          ? "border-[#7A1C2C] bg-[#7A1C2C] text-white"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#7A1C2C]"
                      }`}
                    >
                      {t === "project" && <Database size={10} />}
                      {t === "employee" && <Users size={10} />}
                      {t === "technology" && <Cpu size={10} />}
                      {t === "certification" && <Award size={10} />}
                      {t === "all" ? "All" : SOURCE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </>
              )}

              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="ml-auto flex items-center gap-1 text-xs text-[#64748B] hover:text-[#7A1C2C]"
              >
                <SlidersHorizontal size={12} />
                Advanced
              </button>
            </div>

            {/* Advanced controls */}
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-2 gap-6 rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] p-4">
                <div className="space-y-1.5">
                  <label className="flex justify-between text-xs font-bold text-[#475569]">
                    <span>Top-K results</span>
                    <span className="font-mono text-[#7A1C2C]">{topK}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full accent-[#7A1C2C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex justify-between text-xs font-bold text-[#475569]">
                    <span>Min. similarity</span>
                    <span className="font-mono text-[#7A1C2C]">{(threshold * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={threshold * 100}
                    onChange={(e) => setThreshold(Number(e.target.value) / 100)}
                    className="w-full accent-[#7A1C2C]"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example queries */}
        {!hasSearched && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-[#94A3B8]">Try:</span>
            {[
              "Which previous project demonstrates healthcare cloud-platform experience?",
              "Who has HL7 FHIR integration experience?",
              "What cloud certifications does the company hold?",
              "React and Node.js development experience",
            ].map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#475569] transition hover:border-[#7A1C2C] hover:text-[#7A1C2C]"
              >
                {q.length > 55 ? q.slice(0, 52) + "…" : q}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-[#E2E8F0] bg-white"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold">Search failed</div>
              <div className="mt-0.5 text-xs">{error}</div>
            </div>
          </div>
        )}

        {/* Results header */}
        {!loading && hasSearched && !error && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#64748B]">
              <span className="font-bold text-[#1E252D]">{results.length}</span> result
              {results.length !== 1 ? "s" : ""} for{" "}
              <span className="font-semibold text-[#7A1C2C]">"{query}"</span>
              {latencyMs !== null && (
                <span className="ml-2 text-xs text-[#94A3B8]">({latencyMs}ms)</span>
              )}
            </div>
            <button
              onClick={runSearch}
              className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#7A1C2C]"
            >
              <RefreshCw size={12} /> Re-run
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && hasSearched && !error && results.length === 0 && (
          <Card className="border-[#E2E8F0] bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen size={40} className="mb-4 text-[#CBD5E1]" />
              <div className="text-base font-bold text-[#475569]">No results found</div>
              <div className="mt-1 max-w-sm text-sm text-[#94A3B8]">
                Try lowering the minimum similarity threshold, broadening your query, or
                clicking <strong>Embed KB</strong> to ingest your knowledge base first.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result cards */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((r, idx) => (
              <ResultCard key={r.chunk_id || idx} result={r} rank={idx + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------

function ResultCard({ result, rank }: { result: UnifiedResult; rank: number }) {
  const [expanded, setExpanded] = useState(rank <= 2);

  if (result.kind === "rfp") {
    const r = result as { kind: "rfp" } & RAGChunkResult;
    const citationText = `[${r.source_filename || "RFP"}, Page ${r.page_number}${r.section ? `, §${r.section}` : ""}] "${r.content.slice(0, 120)}…"`;
    return (
      <Card className="border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md">
        <CardContent className="p-0">
          <div className="flex items-start gap-4 p-4">
            {/* Rank */}
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B]">
              {rank}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  RFP
                </span>
                <span className="text-xs font-semibold text-[#1E252D]">
                  {r.source_filename || "Document"}
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  Page {r.page_number}
                  {r.section ? ` · §${r.section}` : ""}
                </span>
                <SimilarityBar score={r.similarity} />
              </div>

              {/* Content */}
              <p
                className={`text-sm leading-relaxed text-[#334155] ${expanded ? "" : "line-clamp-3"}`}
                style={{ cursor: "pointer" }}
                onClick={() => setExpanded((v) => !v)}
              >
                {r.content}
              </p>

              {r.content.length > 250 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs font-semibold text-[#7A1C2C]"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            <CopyButton text={citationText} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Knowledge base result
  const r = result as { kind: "kb" } & KnowledgeChunkResult;
  const citationText = `[${SOURCE_TYPE_LABELS[r.source_type] || r.source_type}: ${r.source_name}] "${r.content.slice(0, 120)}…"`;

  return (
    <Card className="border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          {/* Rank */}
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B]">
            {rank}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge type={r.source_type} />
              <span className="text-xs font-bold text-[#1E252D]">{r.source_name}</span>
              <SimilarityBar score={r.similarity} />
            </div>

            {/* Content */}
            <p
              className={`text-sm leading-relaxed text-[#334155] ${expanded ? "" : "line-clamp-3"}`}
              style={{ cursor: "pointer" }}
              onClick={() => setExpanded((v) => !v)}
            >
              {r.content}
            </p>

            {r.content.length > 250 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-semibold text-[#7A1C2C]"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          <CopyButton text={citationText} />
        </div>
      </CardContent>
    </Card>
  );
}
