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
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// RAG Result Modal
// ---------------------------------------------------------------------------

type UnifiedResult =
  | ({ kind: "rfp" } & RAGChunkResult)
  | ({ kind: "kb" } & KnowledgeChunkResult);

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

function RAGResultModal({
  tender,
  onClose,
}: {
  tender: TenderItem;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(
    `Healthcare cloud platform experience for ${tender.name}`
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
      if (kbRes.status === "fulfilled") {
        kbRes.value.results.forEach((r) => collected.push({ kind: "kb", ...r }));
      }
      if (rfpRes.status === "fulfilled") {
        rfpRes.value.results.forEach((r) => collected.push({ kind: "rfp", ...r }));
      }
      collected.sort((a, b) => b.similarity - a.similarity);
      setResults(collected);
      setLatencyMs(Math.round(performance.now() - t0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on open
  useEffect(() => {
    runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
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

        {/* Query row */}
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

        {/* Body */}
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
              <div className="mt-1 text-[11px]">
                Make sure the AI service is running at{" "}
                <code className="font-mono">localhost:8000</code> and the knowledge base has been
                ingested (use the RAG Search Lab).
              </div>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} className="mb-3 text-[#CBD5E1]" />
              <div className="text-sm font-semibold text-[#475569]">No evidence found</div>
              <div className="mt-1 text-xs text-[#94A3B8]">
                Ingest your knowledge base first using the RAG Search Lab.
              </div>
              <Link
                href="/knowledge/search"
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#7A1C2C] hover:underline"
              >
                Go to RAG Search Lab <ExternalLink size={10} />
              </Link>
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

              {results.map((r, i) => {
                if (r.kind === "kb") {
                  const color = SOURCE_TYPE_COLORS[r.source_type] || "#64748B";
                  return (
                    <div
                      key={r.chunk_id}
                      className="rounded-lg border border-[#E2E8F0] bg-white p-4 transition hover:shadow-sm"
                    >
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
                      <p className="line-clamp-4 text-xs leading-relaxed text-[#475569]">
                        {r.content}
                      </p>
                    </div>
                  );
                }

                // RFP chunk
                return (
                  <div
                    key={r.chunk_id}
                    className="rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] p-4"
                  >
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
                    <p className="line-clamp-4 text-xs leading-relaxed text-[#475569]">
                      {r.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] px-6 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/knowledge/search"
              className="flex items-center gap-1 text-xs font-semibold text-[#7A1C2C] hover:underline"
            >
              <Sparkles size={11} /> Open full RAG Search Lab
              <ExternalLink size={10} />
            </Link>
            <Button
              onClick={onClose}
              variant="outline"
              className="h-8 border-[#E2E8F0] px-3 text-xs text-[#64748B] hover:text-[#1E252D]"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tender, setTender] = useState<TenderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showRAGModal, setShowRAGModal] = useState(false);

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

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#7A1C2C]" />
        <p className="text-xs text-[#64748B]">Loading tender details…</p>
      </div>
    );
  }

  if (!tender) notFound();

  const reqStats = {
    covered: mockRequirements.filter((r) => r.status === "Covered").length,
    partial: mockRequirements.filter((r) => r.status === "Partial").length,
    missing: mockRequirements.filter((r) => r.status === "Missing").length,
    evidenceNeeded: mockRequirements.filter((r) => r.status === "Evidence Required").length,
  };

  const formattedDeadline =
    tender.deadline && !isNaN(Date.parse(tender.deadline))
      ? new Date(tender.deadline).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : tender.deadline || "TBD";


  return (
    <div className="space-y-6 pb-12">
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
                </div>

                <h2 className="text-xl font-bold text-[#1E252D]">{tender.name}</h2>
                <p className="max-w-3xl text-sm leading-relaxed text-[#64748B]">
                  {tender.description}
                </p>

                <div className="flex flex-wrap gap-6 pt-2 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building2 size={14} className="text-[#7A1C2C]" />
                    <strong className="text-[#1E252D]">Authority:</strong> {tender.client}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <DollarSign size={14} className="text-[#DDA625]" />
                    <strong className="text-[#1E252D]">Estimated Value:</strong> {tender.value}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock size={14} className="text-[#64748B]" />
                    <strong className="text-[#1E252D]">Deadline:</strong>{" "}
                    {formattedDeadline}
                  </span>
                </div>
              </div>

              {/* Coverage Gauge */}
              {tender.coverage > 0 && (
                <div className="flex min-w-[130px] flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] p-4">
                  <div className="text-3xl font-extrabold text-[#7A1C2C] tabular-nums">
                    {tender.coverage}%
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Coverage
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-5 bg-[#E2E8F0]" />

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                id="run-ai-analysis-btn"
                onClick={() => setShowRAGModal(true)}
                className="h-9 gap-2 bg-[#7A1C2C] px-4 text-xs font-semibold text-white hover:bg-[#631724]"
              >
                <Bot size={14} /> Run AI RFP Analysis
              </Button>
              <Link href={`/proposals/${tender.id}`}>
                <Button className="h-9 gap-2 border-none bg-[#DDA625] px-4 text-xs font-semibold text-[#1E252D] shadow-none hover:bg-[#C8951E]">
                  <FileEdit size={14} /> Open Proposal Editor
                </Button>
              </Link>
              <Link href="/knowledge/search">
                <Button
                  variant="outline"
                  className="h-9 gap-2 border-[#E2E8F0] px-4 text-xs font-semibold text-[#64748B] hover:border-[#7A1C2C] hover:text-[#7A1C2C]"
                >
                  <Sparkles size={14} /> RAG Search Lab
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tabs & Content */}
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
              <List size={14} /> Requirements ({tender.requirements || "—"})
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-[#7A1C2C] data-[state=active]:text-white"
            >
              <ShieldCheck size={14} /> Compliance Audit
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#7A1C2C] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#1E252D] tabular-nums">
                    {tender.requirements || 0}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Total Requirements
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#15803D] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#15803D] tabular-nums">
                    {reqStats.covered}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Fully Covered
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#B45309] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#B45309] tabular-nums">
                    {reqStats.partial}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Partially Covered
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#E2E8F0] border-l-[#B91C1C] bg-white">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#B91C1C] tabular-nums">
                    {reqStats.missing}
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                    Missing Evidence
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <CardTitle className="text-sm font-bold text-[#1E252D]">
                  Quick Actions & Proposal Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
                <div>
                  <div className="text-sm font-semibold text-[#1E252D]">
                    Proposal Draft Ready for Review
                  </div>
                  <div className="mt-1 text-xs text-[#64748B]">
                    Generated with 8 sections, evidence citations linked to verified company
                    projects.
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

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-4 pt-1">
            <Card className="overflow-hidden border-[#E2E8F0] bg-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
                <CardTitle className="text-sm font-bold text-[#1E252D]">
                  Extracted Requirements Matrix
                </CardTitle>
                <span className="font-mono text-xs text-[#64748B]">
                  {mockRequirements.length} requirements
                </span>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="gov-table w-full">
                  <thead>
                    <tr>
                      <th>Ref. ID</th>
                      <th>Category</th>
                      <th>Requirement Specification</th>
                      <th>Mandatory</th>
                      <th>RFP Source</th>
                      <th>Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRequirements.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <span className="font-mono text-xs font-bold text-[#64748B]">
                            {req.id}
                          </span>
                        </td>
                        <td>
                          <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
                            {req.category}
                          </span>
                        </td>
                        <td className="max-w-md text-sm font-medium text-[#1E252D]">
                          {req.requirement}
                        </td>
                        <td>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: req.mandatory ? "#B91C1C" : "#64748B" }}
                          >
                            {req.mandatory ? "Mandatory" : "Optional"}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-[#64748B]">Page {req.sourcePage}</td>
                        <td>
                          <Badge status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4 pt-1">
            <div className="space-y-3">
              {[
                {
                  label: "Mandatory Requirements Verification",
                  desc: "7 of 8 mandatory clauses covered with direct reference to past company projects.",
                  status: "Partial",
                  icon: <AlertTriangle size={18} className="text-[#B45309]" />,
                },
                {
                  label: "Evidence Citations & Traceability",
                  desc: "HL7 FHIR integration evidence requires supplementary project documentation.",
                  status: "Evidence Required",
                  icon: <HelpCircle size={18} className="text-[#B45309]" />,
                },
                {
                  label: "ISO 27001 Security Standard",
                  desc: "Verified active certification CERT-001 valid until March 2027.",
                  status: "Covered",
                  icon: <CheckCircle2 size={18} className="text-[#15803D]" />,
                },
                {
                  label: "Contradiction & Accuracy Scan",
                  desc: "No contradictory statements detected across generated sections.",
                  status: "Covered",
                  icon: <CheckCircle2 size={18} className="text-[#15803D]" />,
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
