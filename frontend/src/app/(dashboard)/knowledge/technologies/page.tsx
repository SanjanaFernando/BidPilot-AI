"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { Plus, Cpu, Search, Trash2, Edit2, X, CheckCircle2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TechnologiesService, TechnologyItem } from "@/lib/knowledge-service";

export default function TechnologiesPage() {
  const [technologies, setTechnologies] = useState<TechnologyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechnologyItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    category: "Backend & AI",
    experienceLevel: "expert" as TechnologyItem["experienceLevel"],
    description: "",
    relatedProjects: "",
  });

  useEffect(() => {
    loadTechnologies();
  }, []);

  async function loadTechnologies() {
    setLoading(true);
    try {
      const data = await TechnologiesService.getAll();
      setTechnologies(data);
    } catch (err) {
      console.error("Failed to load technologies:", err);
    } finally {
      setLoading(false);
    }
  }

  const categories = Array.from(new Set(technologies.map((t) => t.category)));

  const filteredTechnologies = technologies.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  function handleOpenAdd() {
    setIsEditing(false);
    setSelectedTech(null);
    setFormData({
      name: "",
      category: "Backend & AI",
      experienceLevel: "expert",
      description: "",
      relatedProjects: "National Healthcare Portal",
    });
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(t: TechnologyItem) {
    setIsEditing(true);
    setSelectedTech(t);
    setFormData({
      name: t.name,
      category: t.category,
      experienceLevel: t.experienceLevel,
      description: t.description || "",
      relatedProjects: t.relatedProjects ? t.relatedProjects.join(", ") : "",
    });
    setIsAddModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const projectsArray = formData.relatedProjects
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (isEditing && selectedTech) {
      await TechnologiesService.update(selectedTech.id, {
        name: formData.name,
        category: formData.category,
        experienceLevel: formData.experienceLevel,
        description: formData.description,
        relatedProjects: projectsArray,
      });
    } else {
      await TechnologiesService.create({
        name: formData.name,
        category: formData.category,
        experienceLevel: formData.experienceLevel,
        description: formData.description,
        relatedProjects: projectsArray,
      });
    }

    setIsAddModalOpen(false);
    await loadTechnologies();
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to remove this technology from capability records?")) {
      setTechnologies((prev) => prev.filter((t) => t.id !== id));
      try {
        await TechnologiesService.delete(id);
      } catch (err) {
        console.error("Failed to delete technology:", err);
      }
      await loadTechnologies();
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <Topbar
        title="Technologies"
        breadcrumb={["Knowledge Base", "Technologies"]}
        action={{ label: "Add Technology", onClick: handleOpenAdd }}
      />

      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div className="flex items-center gap-3">
          <Cpu size={20} className="text-[#7A1C2C]" />
          <div>
            <h2 className="text-base font-bold text-[#1E252D]">
              Technology &amp; Tool Stack Register
            </h2>
            <p className="text-xs text-[#64748B]">
              {technologies.length} registered core technologies · {categories.length} capability
              domains
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="h-8 gap-1.5 border-none bg-[#DDA625] px-3 text-xs font-bold text-[#1E252D] shadow-none hover:bg-[#C8951E]"
        >
          <Plus size={14} /> Add Technology
        </Button>
      </div>

      <main className="space-y-6 px-7">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Tech Stacks",
              value: technologies.length,
              border: "border-l-[#7A1C2C]",
            },
            {
              label: "Expert Stacks",
              value: technologies.filter(
                (t) =>
                  t.experienceLevel?.toLowerCase() === "expert" || t.experienceLevel === "Expert"
              ).length,
              border: "border-l-[#15803D]",
            },
            {
              label: "Domain Categories",
              value: categories.length,
              border: "border-l-[#DDA625]",
            },
            {
              label: "Linked References",
              value: technologies.reduce((a, t) => a + (t.relatedProjects?.length || 0), 0),
              border: "border-l-[#1E252D]",
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
              placeholder="Search by tech name, domain, use case..."
              className="h-9 pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === "all"
                  ? "bg-[#7A1C2C] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#7A1C2C] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden border-[#E2E8F0] bg-white">
          <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
            <CardTitle className="text-sm font-bold text-[#1E252D]">
              Verified Company Tech Capabilities ({filteredTechnologies.length})
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="gov-table w-full">
              <thead>
                <tr>
                  <th>Tech ID</th>
                  <th>Technology Name</th>
                  <th>Category</th>
                  <th>Description / RFP Use Case</th>
                  <th className="text-center">Proficiency Level</th>
                  <th className="text-center">Related Projects</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#64748B]">
                      Loading technology register...
                    </td>
                  </tr>
                ) : filteredTechnologies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#64748B]">
                      No technologies found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTechnologies.map((tech) => (
                    <tr key={tech.id} className="hover:bg-[#F8FAFC]">
                      <td>
                        <span className="font-mono text-xs font-bold text-[#64748B]">
                          {tech.id}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-bold text-[#1E252D]">{tech.name}</span>
                      </td>
                      <td>
                        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
                          {tech.category}
                        </span>
                      </td>
                      <td className="max-w-sm text-xs text-[#64748B]">{tech.description}</td>
                      <td className="text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                            String(tech.experienceLevel).toLowerCase() === "expert"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : String(tech.experienceLevel).toLowerCase() === "advanced" ||
                                  String(tech.experienceLevel).toLowerCase() === "proficient"
                                ? "bg-[#FDF3DA] text-[#92661A]"
                                : "bg-[#F1F5F9] text-[#64748B]"
                          }`}
                        >
                          {tech.experienceLevel}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-mono text-xs font-bold text-[#1E252D]">
                          {tech.relatedProjects?.length || 0}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tech)}
                            title="Edit Technology"
                            className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#7A1C2C]"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(tech.id)}
                            title="Delete Technology"
                            className="rounded p-1 text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
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

      {/* Add / Edit Technology Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1E252D]">
                {isEditing ? "Edit Technology" : "Register Technology Capability"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#64748B] hover:text-[#1E252D]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">Technology Name *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. FastAPI & Python"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Category *</Label>
                  <Input
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Backend & AI, Frontend, Cloud"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Proficiency Level</Label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experienceLevel: e.target.value as TechnologyItem["experienceLevel"],
                      })
                    }
                    className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                  >
                    <option value="expert">Expert</option>
                    <option value="advanced">Advanced</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="beginner">Beginner</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Description &amp; Architectural Role *
                </Label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="How our team utilizes this technology in high-assurance proposals..."
                  className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Related Past Projects (comma-separated)
                </Label>
                <Input
                  value={formData.relatedProjects}
                  onChange={(e) => setFormData({ ...formData, relatedProjects: e.target.value })}
                  placeholder="e.g. National Healthcare Portal, Ceylon Bank Gateway"
                  className="mt-1 text-xs"
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
                  {isEditing ? "Save Changes" : "Register Technology"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
