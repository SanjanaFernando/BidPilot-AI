/**
 * BidPilot AI — Claim Verification & Citation Service (Phase 9)
 * Connects frontend to the Prove This Claim engine and citations table.
 */

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export interface ClaimVerifyEvidenceItem {
  chunk_id?: string | null;
  source_type: string;
  source_id?: string | null;
  source_name: string;
  content_snippet: string;
  similarity_score: number;
  source_page?: number | null;
  source_section?: string | null;
}

export interface ClaimVerifyResponse {
  claim_text: string;
  verification_status: "verified" | "partially_supported" | "unsupported";
  confidence_score: number;
  is_supported: boolean;
  assessment_rationale: string;
  supporting_evidence: ClaimVerifyEvidenceItem[];
  suggested_citation_anchor: string;
  suggested_rewrite?: string | null;
}

export interface CitationItem {
  id: string;
  organization_id: string;
  proposal_section_id: string;
  citation_number: number;
  citation_anchor: string;
  claim_text: string;
  verification_status: string;
  similarity_score: number;
  source_type?: string | null;
  source_id?: string | null;
  source_name?: string | null;
  source_page?: number | null;
  source_section?: string | null;
  created_at?: string | null;
}

export const claimsService = {
  /**
   * Prove This Claim: Verify a statement against company knowledge chunks.
   */
  async verifyClaim(
    claimText: string,
    organizationId: string,
    options?: {
      proposalSectionId?: string;
      sourceTypeFilter?: string;
      matchThreshold?: number;
    }
  ): Promise<ClaimVerifyResponse> {
    const res = await fetch(`${AI_SERVICE_URL}/agents/claims/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim_text: claimText,
        organization_id: organizationId,
        proposal_section_id: options?.proposalSectionId || null,
        source_type_filter: options?.sourceTypeFilter || null,
        match_threshold: options?.matchThreshold ?? 0.25,
      }),
    });

    if (!res.ok) {
      let errMsg = `Claim verification failed with HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    return res.json();
  },

  /**
   * Insert verified citation into the database and bind to section.
   */
  async insertCitation(
    organizationId: string,
    sectionId: string,
    claimText: string,
    evidence: ClaimVerifyEvidenceItem,
    status: "verified" | "partially_supported" | "unsupported" = "verified",
    customAnchor?: string
  ): Promise<CitationItem> {
    const res = await fetch(`${AI_SERVICE_URL}/agents/claims/insert-citation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: organizationId,
        proposal_section_id: sectionId,
        claim_text: claimText,
        chunk_id: evidence.chunk_id || null,
        verification_status: status,
        similarity_score: evidence.similarity_score || 0.0,
        source_type: evidence.source_type || "document",
        source_id: evidence.source_id || null,
        source_name: evidence.source_name || "Company Record",
        source_page: evidence.source_page || null,
        source_section: evidence.source_section || null,
        citation_anchor: customAnchor || null,
      }),
    });

    if (!res.ok) {
      let errMsg = `Failed to insert citation with HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    return res.json();
  },

  /**
   * Fetch all active citations for a proposal section.
   */
  async getSectionCitations(
    sectionId: string,
    organizationId: string
  ): Promise<CitationItem[]> {
    const params = new URLSearchParams({ organization_id: organizationId });
    const res = await fetch(
      `${AI_SERVICE_URL}/agents/claims/${encodeURIComponent(sectionId)}?${params.toString()}`
    );

    if (!res.ok) {
      return [];
    }

    return res.json();
  },
};
