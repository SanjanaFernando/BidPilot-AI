BidPilot AI

AI-Powered Tender / RFP Response Platform

A Free-Tier-First, Step-by-Step Implementation Plan Next.js + FastAPI +
RAG + Multi-Agent AI + Cloud

Purpose: Build a portfolio/startup-level system for Sri Lankan IT
companies that analyzes RFPs, retrieves evidence from company knowledge,
generates traceable proposal content, checks requirements, and keeps a
human approval step.

## 1. Product Goal

The platform turns a long RFP into a structured, evidence-backed
proposal workflow. It should not be a generic PDF chatbot. Its core
differentiators are requirement traceability, company-specific RAG,
specialized agents, citation-backed claims, compliance verification, and
human approval.

Target flow:

-   Upload RFP → store document → extract and chunk text.

-   Analyze RFP → identify requirements, evaluation criteria,
    deliverables, deadlines and constraints.

-   Search company knowledge → projects, employees, technologies,
    certifications and previous proposals.

-   Generate proposal → executive, technical, business and
    implementation sections.

-   Verify → detect missing requirements and unsupported claims.

-   Human review → edit/approve.

-   Export → DOCX/PDF and maintain an audit trail.

## 2. Free-Tier-First Technology Stack

Current free-tier references checked on 17 September 2026: Vercel Hobby
is free; Supabase Free includes a 500 MB database and 1 GB file storage;
Cloudflare R2 includes 10 GB-month storage and free egress; Render
offers free web services but explicitly describes them as suitable for
testing/hobby projects; GitHub Actions is free for public repositories.
These limits can change, so verify the provider dashboard before
deployment.

## 3. Recommended Zero-Cost Architecture

Use this architecture first:

Browser → Next.js/Vercel → FastAPI/Render → Agent Orchestrator → RAG →
Supabase PostgreSQL/pgvector ↘ Cloudflare R2 for PDFs ↘ Ollama/local
model during development

Important: do not start with AWS RDS if your requirement is strictly
zero ongoing cost. AWS has free-tier/credit programs, but eligibility
and duration depend on account age and the current Free Tier model.
Supabase is simpler for this project because PostgreSQL and vector
search can be kept together.

## 4. Phase 0 --- Prepare the Development Environment

1.  Install Node.js LTS, Git, Python 3.11+, PostgreSQL tooling if
    desired, and VS Code.

2.  Install Ollama locally. Start with a small instruct model that your
    laptop can handle.

3.  Create accounts: GitHub, Vercel, Supabase, Cloudflare, Render and
    Hugging Face only when needed.

4.  Create one GitHub repository: bidpilot-ai.

5.  Create a .env.example file and never commit API keys or secrets.

Suggested repository:

bidpilot-ai/ frontend/ Next.js ai-service/ FastAPI + agents + RAG docs/
architecture and evaluation scripts/ ingestion/evaluation scripts
.github/ CI workflows

## 5. Phase 1 --- Build the Next.js Foundation

Create the application:

> npx create-next-app@latest frontend

Use TypeScript, App Router, Tailwind and ESLint.

Create these pages:

-   /login

-   /dashboard

-   /tenders

-   /tenders/new

-   /tenders/\[id\]

-   /knowledge/projects

-   /knowledge/employees

-   /knowledge/technologies

-   /knowledge/certifications

-   /proposals/\[id\]

-   /settings

Do not build AI first. Get navigation, layouts, forms and basic CRUD
working.

## 6. Phase 2 --- Database and Multi-Tenant Data Model

Create these main tables:

-   organizations

-   users

-   projects

-   employees

-   technologies

-   certifications

-   knowledge_documents

-   document_chunks

-   tenders

-   requirements

-   proposals

-   proposal_sections

-   citations

-   agent_runs

-   audit_logs

Every organization-owned record should carry organization_id. Enforce
tenant isolation with Supabase Row Level Security so one company's
projects cannot be retrieved by another company.

## 7. Phase 3 --- Build the Company Knowledge Base

Start with structured records before adding PDFs.

Projects: name, industry, description, technologies, challenges,
solution, outcomes, duration

Employees: name, role, experience, skills, certifications, project
history

Technologies: name, category, experience level, related projects

Certifications: name, issuer, holder, expiry, evidence document

Seed the system with fictional/demo company data. Do not upload
confidential employer/client information to a portfolio project.

## 8. Phase 4 --- RFP Upload and Document Processing

Pipeline:

RFP PDF → R2 → FastAPI → text extraction → cleaning → chunking →
metadata → embeddings → pgvector

Each chunk should retain evidence metadata:

> {"text": "...", "document_id": "...", "page": 42, "section": "4.2
> Functional Requirements", "tender_id": "..."}

This metadata is essential because later the UI must be able to show
exactly where an answer came from.

## 9. Phase 5 --- RAG

Implement semantic retrieval before building agents.

1.  Generate embeddings locally where possible to avoid API cost.

2.  Store vectors in PostgreSQL with pgvector.

3.  Search top-k relevant chunks.

4.  Apply metadata filters: organization_id, tender_id, document type.

5.  Return source document, page, section and similarity information.

6.  Create POST /rag/search in FastAPI.

Test question:

Which previous project demonstrates healthcare cloud-platform
experience?

Expected output: relevant projects + evidence snippets + document/page
citations.

## 10. Phase 6 --- RFP Analysis Agent

Do not ask an LLM to return free-form text. Require structured JSON.

> {"title":"...", "client":"...", "deadline":"...", "requirements":\[\],
> "evaluationCriteria":\[\], "deliverables":\[\], "technologies":\[\],
> "certifications":\[\]}

Store the extracted requirements so the rest of the system works with
structured data.

## 11. Phase 7 --- Requirement Agent

Convert each requirement into a traceable object:

> {"id":"REQ-0042","category":"Security","requirement":"Role-based
> access control",
> "mandatory":true,"sourcePage":42,"status":"unverified"}

Build the requirement matrix UI:

-   Covered

-   Partially covered

-   Missing

-   Evidence required

## 12. Phase 8 --- Multi-Agent Workflow

Use an orchestrator such as LangGraph after the single-agent RAG
workflow works.

Orchestrator → RFP Analysis Agent → Requirement Agent → Technical
Agent + Business Agent → Proposal Agent → Compliance Agent → Review
Agent

Agent responsibilities:

## 13. Phase 9 --- Evidence-First Generation

Implement a strict rule: the model may describe company capabilities
only when evidence exists in the organization's knowledge base.

Example:

Claim: Our company has extensive healthcare experience. Evidence:
Healthcare Management Platform, Case Study p.4. If no evidence exists:
mark the claim as unsupported instead of inventing it.

### Signature Feature: Prove This Claim

Let a reviewer select any generated statement and click 'Prove this
claim'. The system retrieves supporting evidence and displays the
source, page, similarity and an Insert Citation action.

## 14. Phase 10 --- Compliance and Human Approval

Compliance agent compares requirements against the generated proposal.

-   Requirement addressed?

-   Evidence available?

-   Proposal section containing the evidence?

-   Contradiction detected?

-   Certification actually present?

Never make tender submission fully autonomous. AI drafts and verifies;
an authorized human edits and approves.

## 15. Phase 11 --- Proposal Editor and Export

Create sections:

-   Executive Summary

-   Company Profile

-   Understanding of Requirements

-   Proposed Solution

-   Architecture

-   Implementation Methodology

-   Security

-   Team

-   Timeline

-   Relevant Experience

-   Support and Maintenance

-   Appendices

Provide Edit, Regenerate, Find Evidence, Show Sources and Approve
actions.

Generate DOCX first. Add PDF conversion only after DOCX output is
stable.

## 16. Phase 12 --- Real-World Multi-Tenant Role-Based Access Control (RBAC)

Transition from the single-tenant demo/mock state to a production-grade enterprise RBAC system with cryptographic authorization, fine-grained permissions, and collaborative section assignments.

### 16.1 Enterprise Role Hierarchy & Permission Matrix

| Role | Target Persona | Permissions & Scope |
| --- | --- | --- |
| **Org Admin** | VP / Operations Director | Organization-wide administration, user provisioning, role assignments, billing, API keys, knowledge base governance, and audit log inspection. |
| **Bid Manager** | Proposal Lead / Capture Manager | Full RFP lifecycle management: tender creation, orchestrating AI agent pipelines, assigning section authors, approving/rejecting sections, executing final human sign-off, and exporting official DOCX/PDF bids. |
| **Solution Architect** | Technical Lead / Enterprise Architect | Authoring and editing technical/architecture sections, triggering Technical Agent regeneration, proving technical claims, and verifying technical requirement compliance. |
| **Compliance Officer** | Legal Counsel / Risk Manager | Reviewing mandatory compliance matrices, verifying certifications and regulatory criteria, and providing mandatory legal sign-off before bid release. |
| **Domain SME / Contributor** | Senior Engineer / Project Manager | Editing assigned proposal sections, submitting evidence citations, contributing case studies and employee resumes to the Knowledge Base. |
| **Executive Viewer / Auditor** | C-Level Executive / External Auditor | Read-only access to proposal status, compliance scorecards, audit event streams, and watermarked proposal previews. |

### 16.2 Real Database Schema & Authorization Architecture

1. **RBAC & Collaborative Schema Migration (`database/phase12_rbac_migration.sql`)**:
   - `roles` (id, name, description, is_system_role)
   - `permissions` (id, code, category, description)
   - `role_permissions` (role_id, permission_id)
   - `organization_members` (id, organization_id, user_id, role_id, status, invited_at, joined_at)
   - `tender_collaborators` (tender_id, user_id, assigned_role, can_sign_off)
   - `section_assignments` (section_id, assigned_user_id, status, review_notes)
   - `section_locks` (section_id, locked_by_user_id, locked_at, expires_at) to prevent concurrent overwrite collisions.

2. **Supabase Row Level Security (RLS) Engine**:
   - Integrate custom JWT claims via Supabase Auth Hooks (`app_metadata.org_id`, `app_metadata.role`, `app_metadata.permissions`).
   - Write strict PostgreSQL RLS policies enforcing tenant isolation and role gates on `tenders`, `requirements`, `proposals`, `proposal_sections`, `knowledge_chunks`, and `audit_logs`.
   - Prevent any cross-organization data leakage even if API endpoints are queried directly.

3. **FastAPI Backend RBAC & JWT Verification Middleware**:
   - Replace demo fallback IDs with verified Supabase JWT Bearer token validation (JWKS signature verification).
   - FastAPI permission dependencies:
     - `@require_permission("proposals:sign_off")`
     - `@require_role(["OrgAdmin", "BidManager"])`
     - `@require_section_access(action="edit")`
   - Real-time collaborative section locking (`PUT /agents/proposals/sections/{id}/lock` with 5-minute heartbeat).

4. **Frontend Dynamic RBAC Guards & UI Enforcement**:
   - Auth Context & `useUserPermissions()` hook.
   - Dynamic UI gating: Hide or disable destructive/sensitive controls (e.g. *Human Sign-Off Modal*, *Regenerate Section*, *Approve Section*, *Export Proposal*, *Knowledge Base Deletion*) with informative tooltips based on the active user's role.
   - Organization Team & Member Management page under `/settings/team`.

---

## 17. Phase 13 --- Enterprise Knowledge Governance & Secret Scrubbing

Prevent accidental exposure of client confidential data, internal salary rates, or proprietary credentials during LLM synthesis:

1. **Knowledge Clearance & Document Tiers**:
   - Assign classification tiers to Knowledge Base items (`Public Org-Wide`, `Confidential Leadership`, `Restricted NDA-Only`).
   - Filtered RAG vector retrieval: pgvector cosine similarity search automatically injects `user_clearance_level` into metadata filters so LLMs never synthesize restricted internal data for low-clearance team members.

2. **Automated PII & Secret Scrubbing Pipeline**:
   - Pre-embedding scanning pipeline to detect and redact API keys, passwords, proprietary cost margins, and personally identifiable information (PII) before chunking and embedding.

---

## 18. Phase 14 --- Cryptographic Audit Trail & Tamper-Evident Electronic Signatures

1. **Immutable Audit Event Chaining**:
   - Enhance `audit_logs` with SHA-256 cryptographic hash chaining (`prev_event_hash`, `payload_hash`, `current_hash`) to provide verifiable tamper-evident compliance for government audits.
   - Log all critical events: RFP Ingestion, Agent Execution, Section Edits, Citation Invalidation, Section Approvals, and Final Sign-Offs.

2. **Formal Electronic Signature & Certificate Verification**:
   - Capture legally binding sign-off records: Signer Full Name, Corporate Email, Timestamp (UTC), IP Address, Device User-Agent, and SHA-256 hash of the final generated proposal payload.
   - Document Verification Engine: Exported PDF/DOCX embeds a verification badge and QR code linking to `/verify/[proposal_hash]` for tender evaluation committees to verify bid authenticity.

---

## 19. Phase 15 --- Enterprise Notifications, Webhooks & Automated Workflow Alerts

1. **Automated Notification Engine**:
   - Real-time alerts when tender deadlines approach, requirements are extracted, sections are assigned, or human approval is requested.
   - In-app notification bell with live badge counters.
   - Email notifications via Resend / SendGrid and webhook dispatch to Slack / Microsoft Teams channels.

2. **External Tender Intake Webhook**:
   - Secure API endpoint (`POST /webhooks/tenders/ingest`) allowing ERP/CRM systems to push new RFPs automatically into the analysis queue.

---

## 20. Phase 16 --- Cloud Production Deployment & High-Availability Scaling

Enterprise deployment architecture for production workloads:

- **Frontend**: Next.js App Router deployed on Vercel Pro / AWS Amplify with Edge CDN and custom domains.
- **Backend AI Service**: FastAPI containerized via Docker on AWS ECS / Google Cloud Run / Render with auto-scaling workers.
- **Database & Storage**: Managed Supabase PostgreSQL + pgvector (Pro tier with Point-in-Time Recovery and daily backups), Cloudflare R2 / AWS S3 for RFP document storage.
- **Rate Limiting & Tenant Quotas**: Redis / Upstash token bucket rate limiter to prevent API abuse and manage LLM token quotas per organization.
- **CI/CD Pipeline**: GitHub Actions automated pipeline running unit tests, linting, typechecking, and automated database migration rollouts.

## 21. Strict $0 AI Strategy

Hosted LLM APIs are the main place where a 'free' project can
accidentally create charges. Therefore use local inference or verified free tiers as the
default development path.

-   Ollama + a small instruct model for generation (or Gemini 2.5 Flash Free Tier).
-   A local embedding model / Google embedding for RAG.
-   Local evaluation scripts.
-   Optional Hugging Face free inference only for small experiments.
-   Do not add a paid API key as a required dependency.

## 22. Free-Tier Safety & Cost Control Rules

1.  Do not attach a credit card unless you understand the provider's
    billing controls and terms.
2.  Never enable pay-as-you-go for this project if $0 is a hard
    requirement.
3.  Set usage alerts wherever the provider supports them.
4.  Keep demo documents small and synthetic.
5.  Do not run a GPU-hosted model in the cloud on paid instances.
6.  Do not store confidential client/company documents in your public
    demo.
7.  Keep production-like features behind authentication and RBAC.
8.  Back up important demo data locally because free databases can pause
    or expire.

## 23. 12-Week Comprehensive Enterprise Roadmap

| Week | Deliverable |
| --- | --- |
| **Week 1** | Next.js foundation, base auth, organization model, dashboard layout and initial database schema. |
| **Week 2** | Knowledge base CRUD: projects, employees, technologies, certifications. |
| **Week 3** | RFP upload, R2 storage, PDF extraction, chunking and evidence metadata. |
| **Week 4** | Embeddings, pgvector, semantic search, citations and RAG evaluation. |
| **Week 5** | RFP Analysis Agent + Requirement Agent + requirement matrix dashboard. |
| **Week 6** | Technical, Business, Proposal, Compliance and Review multi-agent pipeline. |
| **Week 7** | Proposal editor, human sign-off modal, section revision loop, DOCX & PDF exports. |
| **Week 8** | Multi-tenant RBAC system: roles table, permissions matrix, Supabase custom JWT claims, and RLS engine. |
| **Week 9** | FastAPI RBAC middleware, `@require_permission` guards, collaborative section locking, and `/settings/team` UI. |
| **Week 10** | Enterprise Knowledge Governance: clearance tiers, filtered RAG vector retrieval, and automated PII/secret scrubbing. |
| **Week 11** | Cryptographic audit trail: SHA-256 event hash chaining, legally binding electronic signatures, and public `/verify` portal. |
| **Week 12** | Enterprise notifications (Email/Slack webhooks), rate limiting, containerized cloud deployment, and production hardening. |

## 24. Evaluation & Verification Plan

Create a benchmark suite rather than claiming that the AI 'works':

-   Requirement extraction precision & recall on benchmark RFPs.
-   Retrieval precision/recall on known questions.
-   Citation correctness and provenance linking.
-   Unsupported-claim detection rate.
-   Requirement coverage verification after proposal synthesis.
-   Agent failure rate & retry resilience.
-   RBAC security test suite: verify zero cross-tenant leakage and privilege escalation prevention.
-   Average RAG latency and proposal-generation throughput.

## 25. Portfolio & Production Demonstration Scenario

-   **Company**: LankaTech Solutions (Sri Lankan Enterprise IT Firm).
-   **Tender**: National Hospital Information Management System (ICTA / Ministry of Health).
-   **RFP**: 50–100 page synthetic public tender document.
-   **Knowledge Base**: 10 enterprise projects, 20 qualified personnel, technology stack, ISO/CMMI certifications.
-   **Personas & Real-World Flow**:
    1. *Bid Manager* uploads RFP, runs Multi-Agent Analysis, and reviews extracted requirements.
    2. *Solution Architect* authors and regenerates technical sections, verifying architecture claims.
    3. *Compliance Officer* reviews mandatory criteria compliance and flags missing certifications.
    4. *Bid Manager* executes formal Human Sign-off with cryptographic timestamp and exports official PDF/DOCX.
    5. *Auditor* inspects immutable audit logs and verifies document authenticity via the verification badge.

## 26. Final System Architecture

```
User / Browser (Next.js 16 + React 19 + TailwindCSS)
  │
  ├── Dynamic RBAC UI Guards (useUserPermissions)
  │
  ▼ [JWT with Org ID & Roles]
FastAPI AI Backend (Python 3.11+)
  ├── RBAC & Permission Middleware (@require_permission)
  ├── Collaborative Section Locking (Redis / Supabase)
  │
  ├── Multi-Agent Orchestrator
  │     ├── RFP Analysis Agent
  │     ├── Requirement Agent
  │     ├── Technical Agent
  │     ├── Business Agent
  │     ├── Proposal Synthesis Agent
  │     ├── Compliance Verification Agent
  │     └── Review & Quality Agent
  │
  ├── Enterprise Knowledge Governance & Secret Scrubber
  │
  └── RAG Retrieval Engine (pgvector + Embeddings)
        │
        ▼
Supabase PostgreSQL & Storage Layer
  ├── Tenant-Isolated Tables with RLS Policies
  ├── Cryptographic Hash-Chained Audit Logs
  └── Cloudflare R2 / S3 Document Vault
```

## 27. Summary of System Layers & Technologies

| Layer | Technology Choice | Enterprise Role | Security & Governance Focus |
| --- | --- | --- | --- |
| **Frontend** | Next.js 16 + TypeScript + Tailwind | Responsive App, Dashboard, Proposal Editor | Client-side RBAC guards, role-based conditional rendering. |
| **Authentication & RBAC** | Supabase Auth + Custom JWT Claims | Multi-tenant auth, roles, permissions | Secure tokens, RLS enforcement, session refresh. |
| **AI Backend** | FastAPI + Python 3.11 | API Router, Agent Orchestration, Exporters | `@require_permission` decorators, token validation, audit hooks. |
| **Vector Database** | PostgreSQL + pgvector (Supabase) | Semantic storage, metadata-filtered search | Clearance-filtered vector matching, strict RLS isolation. |
| **Multi-Agent Engine** | LangGraph / Native Python Orchestrator | Structured RFP extraction & synthesis | Evidence-backed prompt templates, deterministic JSON schemas. |
| **Document Vault** | Cloudflare R2 / Supabase Storage | RFP PDFs, generated DOCX & PDF bids | Signed URLs, encrypted at rest, access-controlled buckets. |
| **Audit & Integrity** | Postgres + SHA-256 Hashing | Immutable audit trail, e-signatures | Tamper-evident event chaining, electronic signature records. |
| **Export Engine** | python-docx + ReportLab | Executive DOCX & PDF generation | Professional typography, verification QR code, evidence matrix. |
