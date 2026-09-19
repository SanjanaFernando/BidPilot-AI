// Mock data for BidPilot AI — Phase 1 demo
// LankaTech Solutions (fictional) demo dataset

export const mockOrg = {
  name: "LankaTech Solutions",
  tagline: "Enterprise Software & AI Solutions",
  logo: "LT",
  plan: "Professional",
};

export const mockUser = {
  name: "Ashan Perera",
  email: "ashan@lankatech.lk",
  role: "Proposal Manager",
  avatar: "AP",
};

// ─── Tenders ─────────────────────────────────────────────────────────────────

export type TenderStatus = "Analyzing" | "Draft" | "Review" | "Approved" | "Submitted";

export interface Tender {
  id: string;
  name: string;
  client: string;
  deadline: string;
  status: TenderStatus;
  value: string;
  requirements: number;
  coverage: number;
  createdAt: string;
  description: string;
  industry: string;
}

export const mockTenders: Tender[] = [
  {
    id: "TND-001",
    name: "Hospital Information Management System",
    client: "Ministry of Health, Sri Lanka",
    deadline: "2026-10-15",
    status: "Draft",
    value: "$850,000",
    requirements: 87,
    coverage: 72,
    createdAt: "2026-09-10",
    description:
      "A comprehensive HIMS covering patient records, billing, pharmacy, lab and radiology for 12 government hospitals.",
    industry: "Healthcare",
  },
  {
    id: "TND-002",
    name: "National E-Procurement Portal",
    client: "Ministry of Finance",
    deadline: "2026-10-28",
    status: "Review",
    value: "$1,200,000",
    requirements: 124,
    coverage: 91,
    createdAt: "2026-09-05",
    description:
      "End-to-end e-procurement platform for government institutions with vendor management and audit trails.",
    industry: "Government",
  },
  {
    id: "TND-003",
    name: "Smart City IoT Platform",
    client: "Colombo Municipal Council",
    deadline: "2026-11-20",
    status: "Analyzing",
    value: "$2,400,000",
    requirements: 0,
    coverage: 0,
    createdAt: "2026-09-16",
    description:
      "IoT-driven smart city platform for traffic management, waste collection optimization and public safety.",
    industry: "Smart City",
  },
  {
    id: "TND-004",
    name: "Core Banking System Modernization",
    client: "Lanka Commercial Bank",
    deadline: "2026-09-30",
    status: "Approved",
    value: "$3,100,000",
    requirements: 201,
    coverage: 98,
    createdAt: "2026-08-20",
    description:
      "Migration from legacy COBOL core banking to a modern microservices architecture with API banking capabilities.",
    industry: "Banking",
  },
  {
    id: "TND-005",
    name: "Learning Management System — Universities",
    client: "University Grants Commission",
    deadline: "2026-12-01",
    status: "Draft",
    value: "$420,000",
    requirements: 63,
    coverage: 55,
    createdAt: "2026-09-12",
    description:
      "Unified LMS for 15 national universities supporting online learning, assessments and credential management.",
    industry: "Education",
  },
];

// ─── Requirements ────────────────────────────────────────────────────────────

export type ReqStatus = "Covered" | "Partial" | "Missing" | "Evidence Required";
export type ReqCategory =
  "Functional" | "Security" | "Integration" | "Performance" | "Compliance" | "Infrastructure";

export interface Requirement {
  id: string;
  category: ReqCategory;
  requirement: string;
  mandatory: boolean;
  sourcePage: number;
  status: ReqStatus;
}

export const mockRequirements: Requirement[] = [
  {
    id: "REQ-001",
    category: "Functional",
    requirement: "Patient registration and demographics management",
    mandatory: true,
    sourcePage: 12,
    status: "Covered",
  },
  {
    id: "REQ-002",
    category: "Functional",
    requirement: "Electronic Medical Records (EMR) with history",
    mandatory: true,
    sourcePage: 13,
    status: "Covered",
  },
  {
    id: "REQ-003",
    category: "Functional",
    requirement: "Pharmacy inventory and dispensing module",
    mandatory: true,
    sourcePage: 18,
    status: "Partial",
  },
  {
    id: "REQ-004",
    category: "Security",
    requirement: "Role-based access control (RBAC)",
    mandatory: true,
    sourcePage: 42,
    status: "Covered",
  },
  {
    id: "REQ-005",
    category: "Security",
    requirement: "HIPAA-compliant data encryption at rest and in transit",
    mandatory: true,
    sourcePage: 43,
    status: "Covered",
  },
  {
    id: "REQ-006",
    category: "Integration",
    requirement: "HL7 FHIR R4 API compatibility",
    mandatory: true,
    sourcePage: 55,
    status: "Evidence Required",
  },
  {
    id: "REQ-007",
    category: "Integration",
    requirement: "Integration with National Health ID system",
    mandatory: true,
    sourcePage: 57,
    status: "Missing",
  },
  {
    id: "REQ-008",
    category: "Performance",
    requirement: "System must handle 10,000 concurrent users",
    mandatory: true,
    sourcePage: 68,
    status: "Partial",
  },
  {
    id: "REQ-009",
    category: "Compliance",
    requirement: "ISO 27001 certification of vendor",
    mandatory: false,
    sourcePage: 78,
    status: "Covered",
  },
  {
    id: "REQ-010",
    category: "Infrastructure",
    requirement: "On-premise and cloud hybrid deployment option",
    mandatory: false,
    sourcePage: 82,
    status: "Covered",
  },
];

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  industry: string;
  client: string;
  duration: string;
  technologies: string[];
  description: string;
  outcomes: string;
  teamSize: number;
  value: string;
}

export const mockProjects: Project[] = [
  {
    id: "PRJ-001",
    name: "Healthcare Management Platform",
    industry: "Healthcare",
    client: "Apollo Hospitals Group (fictional)",
    duration: "18 months",
    technologies: ["React", "Node.js", "PostgreSQL", "AWS", "HL7 FHIR"],
    description:
      "Integrated hospital management system covering EMR, billing, pharmacy, lab and radiology for a 500-bed hospital.",
    outcomes:
      "40% reduction in patient waiting time, 99.8% system uptime, 50,000 daily transactions.",
    teamSize: 22,
    value: "$780,000",
  },
  {
    id: "PRJ-002",
    name: "Government E-Services Portal",
    industry: "Government",
    client: "Ceylon Digital Authority (fictional)",
    duration: "24 months",
    technologies: ["Next.js", "FastAPI", "PostgreSQL", "Redis", "Kubernetes"],
    description:
      "Citizen-facing e-government portal with 200+ digital services, digital signature and national ID integration.",
    outcomes:
      "2.5 million registered citizens, 95% service digitization rate, ISO 27001 certified.",
    teamSize: 35,
    value: "$1,100,000",
  },
  {
    id: "PRJ-003",
    name: "Banking Core Modernization",
    industry: "Banking & Finance",
    client: "Ceylon Trust Bank (fictional)",
    duration: "30 months",
    technologies: ["Java Spring Boot", "Oracle DB", "Kafka", "Docker", "REST APIs"],
    description:
      "Migration of legacy COBOL core banking system to microservices with API banking and mobile integration.",
    outcomes:
      "300% throughput improvement, 60% infrastructure cost reduction, zero downtime migration.",
    teamSize: 48,
    value: "$2,800,000",
  },
  {
    id: "PRJ-004",
    name: "University Learning Platform",
    industry: "Education",
    client: "Eastern University SL (fictional)",
    duration: "12 months",
    technologies: ["React", "Django", "PostgreSQL", "AWS S3", "WebRTC"],
    description:
      "Comprehensive LMS with video conferencing, AI-powered assessments, and digital credentials.",
    outcomes: "15,000 students onboarded, 98% uptime, 4.6/5 student satisfaction score.",
    teamSize: 14,
    value: "$290,000",
  },
  {
    id: "PRJ-005",
    name: "IoT Smart Warehouse Management",
    industry: "Logistics",
    client: "Lanka Logistics Hub (fictional)",
    duration: "10 months",
    technologies: ["Python", "MQTT", "InfluxDB", "Grafana", "React", "AWS IoT"],
    description:
      "Real-time warehouse management with IoT sensors for inventory tracking, temperature monitoring and automated alerts.",
    outcomes:
      "99.5% inventory accuracy, 35% operational cost reduction, 200+ IoT sensors integrated.",
    teamSize: 11,
    value: "$195,000",
  },
];

// ─── Employees ───────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  role: string;
  experience: number;
  skills: string[];
  certifications: string[];
  projects: string[];
  avatar: string;
}

export const mockEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "Kasun Rajapaksha",
    role: "Chief Technology Officer",
    experience: 15,
    skills: ["System Architecture", "Cloud", "AI/ML", "Leadership"],
    certifications: ["AWS Solutions Architect Professional", "PMP"],
    projects: ["PRJ-001", "PRJ-002", "PRJ-003"],
    avatar: "KR",
  },
  {
    id: "EMP-002",
    name: "Nimali Fernando",
    role: "Lead AI Engineer",
    experience: 8,
    skills: ["Python", "LLMs", "RAG", "LangChain", "MLOps"],
    certifications: ["TensorFlow Developer", "AWS ML Specialty"],
    projects: ["PRJ-001", "PRJ-005"],
    avatar: "NF",
  },
  {
    id: "EMP-003",
    name: "Sanjay Wickramasinghe",
    role: "Senior Full-Stack Developer",
    experience: 10,
    skills: ["React", "Next.js", "Node.js", "PostgreSQL", "TypeScript"],
    certifications: ["AWS Developer Associate"],
    projects: ["PRJ-002", "PRJ-004"],
    avatar: "SW",
  },
  {
    id: "EMP-004",
    name: "Priya Gunawardena",
    role: "DevOps Engineer",
    experience: 7,
    skills: ["Kubernetes", "Docker", "CI/CD", "Terraform", "AWS"],
    certifications: ["CKA", "AWS DevOps Professional"],
    projects: ["PRJ-002", "PRJ-003"],
    avatar: "PG",
  },
  {
    id: "EMP-005",
    name: "Dilshan Mendis",
    role: "Healthcare IT Specialist",
    experience: 12,
    skills: ["HL7 FHIR", "DICOM", "Epic Integration", "Healthcare Architecture"],
    certifications: ["HL7 FHIR Practitioner", "CHDA"],
    projects: ["PRJ-001"],
    avatar: "DM",
  },
  {
    id: "EMP-006",
    name: "Amalika Perera",
    role: "Business Analyst",
    experience: 9,
    skills: ["Requirements Analysis", "UML", "Agile", "Proposal Writing"],
    certifications: ["CBAP", "PMI-ACP"],
    projects: ["PRJ-001", "PRJ-002", "PRJ-004"],
    avatar: "AP",
  },
];

// ─── Technologies ────────────────────────────────────────────────────────────

export interface Technology {
  id: string;
  name: string;
  category: string;
  experienceLevel: "Expert" | "Proficient" | "Familiar";
  yearsUsed: number;
  projects: string[];
  description: string;
}

export const mockTechnologies: Technology[] = [
  {
    id: "TECH-001",
    name: "React / Next.js",
    category: "Frontend",
    experienceLevel: "Expert",
    yearsUsed: 7,
    projects: ["PRJ-002", "PRJ-004", "PRJ-005"],
    description: "Primary frontend framework for web applications",
  },
  {
    id: "TECH-002",
    name: "FastAPI / Django",
    category: "Backend",
    experienceLevel: "Expert",
    yearsUsed: 5,
    projects: ["PRJ-002", "PRJ-005"],
    description: "Python web frameworks for REST APIs and microservices",
  },
  {
    id: "TECH-003",
    name: "PostgreSQL",
    category: "Database",
    experienceLevel: "Expert",
    yearsUsed: 10,
    projects: ["PRJ-001", "PRJ-002", "PRJ-004"],
    description: "Primary relational database with PostGIS and pgvector extensions",
  },
  {
    id: "TECH-004",
    name: "AWS (EC2, S3, RDS, Lambda)",
    category: "Cloud",
    experienceLevel: "Expert",
    yearsUsed: 8,
    projects: ["PRJ-001", "PRJ-002", "PRJ-005"],
    description: "Primary cloud platform for deployment and managed services",
  },
  {
    id: "TECH-005",
    name: "Kubernetes / Docker",
    category: "DevOps",
    experienceLevel: "Proficient",
    yearsUsed: 5,
    projects: ["PRJ-002", "PRJ-003"],
    description: "Container orchestration for production deployments",
  },
  {
    id: "TECH-006",
    name: "HL7 FHIR R4",
    category: "Healthcare",
    experienceLevel: "Proficient",
    yearsUsed: 4,
    projects: ["PRJ-001"],
    description: "Healthcare data interchange standard",
  },
  {
    id: "TECH-007",
    name: "Apache Kafka",
    category: "Messaging",
    experienceLevel: "Proficient",
    yearsUsed: 4,
    projects: ["PRJ-003"],
    description: "Event streaming for real-time data pipelines",
  },
  {
    id: "TECH-008",
    name: "LangChain / LangGraph",
    category: "AI/ML",
    experienceLevel: "Proficient",
    yearsUsed: 2,
    projects: ["PRJ-005"],
    description: "AI agent orchestration and RAG pipelines",
  },
  {
    id: "TECH-009",
    name: "Redis",
    category: "Cache",
    experienceLevel: "Expert",
    yearsUsed: 6,
    projects: ["PRJ-002", "PRJ-003"],
    description: "In-memory cache and session management",
  },
  {
    id: "TECH-010",
    name: "Terraform",
    category: "DevOps",
    experienceLevel: "Familiar",
    yearsUsed: 3,
    projects: ["PRJ-003"],
    description: "Infrastructure as Code for multi-cloud provisioning",
  },
];

// ─── Certifications ──────────────────────────────────────────────────────────

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  holder: string;
  issueDate: string;
  expiryDate: string;
  status: "Active" | "Expiring Soon" | "Expired";
  evidenceDoc: string;
}

export const mockCertifications: Certification[] = [
  {
    id: "CERT-001",
    name: "ISO 27001:2022 Information Security",
    issuer: "Bureau Veritas",
    holder: "LankaTech Solutions (Organization)",
    issueDate: "2024-03-15",
    expiryDate: "2027-03-14",
    status: "Active",
    evidenceDoc: "iso27001_certificate.pdf",
  },
  {
    id: "CERT-002",
    name: "AWS Solutions Architect Professional",
    issuer: "Amazon Web Services",
    holder: "Kasun Rajapaksha",
    issueDate: "2024-06-10",
    expiryDate: "2026-06-10",
    status: "Expiring Soon",
    evidenceDoc: "aws_sap_cert.pdf",
  },
  {
    id: "CERT-003",
    name: "Certified Kubernetes Administrator (CKA)",
    issuer: "CNCF",
    holder: "Priya Gunawardena",
    issueDate: "2025-01-20",
    expiryDate: "2027-01-19",
    status: "Active",
    evidenceDoc: "cka_certificate.pdf",
  },
  {
    id: "CERT-004",
    name: "HL7 FHIR Practitioner",
    issuer: "HL7 International",
    holder: "Dilshan Mendis",
    issueDate: "2023-09-05",
    expiryDate: "2025-09-04",
    status: "Expired",
    evidenceDoc: "hl7_fhir_cert.pdf",
  },
  {
    id: "CERT-005",
    name: "CMMI Level 3 Appraisal",
    issuer: "CMMI Institute",
    holder: "LankaTech Solutions (Organization)",
    issueDate: "2024-11-01",
    expiryDate: "2027-10-31",
    status: "Active",
    evidenceDoc: "cmmi3_certificate.pdf",
  },
  {
    id: "CERT-006",
    name: "TensorFlow Developer Certificate",
    issuer: "Google",
    holder: "Nimali Fernando",
    issueDate: "2025-04-18",
    expiryDate: "2028-04-17",
    status: "Active",
    evidenceDoc: "tf_dev_cert.pdf",
  },
];

// ─── Proposal Sections ───────────────────────────────────────────────────────

export interface ProposalSection {
  id: string;
  title: string;
  status: "Generated" | "Reviewed" | "Approved" | "Pending";
  wordCount: number;
  citations: number;
  content: string;
}

export const mockProposalSections: ProposalSection[] = [
  {
    id: "SEC-001",
    title: "Executive Summary",
    status: "Reviewed",
    wordCount: 420,
    citations: 3,
    content:
      "LankaTech Solutions proposes a comprehensive Hospital Information Management System (HIMS) that leverages our 15+ years of healthcare IT experience and proven delivery methodology to transform the Ministry of Health's digital infrastructure...",
  },
  {
    id: "SEC-002",
    title: "Company Profile",
    status: "Approved",
    wordCount: 380,
    citations: 5,
    content:
      "Founded in 2009, LankaTech Solutions is a leading Sri Lankan software company specializing in enterprise systems, government digital transformation, and AI-powered solutions. Our team of 120+ professionals has delivered...",
  },
  {
    id: "SEC-003",
    title: "Understanding of Requirements",
    status: "Generated",
    wordCount: 890,
    citations: 12,
    content:
      "Based on our analysis of the RFP, we have identified 87 requirements across functional, technical, security, integration and compliance categories. Our HIMS solution directly addresses all mandatory requirements...",
  },
  {
    id: "SEC-004",
    title: "Proposed Solution",
    status: "Generated",
    wordCount: 1240,
    citations: 18,
    content:
      "Our proposed HIMS is built on a modern microservices architecture using cloud-native technologies. The system comprises six core modules: Patient Management, Clinical Records, Pharmacy & Inventory, Laboratory Management, Radiology (PACS), and Billing & Finance...",
  },
  {
    id: "SEC-005",
    title: "Technical Architecture",
    status: "Pending",
    wordCount: 0,
    citations: 0,
    content: "",
  },
  {
    id: "SEC-006",
    title: "Implementation Methodology",
    status: "Pending",
    wordCount: 0,
    citations: 0,
    content: "",
  },
  {
    id: "SEC-007",
    title: "Security & Compliance",
    status: "Generated",
    wordCount: 560,
    citations: 8,
    content:
      "Security is at the foundation of our HIMS design. The system implements defence-in-depth with role-based access control (RBAC), end-to-end encryption (AES-256 at rest, TLS 1.3 in transit), comprehensive audit logging, and HIPAA-compliant data handling...",
  },
  {
    id: "SEC-008",
    title: "Team & Expertise",
    status: "Generated",
    wordCount: 430,
    citations: 6,
    content:
      "The proposed project team combines deep healthcare IT expertise with modern software engineering capabilities. The team will be led by our CTO with 15 years of enterprise experience, supported by dedicated specialists...",
  },
  {
    id: "SEC-009",
    title: "Project Timeline",
    status: "Pending",
    wordCount: 0,
    citations: 0,
    content: "",
  },
  {
    id: "SEC-010",
    title: "Relevant Experience",
    status: "Approved",
    wordCount: 670,
    citations: 9,
    content:
      "Our Healthcare Management Platform project for Apollo Hospitals Group demonstrates our ability to deliver complex HIMS solutions at scale. This 18-month engagement delivered an integrated system serving 500 beds with 99.8% uptime...",
  },
  {
    id: "SEC-011",
    title: "Support & Maintenance",
    status: "Generated",
    wordCount: 310,
    citations: 2,
    content:
      "LankaTech Solutions offers comprehensive 24/7 support services backed by defined SLAs. Our dedicated support team provides Tier 1-3 technical assistance, proactive monitoring, and scheduled maintenance windows...",
  },
  {
    id: "SEC-012",
    title: "Appendices",
    status: "Pending",
    wordCount: 0,
    citations: 0,
    content: "",
  },
];

// ─── Stats ───────────────────────────────────────────────────────────────────

export const mockDashboardStats = {
  activeTenders: 5,
  proposalsGenerated: 12,
  knowledgeItems: 41,
  avgComplianceRate: 78,
  tendersTrend: "+2 this month",
  proposalsTrend: "+3 this week",
  knowledgeTrend: "+5 this month",
  complianceTrend: "+8% vs last month",
};
