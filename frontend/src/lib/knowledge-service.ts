/**
 * BidPilot AI - Company Knowledge Base Service (Phase 3)
 * Provides asynchronous CRUD operations for Projects, Employees, Technologies, and Certifications.
 * Automatically interfaces with Supabase if configured, or falls back to persisted browser/demo storage.
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { mockProjects, mockEmployees, mockTechnologies, mockCertifications } from "./mock-data";

export interface ProjectItem {
  id: string;
  name: string;
  client: string;
  industry: string;
  description: string;
  technologies: string[];
  challenges?: string;
  solution?: string;
  outcomes?: string;
  duration?: string;
  value?: string;
  teamSize?: number;
  startDate?: string;
  endDate?: string;
}

export interface EmployeeItem {
  id: string;
  name: string;
  role: string;
  department: string;
  experience: string;
  experienceYears?: number;
  skills: string[];
  certifications: string[];
  bio?: string;
  status:
    | "Available"
    | "Allocated"
    | "Partially Available"
    | "available"
    | "allocated"
    | "partially_available";
  avatar?: string;
  email?: string;
}

export interface TechnologyItem {
  id: string;
  name: string;
  category: string;
  experienceLevel:
    "beginner" | "intermediate" | "advanced" | "expert" | "Expert" | "Advanced" | "Intermediate";
  description?: string;
  relatedProjects: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  holderType: "Company" | "Employee" | "company" | "employee";
  holderName?: string;
  issueDate?: string;
  expiryDate?: string;
  expiry: string;
  credentialId?: string;
  credentialUrl?: string;
  status: "Active" | "Expiring Soon" | "Expired";
}

// ─── Local Storage Helper ──────────────────────────────────────────────────
const STORAGE_KEYS = {
  PROJECTS: "bidpilot_kb_projects",
  EMPLOYEES: "bidpilot_kb_employees",
  TECHNOLOGIES: "bidpilot_kb_technologies",
  CERTIFICATIONS: "bidpilot_kb_certifications",
};

function getLocalData<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

// ─── Projects Service ───────────────────────────────────────────────────────
export const ProjectsService = {
  async getAll(): Promise<ProjectItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          name: d.name,
          client: d.client,
          industry: d.industry,
          description: d.description,
          technologies: d.technologies || [],
          challenges: d.challenges,
          solution: d.solution,
          outcomes: d.outcomes,
          duration: d.start_date && d.end_date ? `${d.start_date} to ${d.end_date}` : "12 months",
          value: d.budget_range || "LKR 120M",
          teamSize: d.team_size || 12,
        }));
      }
    }
    return getLocalData<ProjectItem>(
      STORAGE_KEYS.PROJECTS,
      mockProjects as unknown as ProjectItem[]
    );
  },

  async create(project: Omit<ProjectItem, "id">): Promise<ProjectItem> {
    const newProject: ProjectItem = {
      ...project,
      id: `PRJ-${Date.now().toString().slice(-4)}`,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("projects").insert([
          {
            name: newProject.name,
            client: newProject.client,
            industry: newProject.industry,
            description: newProject.description,
            technologies: newProject.technologies,
            challenges: newProject.challenges,
            solution: newProject.solution,
            outcomes: newProject.outcomes,
            budget_range: newProject.value,
            team_size: newProject.teamSize,
          },
        ]);
      } catch (e) {
        console.error("Supabase insert error:", e);
      }
    }

    const current = getLocalData<ProjectItem>(
      STORAGE_KEYS.PROJECTS,
      mockProjects as unknown as ProjectItem[]
    );
    const updated = [newProject, ...current];
    setLocalData(STORAGE_KEYS.PROJECTS, updated);
    return newProject;
  },

  async update(id: string, updates: Partial<ProjectItem>): Promise<ProjectItem> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("projects").update(updates).eq("id", id);
      } catch (e) {
        console.error("Supabase update error:", e);
      }
    }
    const current = getLocalData<ProjectItem>(
      STORAGE_KEYS.PROJECTS,
      mockProjects as unknown as ProjectItem[]
    );
    const index = current.findIndex((p) => p.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setLocalData(STORAGE_KEYS.PROJECTS, current);
      return current[index];
    }
    throw new Error(`Project ${id} not found`);
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("projects").delete().eq("id", id);
      } catch (e) {
        console.error("Supabase delete error:", e);
      }
    }
    const current = getLocalData<ProjectItem>(
      STORAGE_KEYS.PROJECTS,
      mockProjects as unknown as ProjectItem[]
    );
    const updated = current.filter((p) => p.id !== id);
    setLocalData(STORAGE_KEYS.PROJECTS, updated);
  },
};

// ─── Employees Service ──────────────────────────────────────────────────────
export const EmployeesService = {
  async getAll(): Promise<EmployeeItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          name: d.name,
          role: d.role,
          department: d.department || "Engineering",
          experience: `${d.experience_years} years`,
          experienceYears: Number(d.experience_years) || 0,
          skills: d.skills || [],
          certifications: d.certifications || [],
          bio: d.bio,
          status: d.availability_status === "available" ? "Available" : "Allocated",
          email: d.email,
        }));
      }
    }
    return getLocalData<EmployeeItem>(
      STORAGE_KEYS.EMPLOYEES,
      mockEmployees as unknown as EmployeeItem[]
    );
  },

  async create(employee: Omit<EmployeeItem, "id">): Promise<EmployeeItem> {
    const newEmp: EmployeeItem = {
      ...employee,
      id: `EMP-${Date.now().toString().slice(-4)}`,
    };
    const current = getLocalData<EmployeeItem>(
      STORAGE_KEYS.EMPLOYEES,
      mockEmployees as unknown as EmployeeItem[]
    );
    const updated = [newEmp, ...current];
    setLocalData(STORAGE_KEYS.EMPLOYEES, updated);
    return newEmp;
  },

  async update(id: string, updates: Partial<EmployeeItem>): Promise<EmployeeItem> {
    const current = getLocalData<EmployeeItem>(
      STORAGE_KEYS.EMPLOYEES,
      mockEmployees as unknown as EmployeeItem[]
    );
    const index = current.findIndex((e) => e.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setLocalData(STORAGE_KEYS.EMPLOYEES, current);
      return current[index];
    }
    throw new Error(`Employee ${id} not found`);
  },

  async delete(id: string): Promise<void> {
    const current = getLocalData<EmployeeItem>(
      STORAGE_KEYS.EMPLOYEES,
      mockEmployees as unknown as EmployeeItem[]
    );
    const updated = current.filter((e) => e.id !== id);
    setLocalData(STORAGE_KEYS.EMPLOYEES, updated);
  },
};

// ─── Technologies Service ───────────────────────────────────────────────────
export const TechnologiesService = {
  async getAll(): Promise<TechnologyItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("technologies")
        .select("*")
        .order("category", { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          experienceLevel: t.experience_level,
          description: t.description,
          relatedProjects: t.related_projects || [],
        }));
      }
    }
    return getLocalData<TechnologyItem>(
      STORAGE_KEYS.TECHNOLOGIES,
      mockTechnologies as unknown as TechnologyItem[]
    );
  },

  async create(tech: Omit<TechnologyItem, "id">): Promise<TechnologyItem> {
    const newTech: TechnologyItem = {
      ...tech,
      id: `TECH-${Date.now().toString().slice(-4)}`,
    };
    const current = getLocalData<TechnologyItem>(
      STORAGE_KEYS.TECHNOLOGIES,
      mockTechnologies as unknown as TechnologyItem[]
    );
    const updated = [newTech, ...current];
    setLocalData(STORAGE_KEYS.TECHNOLOGIES, updated);
    return newTech;
  },

  async update(id: string, updates: Partial<TechnologyItem>): Promise<TechnologyItem> {
    const current = getLocalData<TechnologyItem>(
      STORAGE_KEYS.TECHNOLOGIES,
      mockTechnologies as unknown as TechnologyItem[]
    );
    const index = current.findIndex((t) => t.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setLocalData(STORAGE_KEYS.TECHNOLOGIES, current);
      return current[index];
    }
    throw new Error(`Technology ${id} not found`);
  },

  async delete(id: string): Promise<void> {
    const current = getLocalData<TechnologyItem>(
      STORAGE_KEYS.TECHNOLOGIES,
      mockTechnologies as unknown as TechnologyItem[]
    );
    const updated = current.filter((t) => t.id !== id);
    setLocalData(STORAGE_KEYS.TECHNOLOGIES, updated);
  },
};

// ─── Certifications Service ─────────────────────────────────────────────────
export const CertificationsService = {
  async getAll(): Promise<CertificationItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .order("issue_date", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((c) => ({
          id: c.id,
          name: c.name,
          issuer: c.issuer,
          holderType: c.holder_type === "company" ? "Company" : "Employee",
          issueDate: c.issue_date,
          expiryDate: c.expiry_date,
          expiry: c.expiry_date || "2026-12-31",
          credentialId: c.credential_id,
          credentialUrl: c.credential_url,
          status: "Active",
        }));
      }
    }
    return getLocalData<CertificationItem>(
      STORAGE_KEYS.CERTIFICATIONS,
      mockCertifications as unknown as CertificationItem[]
    );
  },

  async create(cert: Omit<CertificationItem, "id">): Promise<CertificationItem> {
    const newCert: CertificationItem = {
      ...cert,
      id: `CRT-${Date.now().toString().slice(-4)}`,
    };
    const current = getLocalData<CertificationItem>(
      STORAGE_KEYS.CERTIFICATIONS,
      mockCertifications as unknown as CertificationItem[]
    );
    const updated = [newCert, ...current];
    setLocalData(STORAGE_KEYS.CERTIFICATIONS, updated);
    return newCert;
  },

  async update(id: string, updates: Partial<CertificationItem>): Promise<CertificationItem> {
    const current = getLocalData<CertificationItem>(
      STORAGE_KEYS.CERTIFICATIONS,
      mockCertifications as unknown as CertificationItem[]
    );
    const index = current.findIndex((c) => c.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setLocalData(STORAGE_KEYS.CERTIFICATIONS, current);
      return current[index];
    }
    throw new Error(`Certification ${id} not found`);
  },

  async delete(id: string): Promise<void> {
    const current = getLocalData<CertificationItem>(
      STORAGE_KEYS.CERTIFICATIONS,
      mockCertifications as unknown as CertificationItem[]
    );
    const updated = current.filter((c) => c.id !== id);
    setLocalData(STORAGE_KEYS.CERTIFICATIONS, updated);
  },
};
