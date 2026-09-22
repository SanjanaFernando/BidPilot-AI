"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  Plus,
  Clock,
  Database,
  Search,
  Building2,
  Trash2,
  Edit2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectsService, ProjectItem } from "@/lib/knowledge-service";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function ProjectsPage() {
  const { hasPermission, roleDef } = useUserPermissions();
  const canCreate = hasPermission("knowledge:create");
  const canEdit = hasPermission("knowledge:edit");
  const canDelete = hasPermission("knowledge:delete");

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    industry: "Healthcare",
    technologies: "",
    description: "",
    challenges: "",
    solution: "",
    outcomes: "",
    duration: "12 months",
    value: "LKR 50M",
    teamSize: 10,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await ProjectsService.getAll();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  const industries = Array.from(new Set(projects.map((p) => p.industry)));

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.technologies.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustry === "all" || p.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  function handleOpenAdd() {
    setIsEditing(false);
    setSelectedProject(null);
    setFormData({
      name: "",
      client: "",
      industry: "Healthcare",
      technologies: "Next.js, FastAPI, PostgreSQL",
      description: "",
      challenges: "",
      solution: "",
      outcomes: "",
      duration: "12 months",
      value: "LKR 80M",
      teamSize: 8,
    });
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(p: ProjectItem) {
    setIsEditing(true);
    setSelectedProject(p);
    setFormData({
      name: p.name,
      client: p.client,
      industry: p.industry,
      technologies: p.technologies.join(", "),
      description: p.description,
      challenges: p.challenges || "",
      solution: p.solution || "",
      outcomes: p.outcomes || "",
      duration: p.duration || "12 months",
      value: p.value || "LKR 50M",
      teamSize: p.teamSize || 6,
    });
    setIsAddModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const techArray = formData.technologies
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing && selectedProject) {
      await ProjectsService.update(selectedProject.id, {
        name: formData.name,
        client: formData.client,
        industry: formData.industry,
        technologies: techArray,
        description: formData.description,
        challenges: formData.challenges,
        solution: formData.solution,
        outcomes: formData.outcomes,
        duration: formData.duration,
        value: formData.value,
        teamSize: Number(formData.teamSize),
      });
    } else {
      await ProjectsService.create({
        name: formData.name,
        client: formData.client,
        industry: formData.industry,
        technologies: techArray,
        description: formData.description,
        challenges: formData.challenges,
        solution: formData.solution,
        outcomes: formData.outcomes,
        duration: formData.duration,
        value: formData.value,
        teamSize: Number(formData.teamSize),
      });
    }

    setIsAddModalOpen(false);
    await loadProjects();
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to remove this project from the knowledge repository?")) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      try {
        await ProjectsService.delete(id);
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
      await loadProjects();
    }
  }

  function handleViewDetails(p: ProjectItem) {
    setSelectedProject(p);
    setIsViewModalOpen(true);
  }

  return (
    <div className="space-y-6 pb-12">
      <Topbar
        title="Projects"
        breadcrumb={["Knowledge Base", "Projects"]}
        action={{ label: "Add Project", onClick: handleOpenAdd }}
      />

      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-[#7A1C2C]" />
          <div>
            <h2 className="text-base font-bold text-[#1E252D]">Project Knowledge Base</h2>
            <p className="text-xs text-[#64748B]">
              {projects.length} registered past projects · {industries.length} industry sectors ·
              Evidence-verified past performance
            </p>
          </div>
        </div>
        <Button
          disabled={!canCreate}
          onClick={() => canCreate && handleOpenAdd()}
          title={
            !canCreate
              ? `Adding projects requires 'knowledge:create' permission (Disabled for ${roleDef.displayName})`
              : "Add Project"
          }
          className={`h-8 gap-1.5 border-none px-3 text-xs font-bold text-[#1E252D] shadow-none ${
            canCreate
              ? "bg-[#DDA625] hover:bg-[#C8951E] cursor-pointer"
              : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 pointer-events-auto"
          }`}
        >
          <Plus size={14} /> Add Project
        </Button>
      </div>

      <main className="space-y-6 px-7">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Projects", value: projects.length, border: "border-l-[#7A1C2C]" },
            { label: "Industry Sectors", value: industries.length, border: "border-l-[#DDA625]" },
            {
              label: "Unique Technologies",
              value: [...new Set(projects.flatMap((p) => p.technologies))].length,
              border: "border-l-[#1E252D]",
            },
            {
              label: "Engineers Deployed",
              value: projects.reduce((a, p) => a + (p.teamSize || 0), 0),
              border: "border-l-[#15803D]",
            },
          ].map((s) => (
            <Card key={s.label} className={`border-l-4 border-[#E2E8F0] bg-white ${s.border}`}>
              <CardContent className="p-4">
                <div className="text-2xl font-extrabold text-[#1E252D] tabular-nums">{s.value}</div>
                <div className="mt-1 text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search by project name, tech, client..."
              className="h-9 pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedIndustry("all")}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedIndustry === "all"
                  ? "bg-[#7A1C2C] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              }`}
            >
              All Industries
            </button>
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(ind)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedIndustry === ind
                    ? "bg-[#7A1C2C] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Project Register Table */}
        <Card className="overflow-hidden border-[#E2E8F0] bg-white">
          <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
            <CardTitle className="text-sm font-bold text-[#1E252D]">
              Verified Past Projects Register ({filteredProjects.length})
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="gov-table w-full">
              <thead>
                <tr>
                  <th>Ref. ID</th>
                  <th>Project Name</th>
                  <th>Client / Org</th>
                  <th>Industry</th>
                  <th>Core Stack</th>
                  <th className="text-center">Team</th>
                  <th>Duration</th>
                  <th className="text-right">Contract Value</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-[#64748B]">
                      Loading projects repository...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-[#64748B]">
                      No projects matched your criteria. Click &quot;Add Project&quot; to register a
                      new case study.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td>
                        <span className="font-mono text-xs font-bold text-[#64748B]">{p.id}</span>
                      </td>
                      <td>
                        <div className="text-xs font-bold text-[#1E252D]">{p.name}</div>
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-[#64748B]">
                          {p.description}
                        </div>
                      </td>
                      <td className="text-xs font-medium text-[#1E252D]">{p.client}</td>
                      <td>
                        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
                          {p.industry}
                        </span>
                      </td>
                      <td>
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {p.technologies.slice(0, 2).map((tech) => (
                            <span
                              key={tech}
                              className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-[#1E252D]"
                            >
                              {tech}
                            </span>
                          ))}
                          {p.technologies.length > 2 && (
                            <span className="rounded px-1 py-0.5 text-[10px] font-medium text-[#64748B]">
                              +{p.technologies.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center text-xs font-bold text-[#1E252D] tabular-nums">
                        {p.teamSize || 8}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-[#64748B]" /> {p.duration || "12 months"}
                        </div>
                      </td>
                      <td className="text-right font-mono text-xs font-bold text-[#1E252D] tabular-nums">
                        {p.value || "LKR 50M"}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(p)}
                            title="View Case Study"
                            className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E252D] cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            disabled={!canEdit}
                            onClick={() => canEdit && handleOpenEdit(p)}
                            title={
                              !canEdit
                                ? `Editing projects requires 'knowledge:edit' permission (Disabled for ${roleDef.displayName})`
                                : "Edit Project"
                            }
                            className={`rounded p-1 transition-all ${
                              canEdit
                                ? "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#7A1C2C] cursor-pointer"
                                : "text-slate-300 cursor-not-allowed opacity-40 pointer-events-auto"
                            }`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            disabled={!canDelete}
                            onClick={() => canDelete && handleDelete(p.id)}
                            title={
                              !canDelete
                                ? `Deleting projects requires 'knowledge:delete' permission (Disabled for ${roleDef.displayName})`
                                : "Delete Project"
                            }
                            className={`rounded p-1 transition-all ${
                              canDelete
                                ? "text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626] cursor-pointer"
                                : "text-slate-300 cursor-not-allowed opacity-40 pointer-events-auto"
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Add / Edit Project Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1E252D]">
                {isEditing ? "Edit Case Study" : "Add Project to Knowledge Base"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#64748B] hover:text-[#1E252D]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Project Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. National Healthcare EHR Portal"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">
                    Client / Ministry *
                  </Label>
                  <Input
                    required
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="e.g. Ministry of Health"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Industry *</Label>
                  <Input
                    required
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Healthcare"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">
                    Value / Budget Range
                  </Label>
                  <Input
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g. LKR 120M"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Team Size</Label>
                  <Input
                    type="number"
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: Number(e.target.value) })}
                    placeholder="e.g. 14"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Technologies (comma-separated) *
                </Label>
                <Input
                  required
                  value={formData.technologies}
                  onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                  placeholder="e.g. Next.js, FastAPI, PostgreSQL, Docker, AWS"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">Project Overview *</Label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="High level overview of what was built and deployed..."
                  className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Challenges Faced</Label>
                  <textarea
                    rows={2}
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    placeholder="Key architectural or regulatory obstacles..."
                    className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">
                    Solution Architecture
                  </Label>
                  <textarea
                    rows={2}
                    value={formData.solution}
                    onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                    placeholder="How our technical solution resolved the challenge..."
                    className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Outcomes & Verifiable Metrics
                </Label>
                <textarea
                  rows={2}
                  value={formData.outcomes}
                  onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                  placeholder="e.g. 99.98% uptime, 68% latency reduction, 1.2M records..."
                  className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-8 bg-[#7A1C2C] text-xs text-white hover:bg-[#601422]"
                >
                  {isEditing ? "Save Changes" : "Register Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Study Detail Modal */}
      {isViewModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#7A1C2C]">
                  {selectedProject.id}
                </span>
                <h3 className="text-lg font-bold text-[#1E252D]">{selectedProject.name}</h3>
                <p className="text-xs text-[#64748B]">
                  Client: <strong className="text-[#1E252D]">{selectedProject.client}</strong> ·
                  Industry: <strong className="text-[#1E252D]">{selectedProject.industry}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-[#64748B] hover:text-[#1E252D]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                  Description
                </h4>
                <p className="mt-1 leading-relaxed text-[#475569]">{selectedProject.description}</p>
              </div>

              {selectedProject.challenges && (
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                    Challenges
                  </h4>
                  <p className="mt-1 leading-relaxed text-[#475569]">
                    {selectedProject.challenges}
                  </p>
                </div>
              )}

              {selectedProject.solution && (
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                    Implemented Solution
                  </h4>
                  <p className="mt-1 leading-relaxed text-[#475569]">{selectedProject.solution}</p>
                </div>
              )}

              {selectedProject.outcomes && (
                <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#15803D] uppercase">
                    <CheckCircle2 size={13} /> Outcomes & Verifiable Evidence
                  </h4>
                  <p className="mt-1 leading-relaxed font-medium text-[#166534]">
                    {selectedProject.outcomes}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                  Technology Stack
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedProject.technologies.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 text-xs font-semibold text-[#1E252D]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-[#E2E8F0] pt-4">
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
                className="h-8 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
