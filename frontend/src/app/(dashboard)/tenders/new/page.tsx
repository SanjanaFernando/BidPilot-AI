"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Brain,
  Database,
  Sparkles,
  FileSearch,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TendersService } from "@/lib/tenders-service";
import { uploadRFP, type UploadProgress, type UploadResult } from "@/lib/ai-service";
import { useUserPermissions } from "@/hooks/useUserPermissions";

// Demo org from seed data
const DEMO_ORG_ID = "a0000000-0000-0000-0001-000000000001";

// ---------------------------------------------------------------------------
// Pipeline step display config
// ---------------------------------------------------------------------------
const PIPELINE_STEPS = [
  { stage: "uploading", icon: Upload, label: "Uploading to secure storage", color: "#7A1C2C" },
  { stage: "extracting", icon: FileSearch, label: "Extracting text from PDF", color: "#1D4ED8" },
  { stage: "chunking", icon: FileText, label: "Chunking into semantic segments", color: "#7C3AED" },
  { stage: "embedding", icon: Brain, label: "Generating Gemini embeddings", color: "#0F766E" },
  { stage: "storing", icon: Database, label: "Storing vectors in pgvector", color: "#B45309" },
  { stage: "done", icon: Sparkles, label: "Ready for AI analysis", color: "#15803D" },
];

export default function NewTenderPage() {
  const router = useRouter();
  const { hasPermission, roleDef } = useUserPermissions();
  const canCreate = hasPermission("tenders:create");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdTenderId, setCreatedTenderId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    value: "",
    deadline: "",
    industry: "Healthcare",
    description: "",
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") setFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.client) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Register the tender in the database
      const tender = await TendersService.create({
        name: formData.name,
        client: formData.client,
        value: formData.value || "TBD",
        deadline: formData.deadline || "TBD",
        industry: formData.industry,
        description:
          formData.description || (file ? `RFP: ${file.name}` : "Tender registered manually."),
        status: file ? "Analyzing" : "Draft",
        requirements: 0,
        coverage: 0,
      });

      const tenderId = tender?.id || `tender-${Date.now()}`;
      setCreatedTenderId(tenderId);

      // 2. If a PDF was attached, run the full AI ingestion pipeline
      if (file) {
        setProgress({ stage: "uploading", message: "Starting pipeline…", percent: 5 });

        const result = await uploadRFP(file, tenderId, DEMO_ORG_ID, (p) => {
          setProgress(p);
        });

        setUploadResult(result);
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      setProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <div className="space-y-6 pb-12">
        <Topbar title="New Tender" breadcrumb={["Tenders", "New"]} />
        <main className="flex min-h-[60vh] items-center justify-center px-7">
          <Card className="w-full max-w-lg border-[#E2E8F0] bg-white p-8 shadow-sm">
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#BBF7D0] bg-[#DCFCE7]">
                <CheckCircle2 size={32} className="text-[#15803D]" />
              </div>
            </div>
            <h2 className="mb-1 text-center text-xl font-bold text-[#1E252D]">
              {uploadResult ? "RFP Ingested & Ready" : "Tender Registered"}
            </h2>
            <p className="mb-6 text-center text-xs leading-relaxed text-[#64748B]">
              {uploadResult
                ? `Processed ${uploadResult.page_count} pages into ${uploadResult.embedded_count} semantic chunks stored in pgvector — ready for requirement extraction and RAG search.`
                : "Your tender has been registered. You can attach an RFP PDF later."}
            </p>

            {uploadResult && (
              <div className="mb-6 grid grid-cols-3 gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#7A1C2C]">{uploadResult.page_count}</p>
                  <p className="text-[10px] text-[#64748B]">Pages extracted</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#7A1C2C]">{uploadResult.chunk_count}</p>
                  <p className="text-[10px] text-[#64748B]">Text chunks</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#7A1C2C]">{uploadResult.embedded_count}</p>
                  <p className="text-[10px] text-[#64748B]">Vectors stored</p>
                </div>
              </div>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/tenders">
                <Button className="h-9 w-full bg-[#7A1C2C] px-6 text-xs font-semibold text-white hover:bg-[#631724]">
                  View Tender Register
                </Button>
              </Link>
              {createdTenderId && (
                <Link href={`/tenders/${createdTenderId}`}>
                  <Button
                    variant="outline"
                    className="h-9 w-full border-[#E2E8F0] px-6 text-xs font-semibold text-[#1E252D]"
                  >
                    Open Tender →
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">
      <Topbar title="New Tender" breadcrumb={["Tenders", "New"]} />

      <main className="space-y-6 px-7">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/tenders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] transition-colors hover:text-[#7A1C2C]"
          >
            <ArrowLeft size={14} /> Back to Tender Register
          </Link>

          {/* Permission warning banner */}
          {!canCreate && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
              <AlertCircle size={18} className="shrink-0 text-amber-600" />
              <div>
                <strong>Read-Only Mode:</strong> Your role ({roleDef.displayName}) does not have permission to register new tenders (requires <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px] font-mono">tenders:create</code>). Actions are disabled.
              </div>
            </div>
          )}

          {/* Info banner */}
          <Card className="border-l-4 border-[#E2E8F0] border-l-[#7A1C2C] bg-[#F7F9FB] shadow-none">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-[#7A1C2C]" />
              <div className="text-xs leading-relaxed text-[#1E252D]">
                <strong className="font-semibold">AI Ingestion Pipeline:</strong> Upload your RFP
                PDF and BidPilot will automatically extract text, chunk it into semantic segments,
                generate <strong>Gemini embeddings</strong>, and store them in{" "}
                <strong>pgvector</strong> for semantic RAG search.
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File upload card */}
            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <CardTitle className="text-sm font-bold text-[#1E252D]">
                  RFP Document Upload
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Attach the procurement specification PDF — AI pipeline runs automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    !canCreate
                      ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60 pointer-events-auto"
                      : dragOver
                        ? "border-[#7A1C2C] bg-[#FDF3DA]/30 cursor-pointer"
                        : file
                          ? "border-[#15803D] bg-[#DCFCE7]/20 cursor-pointer"
                          : "border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer"
                  }`}
                  onDragOver={(e) => {
                    if (!canCreate) return;
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    if (!canCreate) return;
                    handleDrop(e);
                  }}
                  onClick={() => canCreate && document.getElementById("file-input")?.click()}
                  title={!canCreate ? `Uploading disabled for ${roleDef.displayName}` : undefined}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <>
                      <FileText size={36} className="mb-2 text-[#15803D]" />
                      <p className="text-sm font-bold text-[#1E252D]">{file.name}</p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={36} className="mb-2 text-[#64748B]" />
                      <p className="mb-1 text-sm font-bold text-[#1E252D]">
                        Drag &amp; Drop RFP PDF here
                      </p>
                      <p className="text-xs text-[#64748B]">
                        or click to browse local files (PDF up to 50 MB)
                      </p>
                    </>
                  )}
                </div>

                {/* Pipeline steps preview */}
                {file && !isSubmitting && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {PIPELINE_STEPS.slice(0, 5).map((step, i) => (
                      <div key={step.stage} className="flex items-center gap-1.5">
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${step.color}18`, color: step.color }}
                        >
                          <step.icon size={10} />
                        </div>
                        <span className="text-[10px] text-[#64748B]">{step.label}</span>
                        {i < 4 && <span className="text-[10px] text-[#CBD5E1]">→</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress indicator while running */}
                {isSubmitting && progress && (
                  <div className="mt-4 space-y-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1E252D]">{progress.message}</span>
                      <span className="text-[#64748B]">{progress.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-[#7A1C2C] transition-all duration-500"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PIPELINE_STEPS.map((step) => {
                        const stageOrder = PIPELINE_STEPS.map((s) => s.stage);
                        const currentIdx = stageOrder.indexOf(progress.stage);
                        const stepIdx = stageOrder.indexOf(step.stage);
                        const isDone = stepIdx < currentIdx;
                        const isActive = stepIdx === currentIdx;
                        return (
                          <div
                            key={step.stage}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                              isDone
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : isActive
                                  ? "bg-[#7A1C2C]/10 text-[#7A1C2C]"
                                  : "bg-[#F1F5F9] text-[#94A3B8]"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 size={9} />
                            ) : isActive ? (
                              <Loader2 size={9} className="animate-spin" />
                            ) : (
                              <step.icon size={9} />
                            )}
                            {step.label.split(" ")[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form fields card */}
            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <CardTitle className="text-sm font-bold text-[#1E252D]">
                  Tender Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <Label htmlFor="tender-name" className="text-xs font-semibold text-[#1E252D]">
                    Tender Name / Title *
                  </Label>
                  <Input
                    id="tender-name"
                    type="text"
                    placeholder="e.g. National Hospital Management System"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="client" className="text-xs font-semibold text-[#1E252D]">
                      Procuring Authority / Ministry *
                    </Label>
                    <Input
                      id="client"
                      type="text"
                      placeholder="e.g. Ministry of Health, Sri Lanka"
                      required
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="value" className="text-xs font-semibold text-[#1E252D]">
                      Estimated Budget / Value
                    </Label>
                    <Input
                      id="value"
                      type="text"
                      placeholder="e.g. LKR 150M"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline" className="text-xs font-semibold text-[#1E252D]">
                      Submission Deadline
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="industry" className="text-xs font-semibold text-[#1E252D]">
                      Industry Sector
                    </Label>
                    <select
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
                    >
                      <option value="Healthcare">Healthcare</option>
                      <option value="Government & Public Sector">
                        Government &amp; Public Sector
                      </option>
                      <option value="Banking & Financial Services">
                        Banking &amp; Financial Services
                      </option>
                      <option value="Education & Academic">Education &amp; Academic</option>
                      <option value="Smart City & IoT">Smart City &amp; IoT</option>
                      <option value="Logistics & Transport">Logistics &amp; Transport</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-[#1E252D]">
                    Project Scope &amp; Summary
                  </Label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Brief description of tender scope and objectives..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white p-3 text-xs text-[#1E252D] focus:ring-1 focus:ring-[#7A1C2C] focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Error:</strong> {error}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Link href="/tenders">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-[#E2E8F0] px-4 text-xs font-semibold text-[#1E252D] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                id="create-tender-btn"
                type="submit"
                disabled={isSubmitting || !canCreate}
                title={
                  !canCreate
                    ? `Creating tenders requires 'tenders:create' permission (Disabled for ${roleDef.displayName})`
                    : undefined
                }
                className={`h-9 gap-2 px-6 text-xs font-semibold ${
                  canCreate && !isSubmitting
                    ? "bg-[#7A1C2C] text-white hover:bg-[#631724] cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {file ? "Processing pipeline…" : "Registering…"}
                  </>
                ) : (
                  <>
                    {file ? <Brain size={14} /> : <Upload size={14} />}
                    {file ? "Register & Ingest RFP" : "Register Tender"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
