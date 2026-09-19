/**
 * BidPilot AI — RAG Service Client (Phase 5)
 * Typed wrappers for all RAG and Knowledge Ingest API endpoints.
 */

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ||
  "a0000000-0000-0000-0001-000000000001";

export { DEFAULT_ORG_ID };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RAGChunkResult {
  chunk_id: string;
  content: string;
  page_number: number;
  section: string;
  similarity: number;
  document_id: string;
  source_filename?: string;
  metadata: Record<string, unknown>;
}

export interface RAGSearchResponse {
  query: string;
  results: RAGChunkResult[];
  total_found: number;
  organization_id: string;
  tender_id?: string;
}

export interface KnowledgeChunkResult {
  chunk_id: string;
  content: string;
  source_type: string;
  source_id: string;
  source_name: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface KnowledgeSearchResponse {
  query: string;
  results: KnowledgeChunkResult[];
  total_found: number;
  organization_id: string;
  source_type?: string;
}

export interface RAGStatsResponse {
  organization_id: string;
  rfp_chunks: number;
  knowledge_chunks: number;
  total_chunks: number;
}

export interface IngestResponse {
  organization_id: string;
  projects_ingested: number;
  employees_ingested: number;
  technologies_ingested: number;
  certifications_ingested: number;
  total_chunks_stored: number;
  errors: number;
  message: string;
}

export interface IngestStatusResponse {
  organization_id: string;
  total_knowledge_chunks: number;
  by_source_type: Record<string, number>;
  is_ingested: boolean;
}

export interface RAGHealthResponse {
  status: "ok" | "error";
  model: string;
  dimensions?: number;
  latency_ms: number;
  endpoint: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// RAG Search (RFP document chunks)
// ---------------------------------------------------------------------------

export async function searchRAG(
  query: string,
  organizationId: string = DEFAULT_ORG_ID,
  options?: {
    tenderId?: string;
    topK?: number;
    similarityThreshold?: number;
  },
): Promise<RAGSearchResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/rag/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      organization_id: organizationId,
      tender_id: options?.tenderId,
      top_k: options?.topK ?? 5,
      similarity_threshold: options?.similarityThreshold ?? 0.3,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "RAG search failed" }));
    throw new Error(err.detail || `RAG search failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Knowledge Search (company KB chunks)
// ---------------------------------------------------------------------------

export async function searchKnowledge(
  query: string,
  organizationId: string = DEFAULT_ORG_ID,
  options?: {
    sourceType?: "project" | "employee" | "technology" | "certification";
    topK?: number;
    similarityThreshold?: number;
  },
): Promise<KnowledgeSearchResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/rag/knowledge-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      organization_id: organizationId,
      source_type: options?.sourceType,
      top_k: options?.topK ?? 5,
      similarity_threshold: options?.similarityThreshold ?? 0.3,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Knowledge search failed" }));
    throw new Error(err.detail || `Knowledge search failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// RAG Stats
// ---------------------------------------------------------------------------

export async function getRAGStats(
  organizationId: string = DEFAULT_ORG_ID,
): Promise<RAGStatsResponse | null> {
  try {
    const res = await fetch(
      `${AI_SERVICE_URL}/rag/stats?organization_id=${encodeURIComponent(organizationId)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ingest Knowledge Base
// ---------------------------------------------------------------------------

export async function ingestKnowledge(
  organizationId: string = DEFAULT_ORG_ID,
  overwrite = false,
): Promise<IngestResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/rag/ingest-knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: organizationId, overwrite }),
    signal: AbortSignal.timeout(120000), // 2 min — may take time to embed all records
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Ingestion failed" }));
    throw new Error(err.detail || `Ingestion failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Ingest Status
// ---------------------------------------------------------------------------

export async function getIngestStatus(
  organizationId: string = DEFAULT_ORG_ID,
): Promise<IngestStatusResponse | null> {
  try {
    const res = await fetch(
      `${AI_SERVICE_URL}/rag/ingest-knowledge/status?organization_id=${encodeURIComponent(organizationId)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// RAG Health
// ---------------------------------------------------------------------------

export async function checkRAGHealth(): Promise<RAGHealthResponse | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/rag/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source type helpers
// ---------------------------------------------------------------------------

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  project: "Project",
  employee: "Employee",
  technology: "Technology",
  certification: "Certification",
};

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  project: "#7A1C2C",
  employee: "#1D4ED8",
  technology: "#059669",
  certification: "#D97706",
};
