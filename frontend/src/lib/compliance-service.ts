/**
 * BidPilot AI — Phase 10: Compliance & Human Approval Client API
 */

const AI_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";
const DEFAULT_ORG_ID = "a0000000-0000-0000-0001-000000000001";

export interface ComplianceMatrixRow {
  requirement_id: string;
  req_code: string;
  requirement_category: string;
  requirement_title: string;
  requirement_description: string;
  is_mandatory: boolean;
  compliance_status: "compliant" | "partially_compliant" | "non_compliant";
  evidence_found: boolean;
  contradiction_detected: boolean;
  contradiction_details?: string | null;
  certification_verified: boolean;
  certification_name?: string | null;
  confidence_score: number;
  audit_notes: string;
  section_id?: string | null;
  section_title?: string | null;
  section_order?: number | null;
  section_review_status?: string;
}

export interface ComplianceAuditSummary {
  proposal_id: string;
  tender_id: string;
  overall_compliance_score: number;
  total_requirements: number;
  mandatory_total: number;
  mandatory_met: number;
  compliant_count: number;
  partially_compliant_count: number;
  non_compliant_count: number;
  contradiction_count: number;
  certifications_verified_count: number;
  rows: ComplianceMatrixRow[];
}

export interface GovernanceStatus {
  proposal_id: string;
  tender_id: string;
  governance_status: "draft" | "in_review" | "changes_requested" | "approved" | "ready_to_submit";
  reviewed_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  review_notes?: string | null;
  submission_checklist: Record<string, boolean>;
  total_sections: number;
  approved_sections_count: number;
  compliance_score: number;
  win_probability: number;
  can_submit: boolean;
}

export const complianceService = {
  /**
   * Fetch complete requirement cross-checking matrix with contradiction and cert checks
   */
  async getComplianceAudit(
    proposalId: string,
    orgId: string = DEFAULT_ORG_ID
  ): Promise<ComplianceAuditSummary> {
    const res = await fetch(
      `${AI_SERVICE_BASE_URL}/agents/compliance/audit/${encodeURIComponent(proposalId)}?organization_id=${encodeURIComponent(orgId)}`,
      { method: "GET" }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch compliance audit matrix: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Review a specific proposal section (approve or request revision)
   */
  async updateSectionReview(
    sectionId: string,
    status: "ready_for_review" | "approved" | "needs_revision",
    reviewedBy: string = "Proposal Lead",
    comments?: string
  ) {
    const res = await fetch(
      `${AI_SERVICE_BASE_URL}/agents/compliance/section-review/${encodeURIComponent(sectionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_status: status,
          reviewed_by: reviewedBy,
          reviewer_comments: comments || null,
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to update section review: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Submits authorized executive human sign-off
   */
  async signOffProposal(
    proposalId: string,
    approvedBy: string,
    role: string,
    notes?: string,
    checklist?: Record<string, boolean>
  ): Promise<GovernanceStatus> {
    const res = await fetch(
      `${AI_SERVICE_BASE_URL}/agents/compliance/sign-off/${encodeURIComponent(proposalId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved_by: approvedBy,
          approver_role: role,
          review_notes: notes || null,
          submission_checklist: checklist || {},
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to sign off proposal: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch current governance and sign-off status
   */
  async getGovernanceStatus(proposalId: string): Promise<GovernanceStatus> {
    const res = await fetch(
      `${AI_SERVICE_BASE_URL}/agents/compliance/governance/${encodeURIComponent(proposalId)}`,
      { method: "GET" }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch governance status: ${res.statusText}`);
    }
    return res.json();
  },
};
