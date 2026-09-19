-- ==============================================================================
-- BidPilot AI - Seed Data (Phase 2 & 3 Demo Data)
-- Fictional Company: LankaTech Solutions (Pvt) Ltd (Colombo, Sri Lanka)
-- Realistic demo data covering projects, employees, technologies,
-- certifications, tenders, requirements, proposals, and citations.
-- UUID key:
--   org  → a0000000-0000-0000-0001-000000000001
--   user → b0000000-0000-0000-0002-000000000001..3
--   tech → c0000000-0000-0000-0003-000000000001..5
--   proj → d0000000-0000-0000-0004-000000000001..3
--   emp  → e0000000-0000-0000-0005-000000000001..3
--   cert → f0000000-0000-0000-0006-000000000001..3
--   tend → a0000000-0000-0000-0007-000000000001..2
--   req  → b0000000-0000-0000-0008-000000000001..5
--   prop → c0000000-0000-0000-0009-000000000001
--   sect → d0000000-0000-0000-000a-000000000001..3
--   cite → e0000000-0000-0000-000b-000000000001..3
-- ==============================================================================

-- 1. Create Demo Organization
INSERT INTO organizations (id, name, slug, domain, plan, settings)
VALUES (
    'a0000000-0000-0000-0001-000000000001',
    'LankaTech Solutions (Pvt) Ltd',
    'lankatech',
    'lankatech.lk',
    'pro',
    '{
        "allowed_file_types": ["pdf", "docx"],
        "max_file_size_mb": 50,
        "default_currency": "LKR",
        "default_language": "en"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Demo Users
INSERT INTO users (id, organization_id, email, full_name, role, job_title, avatar_url)
VALUES 
(
    'b0000000-0000-0000-0002-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'dilan.perera@lankatech.lk',
    'Dilan Perera',
    'owner',
    'Chief Executive Officer & Bid Director',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
),
(
    'b0000000-0000-0000-0002-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'anura.fernando@lankatech.lk',
    'Anura Fernando',
    'bid_manager',
    'Senior Bid & RFP Manager',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
),
(
    'b0000000-0000-0000-0002-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'kavindi.silva@lankatech.lk',
    'Kavindi Silva',
    'technical_writer',
    'Principal Cloud Architect & Tech Writer',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Demo Technologies
INSERT INTO technologies (id, organization_id, name, category, experience_level, description, related_projects)
VALUES
(
    'c0000000-0000-0000-0003-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'Next.js & React 19',
    'Frontend',
    'expert',
    'Modern server-side rendered enterprise portals with responsive accessibility and micro-frontend architectures.',
    ARRAY['National Healthcare Portal', 'Ceylon Commercial Bank Portal']
),
(
    'c0000000-0000-0000-0003-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'FastAPI & Python',
    'Backend & AI',
    'expert',
    'High-throughput asynchronous REST & GraphQL APIs with native Pydantic validation and AI model orchestration.',
    ARRAY['National Healthcare Portal', 'LankaPort AI Logistics Engine']
),
(
    'c0000000-0000-0000-0003-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'PostgreSQL & pgvector',
    'Database',
    'expert',
    'Enterprise relational data modeling, Row-Level Security, partition pruning, and vector similarity indexes.',
    ARRAY['National Healthcare Portal', 'Ceylon Commercial Bank Portal', 'LankaPort AI Logistics Engine']
),
(
    'c0000000-0000-0000-0003-000000000004',
    'a0000000-0000-0000-0001-000000000001',
    'AWS Cloud Architecture',
    'Cloud & DevOps',
    'expert',
    'Multi-region high availability architectures, ECS/EKS containerization, KMS encryption, and Terraform IaC.',
    ARRAY['National Healthcare Portal', 'Colombo Smart Transit Fleet']
),
(
    'c0000000-0000-0000-0003-000000000005',
    'a0000000-0000-0000-0001-000000000001',
    'Docker & Kubernetes',
    'DevOps',
    'expert',
    'Cloud-native container orchestration, CI/CD automated deployment pipelines, and zero-downtime rolling upgrades.',
    ARRAY['National Healthcare Portal', 'Ceylon Commercial Bank Portal']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Demo Projects (Past Experience)
INSERT INTO projects (id, organization_id, name, client, industry, description, technologies, challenges, solution, outcomes, budget_range, team_size, start_date, end_date)
VALUES
(
    'd0000000-0000-0000-0004-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'National Healthcare EHR & Patient Management Platform',
    'Ministry of Health (MoH)',
    'Healthcare',
    'Comprehensive Electronic Health Record (EHR) and clinical workflow system deployed across 35 regional general hospitals.',
    ARRAY['Next.js', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS KMS', 'HL7/FHIR'],
    'Strict patient data sovereignty requirements, offline-first sync capability for rural dispensaries, and sub-second patient record retrieval.',
    'Designed a microservices architecture compliant with HIPAA and Sri Lankan National Digital Health Blueprint, utilizing FHIR API standards and localized edge sync nodes.',
    'Reduced outpatient waiting time by 68%, eliminated paper prescription errors by 99.4%, and scaled to handle 1.2M active patient profiles with 99.98% uptime.',
    'LKR 120M - 150M',
    18,
    '2024-01-15',
    '2025-06-30'
),
(
    'd0000000-0000-0000-0004-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'Omnichannel Digital Banking & Open Banking Gateway',
    'Ceylon Commercial Bank PLC',
    'Banking & Finance',
    'Secure, ISO 20022-compliant digital banking core modernizer and high-frequency transaction settlement gateway.',
    ARRAY['React', 'Spring Boot', 'PostgreSQL', 'Kafka', 'Kubernetes', 'OAuth2/mTLS'],
    'Zero downtime tolerance, millisecond-level SLA for Central Bank LankaPay interbank routing, and end-to-end hardware security module (HSM) encryption.',
    'Engineered an active-active dual datacenter topology with automated failover, biometric MFA, and real-time Kafka event streaming.',
    'Processed 45M transactions in first year with zero security incidents, 99.995% SLA adherence, and received the 2024 National Fintech Innovation Award.',
    'LKR 200M - 250M',
    24,
    '2023-03-01',
    '2024-08-15'
),
(
    'd0000000-0000-0000-0004-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'LankaPort Smart Logistics & Container Terminal AI',
    'Sri Lanka Ports Authority',
    'Logistics & Maritime',
    'AI-driven automated container routing, yard slot allocation, and customs clearance tracking system.',
    ARRAY['Python', 'FastAPI', 'pgvector', 'Next.js', 'OpenCV', 'RabbitMQ'],
    'Real-time optical character recognition (OCR) on high-speed container gantries in dusty harbor environments.',
    'Built edge neural networks deployed on ruggedized IoT gateway controllers coupled with a centralized pgvector logistics dispatch engine.',
    'Decreased vessel turnaround time by 32% and saved an estimated 4,200 truck idling hours per month.',
    'LKR 85M - 110M',
    12,
    '2024-05-01',
    '2025-02-28'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Demo Employees
INSERT INTO employees (id, organization_id, name, email, role, department, experience_years, skills, certifications, bio, availability_status)
VALUES
(
    'e0000000-0000-0000-0005-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'Dr. Kavindi Silva',
    'kavindi.silva@lankatech.lk',
    'Principal Cloud & Healthcare Systems Architect',
    'Enterprise Solutions',
    12.5,
    ARRAY['Enterprise Architecture', 'FHIR/HL7', 'AWS Cloud Solutions', 'FastAPI', 'PostgreSQL', 'High Availability'],
    ARRAY['AWS Certified Solutions Architect - Professional', 'TOGAF 9.2 Certified', 'HL7 FHIR Certified Implementer'],
    'Lead architect behind the National Healthcare EHR rollout. Over 12 years designing mission-critical distributed systems for government and healthcare sectors.',
    'available'
),
(
    'e0000000-0000-0000-0005-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'Kasun Wickramasinghe',
    'kasun.w@lankatech.lk',
    'Lead Information Security & Compliance Specialist',
    'Cybersecurity & Assurance',
    9.0,
    ARRAY['ISO 27001 Auditing', 'SOC 2 Type II', 'Penetration Testing', 'KMS Encryption', 'RBAC & IAM', 'GDPR/HIPAA'],
    ARRAY['CISSP - Certified Information Systems Security Professional', 'CISA', 'ISO 27001 Lead Auditor'],
    'Specialist in sovereign data compliance, national security regulations, cryptographic key management, and zero-trust perimeter defense.',
    'available'
),
(
    'e0000000-0000-0000-0005-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'Ruwan Jayasuriya',
    'ruwan.j@lankatech.lk',
    'Senior Full-Stack & DevOps Engineer',
    'Engineering',
    7.5,
    ARRAY['Next.js', 'React', 'TypeScript', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD Pipelines'],
    ARRAY['CKA - Certified Kubernetes Administrator', 'AWS Certified DevOps Engineer'],
    'Expert in building high-performance web applications and automating multi-region cloud deployment topologies with 99.99% SLA.',
    'available'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Create Demo Certifications
INSERT INTO certifications (id, organization_id, name, issuer, holder_type, issue_date, expiry_date, credential_id, credential_url)
VALUES
(
    'f0000000-0000-0000-0006-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'ISO/IEC 27001:2022 Information Security Management',
    'Bureau Veritas Certification',
    'company',
    '2023-05-10',
    '2026-05-09',
    'BVC-ISMS-LK-8942',
    'https://certificates.bureauveritas.com/lookup/BVC-ISMS-LK-8942'
),
(
    'f0000000-0000-0000-0006-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'ISO 9001:2015 Quality Management Systems',
    'SGS Lanka (Pvt) Ltd',
    'company',
    '2022-11-15',
    '2025-11-14',
    'SGS-QMS-LK-4410',
    'https://www.sgs.com/certified-clients/SGS-QMS-LK-4410'
),
(
    'f0000000-0000-0000-0006-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'AWS Advanced Tier Services Partner',
    'Amazon Web Services',
    'company',
    '2024-01-01',
    '2027-01-01',
    'AWS-PARTNER-LK-902',
    'https://partners.amazonaws.com/directory/lankatech'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Create Demo Tenders (RFPs)
INSERT INTO tenders (id, organization_id, reference_code, title, client_name, client_organization, submission_deadline, status, budget_currency, budget_amount, summary, total_requirements_count, covered_requirements_count)
VALUES
(
    'a0000000-0000-0000-0007-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'TND-2026-MOH-008',
    'Hospital Information Management System (HIMS) Upgrade',
    'Ministry of Health',
    'Government of Sri Lanka',
    NOW() + INTERVAL '14 days',
    'in_progress',
    'LKR',
    180000000.00,
    'National public procurement tender for the supply, deployment, and 3-year support of an integrated Hospital Information Management System across 42 base hospitals.',
    8,
    7
),
(
    'a0000000-0000-0000-0007-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'TND-2026-ICTA-014',
    'Digital Citizen ID & Verifiable Credential Wallet',
    'ICTA Sri Lanka',
    'Information and Communication Technology Agency',
    NOW() + INTERVAL '28 days',
    'ready_for_bidding',
    'LKR',
    95000000.00,
    'Development of a tamper-proof mobile credential repository and OpenID4VCI authentication gateway for citizen e-services.',
    12,
    0
)
ON CONFLICT (id) DO NOTHING;

-- 8. Create Demo Requirements for Tender 1
INSERT INTO requirements (id, organization_id, tender_id, req_code, category, title, description, is_mandatory, source_page, source_section, status, match_score)
VALUES
(
    'b0000000-0000-0000-0008-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0007-000000000001',
    'REQ-SEC-01',
    'Security & Privacy',
    'Role-Based Access Control and ISO 27001 Compliance',
    'The proposed solution must implement granular role-based access control (RBAC), enforce audit trail immutability, and the bidder must hold an active ISO/IEC 27001 certification.',
    TRUE,
    14,
    '3.2 Security Architecture',
    'covered',
    98.50
),
(
    'b0000000-0000-0000-0008-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0007-000000000001',
    'REQ-ARC-02',
    'Architecture & Interoperability',
    'HL7 FHIR Interoperability Standard Support',
    'The system must natively support HL7/FHIR Release 4 RESTful APIs for bi-directional electronic health record exchange with existing laboratory Information systems (LIS).',
    TRUE,
    22,
    '4.1 Healthcare Interoperability',
    'covered',
    96.00
),
(
    'b0000000-0000-0000-0008-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0007-000000000001',
    'REQ-PERF-03',
    'Performance & Reliability',
    'High Availability and Sub-Second Response Times',
    'The architecture must guarantee 99.95% uptime with sub-second response times for clinical encounter lookups under a load of 5,000 concurrent hospital workers.',
    TRUE,
    29,
    '5.4 Performance Standards',
    'covered',
    92.00
),
(
    'b0000000-0000-0000-0008-000000000004',
    'a0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0007-000000000001',
    'REQ-EXP-04',
    'Bidder Qualification',
    'Demonstrated Past Healthcare Implementation Experience',
    'Bidder must have completed at least one nationwide or multi-hospital healthcare platform deployment with a minimum value of LKR 100 Million within the past 3 years.',
    TRUE,
    8,
    '2.1 Minimum Eligibility Criteria',
    'covered',
    100.00
),
(
    'b0000000-0000-0000-0008-000000000005',
    'a0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0007-000000000001',
    'REQ-LOC-05',
    'Localization',
    'Trilingual User Interface Support (Sinhala, Tamil, English)',
    'All patient-facing screens and prescription labels must support dynamic switching between Sinhala, Tamil, and English with Unicode compliance.',
    FALSE,
    36,
    '6.2 Language & Localization',
    'evidence_required',
    60.00
)
ON CONFLICT (id) DO NOTHING;

-- 9. Create Demo Proposal
INSERT INTO proposals (id, organization_id, tender_id, title, status, version, win_probability, compliance_score)
VALUES (
    'c0000000-0000-0000-0009-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0007-000000000001',
    'Technical & Financial Proposal: Hospital Information Management System (HIMS)',
    'in_review',
    1,
    88.50,
    94.00
)
ON CONFLICT (id) DO NOTHING;

-- 10. Create Demo Proposal Sections
INSERT INTO proposal_sections (id, organization_id, proposal_id, section_type, title, order_index, content_markdown, status, verified_claims_count, unverified_claims_count)
VALUES
(
    'd0000000-0000-0000-000a-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'c0000000-0000-0000-0009-000000000001',
    'executive_summary',
    '1. Executive Summary',
    1,
    'LankaTech Solutions (Pvt) Ltd is pleased to submit our comprehensive bid for the Ministry of Health Hospital Information Management System (HIMS) Upgrade. Backed by our proven experience deploying the National Healthcare EHR across 35 hospitals and our certified ISO/IEC 27001:2022 security infrastructure, LankaTech is uniquely positioned to deliver an ultra-reliable, HL7/FHIR compliant system with zero operational downtime.',
    'verified',
    3,
    0
),
(
    'd0000000-0000-0000-000a-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'c0000000-0000-0000-0009-000000000001',
    'company_profile',
    '2. Relevant Experience & Past Performance',
    2,
    'LankaTech Solutions has a distinguished track record in delivering high-assurance national software platforms in Sri Lanka. Our flagship healthcare project, the National Healthcare EHR & Patient Management Platform (valued at LKR 135M), successfully centralized 1.2M patient profiles with 99.98% uptime.',
    'verified',
    2,
    0
),
(
    'd0000000-0000-0000-000a-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'c0000000-0000-0000-0009-000000000001',
    'technical_architecture',
    '3. Technical Architecture & Interoperability',
    3,
    'The proposed solution leverages a modern containerized microservices architecture built on FastAPI and PostgreSQL with pgvector for intelligent clinical record matching. Fully compliant with HL7 FHIR Release 4 RESTful APIs, our solution ensures instant interoperability with laboratory and radiology systems.',
    'verified',
    2,
    0
)
ON CONFLICT (id) DO NOTHING;

-- 11. Create Demo Citations linking Proposal Claims to Verified Knowledge
INSERT INTO citations (id, organization_id, proposal_section_id, claim_text, source_title, source_page, source_section, similarity_score, is_verified)
VALUES
(
    'e0000000-0000-0000-000b-000000000001',
    'a0000000-0000-0000-0001-000000000001',
    'd0000000-0000-0000-000a-000000000001',
    'Proven experience deploying the National Healthcare EHR across 35 hospitals',
    'Project Case Study: National Healthcare EHR & Patient Management Platform',
    1,
    '1. Project Overview & Scope',
    0.9450,
    TRUE
),
(
    'e0000000-0000-0000-000b-000000000002',
    'a0000000-0000-0000-0001-000000000001',
    'd0000000-0000-0000-000a-000000000001',
    'Certified ISO/IEC 27001:2022 security infrastructure',
    'Certification Certificate: ISO/IEC 27001:2022 Bureau Veritas BVC-ISMS-LK-8942',
    1,
    'Certification Schedule & Scope',
    0.9820,
    TRUE
),
(
    'e0000000-0000-0000-000b-000000000003',
    'a0000000-0000-0000-0001-000000000001',
    'd0000000-0000-0000-000a-000000000002',
    'National Healthcare EHR & Patient Management Platform (valued at LKR 135M)',
    'Project Case Study: National Healthcare EHR & Patient Management Platform',
    4,
    'Financials and Outpatient Statistics',
    0.9610,
    TRUE
)
ON CONFLICT (id) DO NOTHING;
