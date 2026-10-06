# BidPilot AI

BidPilot AI is an AI-assisted tender and RFP response platform for IT companies. It turns an RFP into a structured, evidence-backed proposal workflow with requirement traceability, company-specific knowledge retrieval, specialized AI agents, compliance checks, human review, and document export.

## What it does

- Accepts and processes RFP and tender documents.
- Extracts requirements, evaluation criteria, deliverables, deadlines, and constraints.
- Searches company knowledge using retrieval-augmented generation (RAG).
- Generates proposal content for executive, technical, business, and implementation sections.
- Checks requirements, compliance, and unsupported claims.
- Supports human review and approval before export.
- Exports proposals to DOCX and PDF and records an audit trail.

## Architecture

The project is split into two applications:

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, and Supabase client integrations.
- **AI service:** FastAPI with Python, specialized agents, RAG/vector services, document processing, exports, notifications, and audit services.
- **Database:** PostgreSQL/Supabase schema and migrations in `database/`.
- **Storage and AI providers:** Configurable through environment variables. Local development can use Ollama or another configured model provider.

## Repository structure

```text
frontend/       Next.js web application
ai-service/     FastAPI API and AI agent service
database/       PostgreSQL schema, seed data, and migrations
sample-rfp/     Sample RFP documents for development
```

## Prerequisites

- Node.js LTS and npm
- Python 3.11 or newer
- A PostgreSQL/Supabase project for database-backed features
- Credentials for the services enabled in the AI service configuration

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run lint
npm run build
```

## Run the AI service

```powershell
cd ai-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API is then available at [http://localhost:8000](http://localhost:8000). FastAPI provides interactive documentation at `/docs`.

## Configuration

Keep local credentials in environment files and never commit them. Configure the frontend and AI service with the Supabase URL/key, database settings, storage settings, model provider credentials, and any other values required by `ai-service/app/config.py` and `frontend/src/lib/`.

The SQL files in `database/` should be applied to a development database in their intended migration order. Do not use production credentials for local development.

## Development notes

- Keep proposal claims traceable to retrieved company evidence.
- Treat AI output as draft content until a human approves it.
- Add schema changes as numbered database migrations.
- Keep generated files, local environments, secrets, and the private implementation plan out of Git.