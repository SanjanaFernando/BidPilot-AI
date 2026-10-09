/**
 * BidPilot AI — Frontend Service Client
 * Communicates with the FastAPI AI service (localhost:8000 in dev).
 */

const AI_SERVICE_URL = (
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000"
)
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadProgress {
  stage: "uploading" | "extracting" | "chunking" | "embedding" | "storing" | "done" | "error";
  message: string;
  percent: number;
}

export interface UploadResult {
  document_id: string;
  tender_id: string;
  organization_id: string;
  filename: string;
  storage_path: string;
  page_count: number;
  chunk_count: number;
  embedded_count: number;
  status: "completed" | "partial";
  message: string;
}

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

export interface AIServiceHealth {
  status: "ok" | "error";
  service: string;
  version: string;
  dependencies: {
    supabase: boolean;
    gemini: boolean;
    embed_model: string;
    generate_model: string;
  };
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function checkAIServiceHealth(): Promise<AIServiceHealth | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function checkRAGHealth(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/rag/health`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Upload RFP
// ---------------------------------------------------------------------------

export async function uploadRFP(
  file: File,
  tenderId: string,
  organizationId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  const emit = (stage: UploadProgress["stage"], message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  emit("uploading", "Uploading PDF to secure storage…", 10);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("tender_id", tenderId);
  formData.append("organization_id", organizationId);

  emit("extracting", "Extracting text from PDF pages…", 30);

  const res = await fetch(`${AI_SERVICE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
    // No Content-Type header — browser sets multipart/form-data boundary automatically
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    emit("error", err.detail || "Upload failed", 0);
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }

  emit("embedding", "Generating semantic embeddings with Gemini…", 70);
  const result: UploadResult = await res.json();

  emit("done", result.message, 100);
  return result;
}

// ---------------------------------------------------------------------------
// RAG Search
// ---------------------------------------------------------------------------

export async function searchRAG(
  query: string,
  organizationId: string,
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
// Phase 6 — RFP Analysis Agent
// ---------------------------------------------------------------------------

export interface ExtractedRequirement {
  req_code: string;
  category: string;
  title: string;
  description: string;
  is_mandatory: boolean;
  source_page: number | null;
  source_section: string | null;
  status?: "covered" | "partially_covered" | "missing" | "evidence_required" | "unverified" | string;
}

export interface RFPAnalysis {
  title: string;
  client_name: string;
  submission_deadline: string | null;
  summary: string;
  budget_estimate: string | null;
  evaluation_criteria: string[];
  deliverables: string[];
  technologies: string[];
  certifications_required: string[];
  requirements: ExtractedRequirement[];
}

export interface AnalyzeRFPResponse {
  run_id: string;
  analysis: RFPAnalysis;
  requirements_saved: number;
  latency_ms: number;
  message: string;
}

export interface TenderAnalysisState {
  tender_id: string;
  organization_id: string;
  has_analysis: boolean;
  requirements_count: number;
  requirements: ExtractedRequirement[];
  latest_run: {
    id: string;
    agent_name: string;
    status: string;
    latency_ms: number;
    created_at: string;
  } | null;
}

/**
 * Run the RFP Analysis Agent on an uploaded document or automatically resolved tender document.
 * Calls POST /agents/analyze on the FastAPI service.
 */
export async function analyzeRFP(
  tenderId: string,
  organizationId: string,
  documentId?: string,
  saveRequirements = true,
): Promise<AnalyzeRFPResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/agents/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tender_id: tenderId,
      organization_id: organizationId,
      document_id: documentId || undefined,
      save_requirements: saveRequirements,
    }),
    // Analysis can take up to 2 min for large RFPs
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "RFP analysis failed" }));
    throw new Error(err.detail || `RFP analysis failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a previously saved analysis for a tender.
 * Calls GET /agents/analyze/{tender_id}?organization_id=...
 */
export async function getTenderAnalysis(
  tenderId: string,
  organizationId: string,
): Promise<TenderAnalysisState> {
  const res = await fetch(
    `${AI_SERVICE_URL}/agents/analyze/${encodeURIComponent(tenderId)}?organization_id=${encodeURIComponent(organizationId)}`,
    { signal: AbortSignal.timeout(15_000) },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch analysis" }));
    throw new Error(err.detail || `Fetch failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Phase 13: Knowledge Governance & Secret Scrubbing API
// ---------------------------------------------------------------------------

export interface ScanSecretsResult {
  findings_count: number;
  has_sensitive_data: boolean;
  findings: Array<{
    type: string;
    category: string;
    start: number;
    end: number;
    masked_preview: string;
  }>;
  scrubbed_preview: string;
}

export async function scanSecrets(text: string): Promise<ScanSecretsResult> {
  const res = await fetch(`${AI_SERVICE_URL}/rag/scan-secrets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to scan secrets");
  return res.json();
}

// ---------------------------------------------------------------------------
// Phase 14: Cryptographic Audit & Electronic Signatures API
// ---------------------------------------------------------------------------

export interface VerifyChainResult {
  organization_id: string;
  total_events: number;
  is_valid: boolean;
  status: string;
  message: string;
  latest_hash: string;
  verified_at?: string;
}

export interface ProposalVerificationResult {
  is_valid: boolean;
  proposal_hash: string;
  proposal_id?: string;
  signer_full_name?: string;
  signer_email?: string;
  signer_role?: string;
  signed_at?: string;
  status: string;
  certificate_data?: Record<string, any>;
  message: string;
}

export async function getAuditLogs(organizationId: string, limit = 50) {
  const res = await fetch(`${AI_SERVICE_URL}/audit/logs?organization_id=${encodeURIComponent(organizationId)}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export async function verifyAuditChain(organizationId: string): Promise<VerifyChainResult> {
  const res = await fetch(`${AI_SERVICE_URL}/audit/verify-chain?organization_id=${encodeURIComponent(organizationId)}`);
  if (!res.ok) throw new Error("Failed to verify audit chain");
  return res.json();
}

export async function sealElectronicSignature(payload: {
  organization_id: string;
  proposal_id: string;
  proposal_content: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  tender_title?: string;
  tender_code?: string;
  bid_value?: string;
}) {
  const res = await fetch(`${AI_SERVICE_URL}/audit/sign-off`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to seal electronic signature");
  return res.json();
}

export async function verifyProposalHash(proposalHash: string): Promise<ProposalVerificationResult> {
  const res = await fetch(`${AI_SERVICE_URL}/audit/verify/${encodeURIComponent(proposalHash)}`);
  if (!res.ok) {
    return {
      is_valid: false,
      proposal_hash: proposalHash,
      status: "ERROR",
      message: "Server returned error during signature check",
    };
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Phase 15: Notifications & Webhook API
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  severity: "info" | "success" | "warning" | "urgent";
  created_at: string;
}

export interface NotificationsResponse {
  organization_id: string;
  total: number;
  unread_count: number;
  notifications: NotificationItem[];
}

export async function getNotifications(organizationId: string, unreadOnly = false): Promise<NotificationsResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/notifications?organization_id=${encodeURIComponent(organizationId)}&unread_only=${unreadOnly}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function markNotificationRead(id: string) {
  const res = await fetch(`${AI_SERVICE_URL}/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return res.json();
}

export async function markAllNotificationsRead(organizationId: string) {
  const res = await fetch(`${AI_SERVICE_URL}/notifications/read-all?organization_id=${encodeURIComponent(organizationId)}`, { method: "PUT" });
  if (!res.ok) throw new Error("Failed to mark all as read");
  return res.json();
}

export async function testWebhookDispatch(payload: { webhook_url: string; service_type: string; title: string; message: string; link?: string }) {
  const res = await fetch(`${AI_SERVICE_URL}/notifications/test-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to dispatch test webhook");
  return res.json();
}

