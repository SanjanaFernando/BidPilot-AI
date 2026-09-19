"""
BidPilot AI - Pydantic Schemas (Phase 2)
Data validation models for FastAPI routes, RAG operations, and Agent structured outputs.
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ==============================================================================
# Base Schema Configuration
# ==============================================================================
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==============================================================================
# Organization Schemas
# ==============================================================================
class OrganizationBase(BaseSchema):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    domain: Optional[str] = None
    plan: Literal["free", "pro", "enterprise"] = "free"
    settings: Dict[str, Any] = Field(default_factory=dict)


class OrganizationResponse(OrganizationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# User Schemas
# ==============================================================================
class UserBase(BaseSchema):
    email: EmailStr
    full_name: str = Field(..., max_length=255)
    role: Literal["owner", "admin", "bid_manager", "technical_writer", "reviewer", "member"] = "member"
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    is_active: bool = True


class UserResponse(UserBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# Knowledge Base Schemas (Projects, Employees, Tech, Certs)
# ==============================================================================
class ProjectBase(BaseSchema):
    name: str = Field(..., max_length=255)
    client: str = Field(..., max_length=255)
    industry: str = Field(..., max_length=100)
    description: str
    technologies: List[str] = Field(default_factory=list)
    challenges: Optional[str] = None
    solution: Optional[str] = None
    outcomes: Optional[str] = None
    budget_range: Optional[str] = None
    team_size: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_confidential: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProjectResponse(ProjectBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime


class EmployeeBase(BaseSchema):
    name: str = Field(..., max_length=255)
    email: Optional[EmailStr] = None
    role: str = Field(..., max_length=150)
    department: Optional[str] = None
    experience_years: float = 0.0
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    project_history: List[Dict[str, Any]] = Field(default_factory=list)
    availability_status: Literal["available", "allocated", "partially_available"] = "available"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EmployeeResponse(EmployeeBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime


class TechnologyBase(BaseSchema):
    name: str = Field(..., max_length=150)
    category: str = Field(..., max_length=100)
    experience_level: Literal["beginner", "intermediate", "advanced", "expert"] = "advanced"
    description: Optional[str] = None
    related_projects: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TechnologyResponse(TechnologyBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime


class CertificationBase(BaseSchema):
    name: str = Field(..., max_length=255)
    issuer: str = Field(..., max_length=255)
    holder_type: Literal["company", "employee"] = "company"
    holder_id: Optional[UUID] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    evidence_document_path: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CertificationResponse(CertificationBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# Document & RAG Vector Search Schemas
# ==============================================================================
class DocumentChunkResponse(BaseSchema):
    id: UUID
    document_id: UUID
    content: str
    chunk_index: int
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RAGSearchRequest(BaseSchema):
    query: str
    organization_id: UUID
    document_id: Optional[UUID] = None
    match_count: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.70, ge=0.0, le=1.0)


class RAGSearchResult(BaseSchema):
    chunk_id: UUID
    document_id: UUID
    content: str
    page_number: Optional[int]
    section_heading: Optional[str]
    similarity: float
    metadata: Dict[str, Any]


# ==============================================================================
# Tender & Requirement Schemas
# ==============================================================================
class TenderBase(BaseSchema):
    reference_code: str = Field(..., max_length=100)
    title: str = Field(..., max_length=255)
    client_name: str = Field(..., max_length=255)
    client_organization: Optional[str] = None
    submission_deadline: Optional[datetime] = None
    status: Literal[
        "draft",
        "analyzing",
        "ready_for_bidding",
        "in_progress",
        "under_review",
        "submitted",
        "won",
        "lost",
        "abandoned",
    ] = "draft"
    budget_currency: str = "LKR"
    budget_amount: Optional[float] = None
    summary: Optional[str] = None
    original_file_path: Optional[str] = None


class TenderResponse(TenderBase):
    id: UUID
    organization_id: UUID
    total_requirements_count: int
    covered_requirements_count: int
    created_by: Optional[UUID]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class RequirementBase(BaseSchema):
    req_code: str = Field(..., max_length=50)
    category: str = Field(..., max_length=100)
    title: str = Field(..., max_length=255)
    description: str
    is_mandatory: bool = True
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    status: Literal[
        "unverified",
        "covered",
        "partially_covered",
        "missing",
        "evidence_required",
    ] = "unverified"
    match_score: float = 0.0
    assigned_to: Optional[UUID] = None
    notes: Optional[str] = None
    evidence_metadata: List[Dict[str, Any]] = Field(default_factory=list)


class RequirementResponse(RequirementBase):
    id: UUID
    organization_id: UUID
    tender_id: UUID
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# Proposal & Citation Schemas
# ==============================================================================
class ProposalBase(BaseSchema):
    title: str = Field(..., max_length=255)
    status: Literal[
        "draft",
        "generating",
        "generated",
        "in_review",
        "approved",
        "rejected",
        "exported",
    ] = "draft"
    version: int = 1
    win_probability: float = 0.0
    compliance_score: float = 0.0


class ProposalResponse(ProposalBase):
    id: UUID
    organization_id: UUID
    tender_id: UUID
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_by: Optional[UUID]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ProposalSectionResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    proposal_id: UUID
    section_type: str
    title: str
    order_index: int
    content_markdown: str
    status: Literal["draft", "generating", "ready_for_review", "verified", "approved"]
    verified_claims_count: int
    unverified_claims_count: int
    created_at: datetime
    updated_at: datetime


class CitationResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    proposal_section_id: UUID
    chunk_id: Optional[UUID]
    requirement_id: Optional[UUID]
    claim_text: str
    source_title: str
    source_page: Optional[int]
    source_section: Optional[str]
    similarity_score: Optional[float]
    is_verified: bool
    verification_notes: Optional[str]
    created_at: datetime


# ==============================================================================
# Structured Agent Output Schemas (Phases 6-10)
# ==============================================================================
class ExtractedRequirementSchema(BaseSchema):
    req_code: str
    category: str
    title: str
    description: str
    is_mandatory: bool = True
    source_page: Optional[int] = None
    source_section: Optional[str] = None


class RFPAnalysisOutputSchema(BaseSchema):
    title: str
    client_name: str
    submission_deadline: Optional[str]
    summary: str
    budget_estimate: Optional[str]
    evaluation_criteria: List[str]
    deliverables: List[str]
    technologies: List[str]
    certifications_required: List[str]
    requirements: List[ExtractedRequirementSchema]


# ==============================================================================
# Phase 7 — Requirement Agent Schemas
# ==============================================================================
class EvidenceItemSchema(BaseSchema):
    source_type: str = Field(..., description="project | employee | technology | certification | document")
    source_name: str = Field(..., description="Name / title of the evidence asset")
    source_id: Optional[str] = None
    content_snippet: str = Field(..., description="Relevant text excerpt proving coverage")
    similarity_score: float = Field(0.0, ge=0.0, le=1.0)
    source_page: Optional[int] = None
    source_section: Optional[str] = None


class RequirementEvaluationSchema(BaseSchema):
    req_code: str
    status: Literal["covered", "partially_covered", "missing", "evidence_required"]
    match_score: float = Field(..., ge=0.0, le=100.0, description="Match score percentage")
    assessment_rationale: str = Field(..., description="Reasoning of capability coverage against company knowledge")
    gap_analysis: Optional[str] = Field(None, description="Identified gaps or missing elements")
    recommended_action: Optional[str] = Field(None, description="Recommended bid response strategy or evidence to acquire")
    evidence: List[EvidenceItemSchema] = Field(default_factory=list)


class BatchEvaluateRequirementsRequest(BaseSchema):
    organization_id: str
    tender_id: str
    requirement_ids: Optional[List[str]] = None
    mode: Literal["all", "unverified_only", "force_recheck"] = "all"


class SingleEvaluateRequirementRequest(BaseSchema):
    organization_id: str
    tender_id: str
    requirement_id: str


class RequirementUpdatePayload(BaseSchema):
    status: Optional[Literal["unverified", "covered", "partially_covered", "missing", "evidence_required"]] = None
    match_score: Optional[float] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    evidence_metadata: Optional[List[Dict[str, Any]]] = None


# ==============================================================================
# Phase 8 — Multi-Agent Workflow Schemas
# ==============================================================================

class TechnicalStrategyOutput(BaseSchema):
    architecture_overview: str
    recommended_tech_stack: List[Dict[str, str]]  # e.g. [{"name": "PostgreSQL", "role": "Relational DB", "rationale": "..."}]
    infrastructure_design: str
    security_controls: List[str]
    integration_patterns: List[str]
    implementation_phases: List[Dict[str, Any]]
    evidence_citations: List[EvidenceItemSchema] = Field(default_factory=list)


class BusinessStrategyOutput(BaseSchema):
    executive_overview: str
    matched_case_studies: List[Dict[str, Any]]
    allocated_team: List[Dict[str, Any]]
    delivery_methodology: str
    sla_support_model: str
    win_themes: List[str]
    evidence_citations: List[EvidenceItemSchema] = Field(default_factory=list)


class GeneratedSectionSchema(BaseSchema):
    section_type: str
    title: str
    order_index: int
    content_markdown: str
    verified_claims_count: int = 0
    unverified_claims_count: int = 0
    citations: List[Dict[str, Any]] = Field(default_factory=list)


class ProposalGenerationOutput(BaseSchema):
    title: str
    summary: str
    sections: List[GeneratedSectionSchema]
    total_sections: int


class ComplianceRequirementMapping(BaseSchema):
    req_code: str
    status: str
    is_mandatory: bool
    addressed_in_section: Optional[str] = None
    evidence_source: Optional[str] = None
    compliance_notes: Optional[str] = None


class ComplianceAuditOutput(BaseSchema):
    compliance_score: float = Field(..., ge=0.0, le=100.0)
    mandatory_met_count: int
    mandatory_total_count: int
    total_requirements: int
    requirements_mappings: List[ComplianceRequirementMapping]
    flagged_gaps: List[str]
    certification_verifications: List[Dict[str, Any]]
    summary: str


class ReviewQualityOutput(BaseSchema):
    win_probability: float = Field(..., ge=0.0, le=100.0)
    quality_score: float = Field(..., ge=0.0, le=100.0)
    strengths: List[str]
    unsupported_claims: List[Dict[str, Any]]
    contradictions_detected: List[str]
    recommendations: List[str]
    executive_assessment: str


class PipelineStageInfo(BaseSchema):
    stage_name: str
    agent_name: str
    status: Literal["pending", "running", "completed", "failed", "skipped"]
    latency_ms: int = 0
    summary: Optional[str] = None


class PipelineRunRequest(BaseSchema):
    organization_id: str
    tender_id: str
    document_id: Optional[str] = None
    target_proposal_title: Optional[str] = None
    stages: Optional[List[str]] = None  # None = run all stages


class PipelineRunResponse(BaseSchema):
    run_id: str
    tender_id: str
    proposal_id: Optional[str]
    status: Literal["completed", "partial", "failed"]
    total_latency_ms: int
    stages_executed: List[PipelineStageInfo]
    proposal_summary: Optional[Dict[str, Any]] = None
    compliance: Optional[ComplianceAuditOutput] = None
    review: Optional[ReviewQualityOutput] = None
    message: str


class PipelineStageRunRequest(BaseSchema):
    organization_id: str
    tender_id: str
    proposal_id: Optional[str] = None
    stage: Literal["technical", "business", "proposal", "compliance", "review"]


