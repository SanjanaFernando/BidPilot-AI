/**
 * BidPilot AI — Requirements Service (Phase 7)
 * Connects frontend to Requirement Agent API & Supabase for traceable requirement management,
 * coverage verification, evidence citation tracking, and matrix exports.
 */

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export type RequirementStatus =
  | "covered"
  | "partially_covered"
  | "missing"
  | "evidence_required"
  | "unverified";

export interface RequirementEvidenceItem {
  source_type: "project" | "employee" | "technology" | "certification" | "document" | string;
  source_name: string;
  source_id?: string | null;
  content_snippet: string;
  similarity_score: number;
  source_page?: number | null;
  source_section?: string | null;
}

export interface RequirementEvaluation {
  req_code: string;
  status: RequirementStatus;
  match_score: number;
  assessment_rationale: string;
  gap_analysis?: string | null;
  recommended_action?: string | null;
  evidence: RequirementEvidenceItem[];
}

export interface RequirementMatrixItem {
  id: string;
  organization_id: string;
  tender_id: string;
  req_code: string;
  category: string;
  title: string;
  description: string;
  is_mandatory: boolean;
  source_page?: number | null;
  source_section?: string | null;
  status: RequirementStatus;
  match_score: number;
  notes?: string | null;
  evidence_metadata: RequirementEvidenceItem[];
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementSummaryStats {
  total: number;
  covered: number;
  partially_covered: number;
  missing: number;
  evidence_required: number;
  unverified: number;
  mandatory_total: number;
  mandatory_covered: number;
  coverage_percentage: number;
}

export interface RequirementMatrixResponse {
  tender_id: string;
  organization_id: string;
  stats: RequirementSummaryStats;
  requirements: RequirementMatrixItem[];
}

export interface BatchEvaluateResponse {
  run_id: string;
  tender_id: string;
  evaluated_count: number;
  evaluations: RequirementEvaluation[];
  stats: Record<string, any>;
  latency_ms: number;
  message: string;
}

export interface SingleEvaluateResponse {
  requirement_id: string;
  tender_id: string;
  evaluation: RequirementEvaluation;
  latency_ms: number;
}

export interface RequirementUpdatePayload {
  status?: RequirementStatus;
  match_score?: number;
  notes?: string;
  assigned_to?: string | null;
  evidence_metadata?: RequirementEvidenceItem[];
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * Fetch the requirement matrix with stats and evidence for a tender.
 */
export async function fetchRequirementMatrix(
  tenderId: string,
  organizationId: string,
  filters?: {
    status?: string;
    category?: string;
    isMandatory?: boolean;
  }
): Promise<RequirementMatrixResponse> {
  const params = new URLSearchParams({
    organization_id: organizationId,
  });

  if (filters?.status && filters.status !== "all") {
    params.append("status", filters.status);
  }
  if (filters?.category && filters.category !== "all") {
    params.append("category", filters.category);
  }
  if (filters?.isMandatory !== undefined) {
    params.append("is_mandatory", String(filters.isMandatory));
  }

  const res = await fetch(
    `${AI_SERVICE_URL}/agents/requirements/${encodeURIComponent(tenderId)}?${params.toString()}`,
    { signal: AbortSignal.timeout(20000) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch requirements" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Run the Requirement Agent to batch-evaluate all requirements for a tender.
 */
export async function evaluateTenderRequirements(
  tenderId: string,
  organizationId: string,
  mode: "all" | "unverified_only" | "force_recheck" = "all",
  requirementIds?: string[]
): Promise<BatchEvaluateResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/agents/requirements/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tender_id: tenderId,
      organization_id: organizationId,
      mode,
      requirement_ids: requirementIds,
    }),
    signal: AbortSignal.timeout(180000), // Up to 3 min for deep evaluations
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Evaluation failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Evaluate a single requirement against company knowledge on-demand.
 */
export async function evaluateSingleRequirement(
  tenderId: string,
  organizationId: string,
  requirementId: string
): Promise<SingleEvaluateResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/agents/requirements/evaluate-single`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tender_id: tenderId,
      organization_id: organizationId,
      requirement_id: requirementId,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Single evaluation failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Manually update a requirement (status override, score, reviewer notes).
 */
export async function updateRequirement(
  requirementId: string,
  organizationId: string,
  payload: RequirementUpdatePayload
): Promise<RequirementMatrixItem> {
  const res = await fetch(
    `${AI_SERVICE_URL}/agents/requirements/${encodeURIComponent(requirementId)}?organization_id=${encodeURIComponent(organizationId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Update failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.requirement;
}

/**
 * Export the compliance requirement matrix to CSV.
 */
export async function downloadRequirementsCSV(
  tenderId: string,
  organizationId: string,
  tenderTitle = "Tender"
): Promise<void> {
  const res = await fetch(`${AI_SERVICE_URL}/agents/requirements/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tender_id: tenderId,
      organization_id: organizationId,
      format: "csv",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to export requirements matrix.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanTitle = tenderTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  a.download = `compliance_matrix_${cleanTitle}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
