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

const DEFAULT_ORG_ID = "a0000000-0000-0000-0001-000000000001";

// ─── Projects Service ───────────────────────────────────────────────────────
export const ProjectsService = {
  async getAll(): Promise<ProjectItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) {
          if (data.length > 0) {
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
      } catch (err) {
        console.error("Failed fetching projects from Supabase:", err);
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
        const { data } = await supabase
          .from("projects")
          .insert([
            {
              organization_id: DEFAULT_ORG_ID,
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
          ])
          .select();
        if (data && data.length > 0) {
          newProject.id = data[0].id;
        }
      } catch (e) {
        console.error("Supabase insert project error:", e);
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
        const payload: Record<string, unknown> = {};
        if (updates.name) payload.name = updates.name;
        if (updates.client) payload.client = updates.client;
        if (updates.industry) payload.industry = updates.industry;
        if (updates.description) payload.description = updates.description;
        if (updates.technologies) payload.technologies = updates.technologies;
        if (updates.challenges) payload.challenges = updates.challenges;
        if (updates.solution) payload.solution = updates.solution;
        if (updates.outcomes) payload.outcomes = updates.outcomes;
        if (updates.value) payload.budget_range = updates.value;
        if (updates.teamSize) payload.team_size = updates.teamSize;

        await supabase.from("projects").update(payload).eq("id", id);
      } catch (e) {
        console.error("Supabase update project error:", e);
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
        console.error("Supabase delete project error:", e);
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
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) {
          if (data.length > 0) {
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
      } catch (err) {
        console.error("Failed fetching employees from Supabase:", err);
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from("employees")
          .insert([
            {
              organization_id: DEFAULT_ORG_ID,
              name: newEmp.name,
              email: newEmp.email,
              role: newEmp.role,
              department: newEmp.department,
              experience_years: newEmp.experienceYears || 5,
              skills: newEmp.skills,
              certifications: newEmp.certifications,
              bio: newEmp.bio,
              availability_status: newEmp.status?.toLowerCase().includes("avail") ? "available" : "allocated",
            },
          ])
          .select();
        if (data && data.length > 0) {
          newEmp.id = data[0].id;
        }
      } catch (e) {
        console.error("Supabase insert employee error:", e);
      }
    }

    const current = getLocalData<EmployeeItem>(
      STORAGE_KEYS.EMPLOYEES,
      mockEmployees as unknown as EmployeeItem[]
    );
    const updated = [newEmp, ...current];
    setLocalData(STORAGE_KEYS.EMPLOYEES, updated);
    return newEmp;
  },

  async update(id: string, updates: Partial<EmployeeItem>): Promise<EmployeeItem> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name) payload.name = updates.name;
        if (updates.email) payload.email = updates.email;
        if (updates.role) payload.role = updates.role;
        if (updates.department) payload.department = updates.department;
        if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
        if (updates.skills) payload.skills = updates.skills;
        if (updates.certifications) payload.certifications = updates.certifications;
        if (updates.bio) payload.bio = updates.bio;
        if (updates.status) {
          payload.availability_status = updates.status.toLowerCase().includes("avail") ? "available" : "allocated";
        }

        await supabase.from("employees").update(payload).eq("id", id);
      } catch (e) {
        console.error("Supabase update employee error:", e);
      }
    }

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
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("employees").delete().eq("id", id);
      } catch (e) {
        console.error("Supabase delete employee error:", e);
      }
    }

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
      try {
        const { data, error } = await supabase
          .from("technologies")
          .select("*")
          .order("category", { ascending: true });
        if (!error && data) {
          if (data.length > 0) {
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
      } catch (err) {
        console.error("Failed fetching technologies from Supabase:", err);
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from("technologies")
          .insert([
            {
              organization_id: DEFAULT_ORG_ID,
              name: newTech.name,
              category: newTech.category,
              experience_level: newTech.experienceLevel?.toLowerCase() || "advanced",
              description: newTech.description,
              related_projects: newTech.relatedProjects || [],
            },
          ])
          .select();
        if (data && data.length > 0) {
          newTech.id = data[0].id;
        }
      } catch (e) {
        console.error("Supabase insert technology error:", e);
      }
    }

    const current = getLocalData<TechnologyItem>(
      STORAGE_KEYS.TECHNOLOGIES,
      mockTechnologies as unknown as TechnologyItem[]
    );
    const updated = [newTech, ...current];
    setLocalData(STORAGE_KEYS.TECHNOLOGIES, updated);
    return newTech;
  },

  async update(id: string, updates: Partial<TechnologyItem>): Promise<TechnologyItem> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name) payload.name = updates.name;
        if (updates.category) payload.category = updates.category;
        if (updates.experienceLevel) payload.experience_level = updates.experienceLevel.toLowerCase();
        if (updates.description) payload.description = updates.description;
        if (updates.relatedProjects) payload.related_projects = updates.relatedProjects;

        await supabase.from("technologies").update(payload).eq("id", id);
      } catch (e) {
        console.error("Supabase update technology error:", e);
      }
    }

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
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("technologies").delete().eq("id", id);
      } catch (e) {
        console.error("Supabase delete technology error:", e);
      }
    }

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
      try {
        const { data, error } = await supabase
          .from("certifications")
          .select("*")
          .order("issue_date", { ascending: false });
        if (!error && data) {
          if (data.length > 0) {
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
      } catch (err) {
        console.error("Failed fetching certifications from Supabase:", err);
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from("certifications")
          .insert([
            {
              organization_id: DEFAULT_ORG_ID,
              name: newCert.name,
              issuer: newCert.issuer,
              holder_type: newCert.holderType?.toLowerCase() || "company",
              issue_date: newCert.issueDate || null,
              expiry_date: newCert.expiryDate || null,
              credential_id: newCert.credentialId || null,
              credential_url: newCert.credentialUrl || null,
            },
          ])
          .select();
        if (data && data.length > 0) {
          newCert.id = data[0].id;
        }
      } catch (e) {
        console.error("Supabase insert certification error:", e);
      }
    }

    const current = getLocalData<CertificationItem>(
      STORAGE_KEYS.CERTIFICATIONS,
      mockCertifications as unknown as CertificationItem[]
    );
    const updated = [newCert, ...current];
    setLocalData(STORAGE_KEYS.CERTIFICATIONS, updated);
    return newCert;
  },

  async update(id: string, updates: Partial<CertificationItem>): Promise<CertificationItem> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name) payload.name = updates.name;
        if (updates.issuer) payload.issuer = updates.issuer;
        if (updates.holderType) payload.holder_type = updates.holderType.toLowerCase();
        if (updates.issueDate) payload.issue_date = updates.issueDate;
        if (updates.expiryDate) payload.expiry_date = updates.expiryDate;
        if (updates.credentialId) payload.credential_id = updates.credentialId;
        if (updates.credentialUrl) payload.credential_url = updates.credentialUrl;

        await supabase.from("certifications").update(payload).eq("id", id);
      } catch (e) {
        console.error("Supabase update certification error:", e);
      }
    }

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
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("certifications").delete().eq("id", id);
      } catch (e) {
        console.error("Supabase delete certification error:", e);
      }
    }

    const current = getLocalData<CertificationItem>(
      STORAGE_KEYS.CERTIFICATIONS,
      mockCertifications as unknown as CertificationItem[]
    );
    const updated = current.filter((c) => c.id !== id);
    setLocalData(STORAGE_KEYS.CERTIFICATIONS, updated);
  },
};
