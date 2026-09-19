/**
 * BidPilot AI — Analysis Service (Phase 6)
 *
 * Thin cache layer that:
 *  1. Reads persisted analysis from localStorage (keyed by tenderId)
 *  2. Falls back to a live API call when cache is missing/stale
 *  3. Writes back to localStorage after a successful API call
 *
 * Also fetches requirements from Supabase (if configured) as a complementary
 * data source to the AI service response.
 */

import {
  analyzeRFP,
  getTenderAnalysis,
  type RFPAnalysis,
  type ExtractedRequirement,
  type AnalyzeRFPResponse,
} from "./ai-service";
import { supabase, isSupabaseConfigured } from "./supabase";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_PREFIX = "bidpilot_analysis_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

interface CacheEntry {
  tenderId: string;
  analysis: RFPAnalysis;
  documentId?: string;
  savedAt: number;
}

function cacheKey(tenderId: string): string {
  return `${CACHE_PREFIX}${tenderId}`;
}

export function getCachedAnalysis(tenderId: string): RFPAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(tenderId));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(tenderId));
      return null;
    }
    return entry.analysis;
  } catch {
    return null;
  }
}

function setCachedAnalysis(tenderId: string, analysis: RFPAnalysis, documentId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = {
      tenderId,
      analysis,
      documentId,
      savedAt: Date.now(),
    };
    localStorage.setItem(cacheKey(tenderId), JSON.stringify(entry));
  } catch {
    /* ignore quota errors */
  }
}

export function clearCachedAnalysis(tenderId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(cacheKey(tenderId));
}

// ---------------------------------------------------------------------------
// Supabase requirements fetch
// ---------------------------------------------------------------------------

export async function fetchRequirementsFromDB(
  tenderId: string,
  organizationId: string,
): Promise<ExtractedRequirement[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from("requirements")
      .select("req_code, category, title, description, is_mandatory, source_page, source_section, status")
      .eq("tender_id", tenderId)
      .eq("organization_id", organizationId)
      .order("req_code");

    if (error || !data) return [];
    return data.map((r) => ({
      req_code: r.req_code,
      category: r.category,
      title: r.title,
      description: r.description,
      is_mandatory: r.is_mandatory,
      source_page: r.source_page ?? undefined,
      source_section: r.source_section ?? undefined,
      status: (r.status as ExtractedRequirement["status"]) || "unverified",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RunAnalysisOptions {
  tenderId: string;
  organizationId: string;
  documentId?: string;
  /** Save requirements to Supabase. Default: true */
  saveRequirements?: boolean;
  /** Skip the cache and force a fresh analysis. Default: false */
  forceRefresh?: boolean;
}

export type AnalysisStep =
  | "fetching_document"
  | "calling_gemini"
  | "parsing_output"
  | "saving_requirements"
  | "done"
  | "error";

export interface AnalysisProgress {
  step: AnalysisStep;
  label: string;
  percent: number;
}

/**
 * Run the full Phase 6 RFP analysis pipeline.
 *
 * Emits progress callbacks at each step and returns the final result.
 * Caches the analysis in localStorage.
 */
export async function runAnalysis(
  options: RunAnalysisOptions,
  onProgress?: (p: AnalysisProgress) => void,
): Promise<AnalyzeRFPResponse> {
  const emit = (step: AnalysisStep, label: string, percent: number) => {
    onProgress?.({ step, label, percent });
  };

  emit("fetching_document", "Resolving RFP document and extracting text…", 15);

  emit("calling_gemini", "Gemini 2.0 Flash analyzing RFP structure & requirements…", 35);

  const result = await analyzeRFP(
    options.tenderId,
    options.organizationId,
    options.documentId,
    options.saveRequirements ?? true,
  );

  emit("parsing_output", `Parsed ${result.analysis.requirements.length} requirements & scope…`, 75);

  emit(
    "saving_requirements",
    `Saved ${result.requirements_saved} requirements to tender database…`,
    90,
  );

  // Cache locally
  setCachedAnalysis(options.tenderId, result.analysis, options.documentId);

  emit("done", `Analysis complete — ${result.analysis.requirements.length} requirements ready.`, 100);

  return result;
}

/**
 * Load analysis state for a tender.
 * Tries: localStorage cache → API (agent_runs + requirements table).
 * Returns null if no analysis has been run yet.
 */
export async function loadAnalysisState(
  tenderId: string,
  organizationId: string,
): Promise<{ analysis: RFPAnalysis | null; requirements: ExtractedRequirement[] }> {
  // 1. Try localStorage first (fast)
  const cached = getCachedAnalysis(tenderId);

  // 2. Try to load live requirements from API / Supabase
  let requirements: ExtractedRequirement[] = [];

  try {
    const state = await getTenderAnalysis(tenderId, organizationId);
    if (state.has_analysis && state.requirements.length > 0) {
      requirements = state.requirements;
    }
  } catch {
    // AI service might be down — try Supabase directly
    requirements = await fetchRequirementsFromDB(tenderId, organizationId);
  }

  return {
    analysis: cached ?? null,
    requirements,
  };
}
