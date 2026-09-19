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

## 16. Phase 12 --- Cloud Deployment Without Paid Services

Recommended portfolio deployment:

-   Next.js → Vercel Hobby.

-   FastAPI → Render Free.

-   PostgreSQL + pgvector + Auth → Supabase Free.

-   RFP files → Cloudflare R2.

-   Git repository + CI → GitHub.

-   AI inference during development → Ollama locally.

Important: Vercel's current Hobby terms specify personal/non-commercial
use. Treat the Vercel deployment as a portfolio/demo deployment, not a
commercial SaaS service. Render Free is explicitly positioned for
testing/hobby projects and its service sleeps when idle. Supabase Free
can pause inactive projects. These are acceptable for a portfolio but
not a production business workload.

## 17. Strict \$0 AI Strategy

Hosted LLM APIs are the main place where a 'free' project can
accidentally create charges. Therefore use local inference as the
default development path.

-   Ollama + a small instruct model for generation.

-   A local embedding model for RAG.

-   Local evaluation scripts.

-   Optional Hugging Face free inference only for small experiments.

-   Do not add a paid API key as a required dependency.

Hugging Face currently provides a small monthly credit to free users for
Inference Providers, but usage beyond that can require purchased
credits. Treat it as optional, not as the foundation of a zero-cost
guarantee.

## 18. Free-Tier Safety Rules

1.  Do not attach a credit card unless you understand the provider's
    billing controls and terms.

2.  Never enable pay-as-you-go for this project if \$0 is a hard
    requirement.

3.  Set usage alerts wherever the provider supports them.

4.  Keep demo documents small and synthetic.

5.  Do not run a GPU-hosted model in the cloud.

6.  Do not store confidential client/company documents in your public
    demo.

7.  Keep production-like features behind authentication.

8.  Back up important demo data locally because free databases can pause
    or expire.

## 19. 8-Week Development Roadmap

## 20. Evaluation Plan

Create a small benchmark rather than claiming that the AI 'works'.

-   Requirement extraction accuracy.

-   Retrieval precision/recall on known questions.

-   Citation correctness.

-   Unsupported-claim detection.

-   Requirement coverage after proposal generation.

-   Agent failure rate.

-   Average RAG latency.

-   Average proposal-generation time.

Create 50--100 synthetic requirements with expected source documents.
Use them to regression-test every change.

## 21. Portfolio Demonstration Scenario

Use a fictional Sri Lankan software company and fictional tender.

-   Company: LankaTech Solutions (fictional).

-   Tender: Hospital Information Management System.

-   RFP: 50--100 page synthetic document.

-   Knowledge base: 10 fictional projects, 20 fictional employees,
    technologies, certifications and 5 previous proposals.

-   Run: upload → analyze → requirements → retrieve evidence → generate
    → compliance review → human edit → export.

This gives you a safe, repeatable demo without exposing real client
information.

## 22. Final Architecture

User ↓ Next.js + TypeScript ↓ FastAPI ↓ Agent Orchestrator ├── RFP
Analysis Agent ├── Requirement Agent ├── Technical Agent ├── Business
Agent ├── Proposal Agent ├── Compliance Agent └── Review Agent ↓ RAG
Service ├── Embedding Model ├── PostgreSQL + pgvector └──
Evidence/Citations ↓ Supabase + Cloudflare R2 ↓ Vercel + Render + GitHub

## 23. What Makes This Strong for an AI Engineer Portfolio

-   Next.js full-stack product engineering.

-   Python/FastAPI AI service.

-   Production-style RAG with metadata and citations.

-   Multi-agent orchestration instead of a single chatbot.

-   Structured outputs and deterministic workflow state.

-   Human-in-the-loop AI.

-   Multi-tenant authorization and data isolation.

-   Cloud deployment using free-tier services.

-   AI evaluation and regression testing.

-   Hallucination and prompt-injection defenses.

-   Observability, audit logs, latency and cost awareness.

## 24. First Milestone to Complete

Do not attempt the whole system at once. Your first target is:

> Upload RFP → extract text → chunk → embed → store in pgvector → ask a
> question → retrieve relevant chunks → show answer + page citation.

Once this works reliably, build the Requirement Agent. Once the
requirement workflow works, add the other agents. This order prevents
you from building an impressive-looking multi-agent demo on top of a
weak retrieval layer.

## 25. Free-Tier Reference Notes (Checked 17 September 2026)

Vercel Hobby: free personal-project plan; current documentation lists
included compute/function limits. Vercel's terms also state Hobby is for
personal/non-commercial use.

Supabase Free: \$0, 500 MB database, 1 GB file storage, 5 GB egress and
up to two active projects; free projects can pause after inactivity.

Cloudflare R2: current free tier lists 10 GB-month Standard storage, 1
million Class A operations and 10 million Class B operations per month,
with free egress.

Render Free: free web services are available, but free services spin
down after 15 minutes of inactivity; free Render Postgres expires after
30 days, so use Supabase for the persistent database.

GitHub Actions: standard runners are free for public repositories;
GitHub Free private repositories have a monthly included quota.

Hugging Face Inference Providers: free users currently receive a small
monthly credit; additional usage can require purchased credits. Local
Ollama inference is therefore the safer \$0 default.

## 26. Suggested Project Title

BidPilot AI --- A Multi-Agent RAG Platform for Evidence-Backed Tender
and RFP Response Generation

Document purpose: implementation blueprint for a portfolio-grade
project. Provider limits and terms are time-sensitive and should be
rechecked before deployment.

| Layer \| Recommended choice \| Free-tier role \| Important limitation
  \|

| --- \| --- \| --- \| --- \|

| Frontend \| Next.js + Vercel Hobby \| Host the web app \| Hobby is
  intended for personal/non-commercial use; keep this as a
  portfolio/demo deployment. \|

| Database + Auth \| Supabase Free + PostgreSQL + pgvector \| Relational
  data, auth, vector search \| 500 MB database, 1 GB file storage;
  projects pause after inactivity. \|

| Object storage \| Cloudflare R2 \| Store RFPs and documents \| 10
  GB-month storage, 1M Class A and 10M Class B operations/month on free
  tier. \|

| AI for development \| Ollama + local open models \| Zero API cost
  during development \| Uses your laptop CPU/RAM; slower than hosted
  models. \|

| Optional hosted AI \| Hugging Face Inference Providers \| Small
  experiments \| Free users currently receive a small monthly credit; do
  not design the system around paid overages. \|

| Backend \| FastAPI on Render Free \| Deploy Python API \| Free service
  sleeps after inactivity and has limited resources; suitable for
  demos/testing. \|

| Source control/CI \| GitHub Free + Actions \| Repository and CI \|
  Public repositories get free standard Actions usage; private
  repositories have monthly quotas. \|

| Monitoring \| Application logs + simple DB audit logs \| Track agents
  and errors \| Use lightweight logging rather than paid observability.
  \|

| Agent \| Responsibility \|

| --- \| --- \|

| RFP Analysis Agent \| Understand the tender and extract structured
  facts. \|

| Requirement Agent \| Extract and classify mandatory/optional
  requirements. \|

| Technical Agent \| Propose architecture, technology and implementation
  approach using retrieved evidence. \|

| Business Agent \| Find relevant company capabilities, projects, team
  and methodology. \|

| Proposal Agent \| Compose proposal sections from verified inputs. \|

| Compliance Agent \| Map every requirement to proposal evidence and
  flag gaps. \|

| Review Agent \| Find contradictions, unsupported claims and quality
  issues. \|

| Week \| Deliverable \|

| --- \| --- \|

| Week 1 \| Next.js foundation, auth, organization model, dashboard and
  database schema. \|

| Week 2 \| Knowledge base CRUD: projects, employees, technologies,
  certifications. \|

| Week 3 \| RFP upload, R2 storage, PDF extraction, chunking and
  metadata. \|

| Week 4 \| Embeddings, pgvector, semantic search, citations and RAG
  evaluation. \|

| Week 5 \| RFP Analysis Agent + Requirement Agent + requirement
  dashboard. \|

| Week 6 \| Technical, Business, Proposal, Compliance and Review agents.
  \|

| Week 7 \| Proposal editor, human approval, audit logs, DOCX export and
  streaming. \|

| Week 8 \| Cloud deployment, security hardening, evaluation, demo data
  and documentation. \|
