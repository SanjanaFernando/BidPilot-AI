/**
 * BidPilot AI - Database & Domain TypeScript Type Definitions (Phase 2)
 * Matches the PostgreSQL multi-tenant schema with 15 tables and Supabase client types.
 */

// ==============================================================================
// Enums and Literal Types
// ==============================================================================

export type OrganizationPlan = "free" | "pro" | "enterprise";

export type UserRole =
  "owner" | "admin" | "bid_manager" | "technical_writer" | "reviewer" | "member";

export type AvailabilityStatus = "available" | "allocated" | "partially_available";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type HolderType = "company" | "employee";

export type DocumentType =
  "case_study" | "resume" | "proposal_archive" | "compliance_policy" | "whitepaper";

export type TenderStatus =
  | "draft"
  | "analyzing"
  | "ready_for_bidding"
  | "in_progress"
  | "under_review"
  | "submitted"
  | "won"
  | "lost"
  | "abandoned";

export type RequirementCategory =
  | "Security & Privacy"
  | "Functional"
  | "Performance & Reliability"
  | "Compliance"
  | "Architecture & Interoperability"
  | "Bidder Qualification"
  | "Localization"
  | "Deliverables"
  | "Other";

export type RequirementStatus =
  "unverified" | "covered" | "partially_covered" | "missing" | "evidence_required";

export type ProposalStatus =
  "draft" | "generating" | "generated" | "in_review" | "approved" | "rejected" | "exported";

export type ProposalSectionType =
  | "executive_summary"
  | "company_profile"
  | "understanding_of_requirements"
  | "proposed_solution"
  | "technical_architecture"
  | "implementation_methodology"
  | "security"
  | "team"
  | "timeline"
  | "pricing"
  | "relevant_experience"
  | "appendices";

export type ProposalSectionStatus =
  "draft" | "generating" | "ready_for_review" | "verified" | "approved";

export type AgentName =
  | "RFPAnalysisAgent"
  | "RequirementAgent"
  | "TechnicalAgent"
  | "BusinessAgent"
  | "ProposalAgent"
  | "ComplianceAgent"
  | "ReviewAgent";

export type AgentRunStatus = "running" | "completed" | "failed" | "cancelled";

// ==============================================================================
// Entity Interfaces (Table Mappings)
// ==============================================================================

/** 1. Organization (Tenant) */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: OrganizationPlan;
  settings: {
    allowed_file_types?: string[];
    max_file_size_mb?: number;
    default_currency?: string;
    default_language?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

/** 2. User Profile */
export interface User {
  id: string; // Supabase auth.users.id
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 3. Project (Company Past Performance) */
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  client: string;
  industry: string;
  description: string;
  technologies: string[];
  challenges: string | null;
  solution: string | null;
  outcomes: string | null;
  budget_range: string | null;
  team_size: number | null;
  start_date: string | null;
  end_date: string | null;
  is_confidential: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 4. Employee (Staff Knowledge) */
export interface Employee {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  role: string;
  department: string | null;
  experience_years: number;
  skills: string[];
  certifications: string[];
  bio: string | null;
  project_history: Array<{
    project_name: string;
    role: string;
    year: string;
    highlights?: string;
  }>;
  availability_status: AvailabilityStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 5. Technology (Tech Capability Register) */
export interface Technology {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  experience_level: ExperienceLevel;
  description: string | null;
  related_projects: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 6. Certification */
export interface Certification {
  id: string;
  organization_id: string;
  name: string;
  issuer: string;
  holder_type: HolderType;
  holder_id: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  evidence_document_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 7. Knowledge Document */
export interface KnowledgeDocument {
  id: string;
  organization_id: string;
  title: string;
  document_type: DocumentType;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  extracted_text: string | null;
  is_processed: boolean;
  chunk_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 8. Document Chunk (Vector Store) */
export interface DocumentChunk {
  id: string;
  organization_id: string;
  document_id: string;
  content: string;
  embedding?: number[] | null; // 768 float values
  token_count: number;
  chunk_index: number;
  page_number: number | null;
  section_heading: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 9. Tender (RFP / Bid Opportunity) */
export interface Tender {
  id: string;
  organization_id: string;
  reference_code: string;
  title: string;
  client_name: string;
  client_organization: string | null;
  submission_deadline: string | null;
  status: TenderStatus;
  budget_currency: string;
  budget_amount: number | null;
  summary: string | null;
  original_file_path: string | null;
  total_requirements_count: number;
  covered_requirements_count: number;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 10. Requirement (Traceable Tender Requirement) */
export interface Requirement {
  id: string;
  organization_id: string;
  tender_id: string;
  req_code: string;
  category: string;
  title: string;
  description: string;
  is_mandatory: boolean;
  source_page: number | null;
  source_section: string | null;
  status: RequirementStatus;
  match_score: number;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 11. Proposal */
export interface Proposal {
  id: string;
  organization_id: string;
  tender_id: string;
  title: string;
  status: ProposalStatus;
  version: number;
  win_probability: number;
  compliance_score: number;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  metadata: {
    target_pages?: number;
    format?: string;
    total_claims?: number;
    verified_claims?: number;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

/** 12. Proposal Section */
export interface ProposalSection {
  id: string;
  organization_id: string;
  proposal_id: string;
  section_type: ProposalSectionType | string;
  title: string;
  order_index: number;
  content_markdown: string;
  status: ProposalSectionStatus;
  verified_claims_count: number;
  unverified_claims_count: number;
  created_at: string;
  updated_at: string;
}

/** 13. Citation */
export interface Citation {
  id: string;
  organization_id: string;
  proposal_section_id: string;
  chunk_id: string | null;
  requirement_id: string | null;
  claim_text: string;
  source_title: string;
  source_page: number | null;
  source_section: string | null;
  similarity_score: number | null;
  is_verified: boolean;
  verification_notes: string | null;
  created_at: string;
}

/** 14. Agent Run */
export interface AgentRun {
  id: string;
  organization_id: string;
  tender_id: string | null;
  proposal_id: string | null;
  agent_name: AgentName | string;
  status: AgentRunStatus;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  logs: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/** 15. Audit Log */
export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ==============================================================================
// Vector Search Return Shape
// ==============================================================================
export interface VectorMatchResult {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  section_heading: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
}
