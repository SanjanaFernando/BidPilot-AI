/**
 * BidPilot AI - Tenders Service (Phase 1-3)
 * Provides asynchronous operations for tenders and RFP opportunities.
 * Connects with Supabase if configured, or falls back to persisted browser/seed storage.
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { mockTenders } from "./mock-data";

export interface TenderItem {
  id: string;
  name: string;
  client: string;
  deadline: string;
  status: "Analyzing" | "Draft" | "Review" | "Approved" | "Submitted";
  value: string;
  requirements: number;
  coverage: number;
  createdAt: string;
  description: string;
  industry: string;
  budgetCurrency?: string;
  budgetAmount?: number;
}

const STORAGE_KEY = "bidpilot_tenders";

function getLocalTenders(): TenderItem[] {
  if (typeof window === "undefined") return mockTenders as TenderItem[];
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTenders));
      return mockTenders as TenderItem[];
    }
    return JSON.parse(item);
  } catch {
    return mockTenders as TenderItem[];
  }
}

function setLocalTenders(data: TenderItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save tenders to localStorage:", err);
  }
}

export const TendersService = {
  async getAll(): Promise<TenderItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("tenders")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.reference_code || d.id,
          name: d.title,
          client: d.client_name,
          deadline: d.submission_deadline ? d.submission_deadline.split("T")[0] : "2026-10-15",
          status: (d.status === "in_progress"
            ? "Draft"
            : d.status === "under_review"
              ? "Review"
              : d.status === "ready_for_bidding"
                ? "Analyzing"
                : d.status === "won" || d.status === "submitted"
                  ? "Approved"
                  : "Draft") as TenderItem["status"],
          value: d.budget_amount
            ? `${d.budget_currency || "LKR"} ${(d.budget_amount / 1000000).toFixed(0)}M`
            : "$850,000",
          requirements: d.total_requirements_count || 10,
          coverage: d.total_requirements_count
            ? Math.round((d.covered_requirements_count / d.total_requirements_count) * 100)
            : 0,
          createdAt: d.created_at ? d.created_at.split("T")[0] : "2026-09-10",
          description: d.summary || "",
          industry: d.metadata?.industry || "Government / Healthcare",
        }));
      }
    }
    return getLocalTenders();
  },

  async getById(id: string): Promise<TenderItem | null> {
    const tenders = await this.getAll();
    return tenders.find((t) => t.id.toLowerCase() === id.toLowerCase()) || null;
  },

  async create(tender: Omit<TenderItem, "id" | "createdAt">): Promise<TenderItem> {
    const newTender: TenderItem = {
      ...tender,
      id: `TND-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("tenders").insert([
          {
            reference_code: newTender.id,
            organization_id: "a0000000-0000-0000-0001-000000000001",
            title: newTender.name,
            client_name: newTender.client,
            submission_deadline: newTender.deadline,
            summary: newTender.description,
            total_requirements_count: newTender.requirements,
            covered_requirements_count: Math.round(
              (newTender.requirements * newTender.coverage) / 100
            ),
            metadata: { industry: newTender.industry },
          },
        ]);
      } catch (e) {
        console.error("Supabase tender insert error:", e);
      }
    }

    const current = getLocalTenders();
    const updated = [newTender, ...current];
    setLocalTenders(updated);
    return newTender;
  },

  async update(id: string, updates: Partial<TenderItem>): Promise<TenderItem> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name) payload.title = updates.name;
        if (updates.client) payload.client_name = updates.client;
        if (updates.deadline) payload.submission_deadline = updates.deadline;
        if (updates.description) payload.summary = updates.description;
        if (updates.status) payload.status = updates.status.toLowerCase();

        await supabase.from("tenders").update(payload).eq("reference_code", id);
        await supabase.from("tenders").update(payload).eq("id", id);
      } catch (e) {
        console.error("Supabase update tender error:", e);
      }
    }

    const current = getLocalTenders();
    const index = current.findIndex((t) => t.id.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setLocalTenders(current);
      return current[index];
    }
    throw new Error(`Tender ${id} not found`);
  },

  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Delete associated requirements or cascade if needed
        await supabase.from("tenders").delete().eq("reference_code", id);
        await supabase.from("tenders").delete().eq("id", id);
      } catch (e) {
        console.error("Supabase delete tender error:", e);
      }
    }

    const current = getLocalTenders();
    const updated = current.filter((t) => t.id.toLowerCase() !== id.toLowerCase());
    setLocalTenders(updated);
  },
};
