"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  Plus,
  Users,
  Search,
  Trash2,
  Edit2,
  Eye,
  X,
  Award,
  CheckCircle2,
  Mail,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmployeesService, EmployeeItem } from "@/lib/knowledge-service";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    department: "Enterprise Solutions",
    experienceYears: 5,
    skills: "",
    certifications: "",
    bio: "",
    status: "Available" as EmployeeItem["status"],
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await EmployeesService.getAll();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  }

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.certifications &&
        e.certifications.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesDept = selectedDepartment === "all" || e.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  function handleOpenAdd() {
    setIsEditing(false);
    setSelectedEmployee(null);
    setFormData({
      name: "",
      email: "",
      role: "Senior Software Architect",
      department: "Enterprise Solutions",
      experienceYears: 6,
      skills: "FastAPI, PostgreSQL, AWS, React",
      certifications: "AWS Solutions Architect",
      bio: "",
      status: "Available",
    });
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(emp: EmployeeItem) {
    setIsEditing(true);
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email || "",
      role: emp.role,
      department: emp.department || "Enterprise Solutions",
      experienceYears: emp.experienceYears || parseInt(emp.experience) || 5,
      skills: emp.skills.join(", "),
      certifications: emp.certifications.join(", "),
      bio: emp.bio || "",
      status: emp.status,
    });
    setIsAddModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const skillsArray = formData.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const certsArray = formData.certifications
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (isEditing && selectedEmployee) {
      await EmployeesService.update(selectedEmployee.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        experience: `${formData.experienceYears} years`,
        experienceYears: Number(formData.experienceYears),
        skills: skillsArray,
        certifications: certsArray,
        bio: formData.bio,
        status: formData.status,
      });
    } else {
      await EmployeesService.create({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        experience: `${formData.experienceYears} years`,
        experienceYears: Number(formData.experienceYears),
        skills: skillsArray,
        certifications: certsArray,
        bio: formData.bio,
        status: formData.status,
        avatar: formData.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      });
    }

    setIsAddModalOpen(false);
    await loadEmployees();
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to remove this employee from staff records?")) {
      await EmployeesService.delete(id);
      await loadEmployees();
    }
  }

  function handleViewDetails(emp: EmployeeItem) {
    setSelectedEmployee(emp);
    setIsViewModalOpen(true);
  }

  return (
    <div className="space-y-6 pb-12">
      <Topbar
        title="Employees"
        breadcrumb={["Knowledge Base", "Employees"]}
        action={{ label: "Add Employee", onClick: handleOpenAdd }}
      />

      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-[#7A1C2C]" />
          <div>
            <h2 className="text-base font-bold text-[#1E252D]">Staff &amp; Key Personnel</h2>
            <p className="text-xs text-[#64748B]">
              {employees.length} personnel profiles · Verified qualifications for RFP team bidding
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="h-8 gap-1.5 border-none bg-[#DDA625] px-3 text-xs font-bold text-[#1E252D] shadow-none hover:bg-[#C8951E]"
        >
          <Plus size={14} /> Add Employee
        </Button>
      </div>

      <main className="space-y-6 px-7">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Staff", value: employees.length, border: "border-l-[#7A1C2C]" },
            {
              label: "Available for Bidding",
              value: employees.filter((e) => e.status === "Available" || e.status === "available")
                .length,
              border: "border-l-[#15803D]",
            },
            {
              label: "Total Certifications",
              value: employees.reduce((a, e) => a + (e.certifications?.length || 0), 0),
              border: "border-l-[#DDA625]",
            },
            {
              label: "Key Departments",
              value: departments.length,
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
              placeholder="Search by name, skill, role, certification..."
              className="h-9 pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedDepartment("all")}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedDepartment === "all"
                  ? "bg-[#7A1C2C] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              }`}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedDepartment === dept
                    ? "bg-[#7A1C2C] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-xs text-[#64748B]">
              Loading personnel repository...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[#64748B]">
              No employee profiles found matching your search.
            </div>
          ) : (
            filteredEmployees.map((e) => (
              <Card
                key={e.id}
                className="overflow-hidden border-[#E2E8F0] bg-white transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-[#E2E8F0] bg-[#7A1C2C] text-xs font-bold text-white">
                        <AvatarFallback className="bg-[#7A1C2C] text-white">
                          {e.avatar ||
                            e.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-sm font-bold text-[#1E252D]">{e.name}</h3>
                        <p className="text-xs text-[#64748B]">{e.role}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        e.status === "Available" || e.status === "available"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF9C3] text-[#A16207]"
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-[#64748B]">
                    <span>Dept: {e.department}</span>
                    <span className="font-semibold text-[#1E252D]">
                      {e.experienceYears ? `${e.experienceYears} yrs exp` : e.experience}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="mt-3">
                    <div className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
                      Skills
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.skills.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#334155]"
                        >
                          {s}
                        </span>
                      ))}
                      {e.skills.length > 3 && (
                        <span className="text-[10px] text-[#94A3B8]">+{e.skills.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Certifications */}
                  {e.certifications && e.certifications.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#DDA625] uppercase">
                        <Award size={12} /> Key Certifications
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs text-[#475569]">
                        {e.certifications[0]}
                        {e.certifications.length > 1 && ` (+${e.certifications.length - 1} more)`}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3">
                    <button
                      onClick={() => handleViewDetails(e)}
                      className="text-xs font-semibold text-[#7A1C2C] hover:underline"
                    >
                      View Profile
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(e)}
                        className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#7A1C2C]"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="rounded p-1 text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Add / Edit Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1E252D]">
                {isEditing ? "Edit Personnel Profile" : "Add Employee to Repository"}
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
                <Label className="text-xs font-semibold text-[#1E252D]">Full Name *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Kavindi Silva"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kavindi.silva@lankatech.lk"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Role / Title *</Label>
                  <Input
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Principal Cloud Architect"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Enterprise Solutions"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Experience (Yrs)</Label>
                  <Input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceYears: Number(e.target.value) })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Status</Label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as EmployeeItem["status"],
                      })
                    }
                    className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Partially Available">Partially Available</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Skills (comma-separated) *
                </Label>
                <Input
                  required
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="e.g. AWS, Next.js, HL7/FHIR, Security Auditing"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Certifications (comma-separated)
                </Label>
                <Input
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="e.g. AWS Solutions Architect Pro, TOGAF 9.2, CISA"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">Professional Bio</Label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief summary of domain expertise and leadership for proposal CVs..."
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
                  {isEditing ? "Save Changes" : "Add Personnel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Detail Modal */}
      {isViewModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-[#E2E8F0] bg-[#7A1C2C] text-sm font-bold text-white">
                  <AvatarFallback className="bg-[#7A1C2C] text-white">
                    {selectedEmployee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-bold text-[#1E252D]">{selectedEmployee.name}</h3>
                  <p className="text-xs text-[#64748B]">
                    {selectedEmployee.role} · {selectedEmployee.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-[#64748B] hover:text-[#1E252D]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {selectedEmployee.email && (
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Mail size={14} /> {selectedEmployee.email}
                </div>
              )}

              {selectedEmployee.bio && (
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                    Biography
                  </h4>
                  <p className="mt-1 leading-relaxed text-[#475569]">{selectedEmployee.bio}</p>
                </div>
              )}

              <div>
                <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                  Technical Skills
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedEmployee.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 text-xs font-semibold text-[#1E252D]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {selectedEmployee.certifications && selectedEmployee.certifications.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1E252D] uppercase">
                    Certifications &amp; Credentials
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {selectedEmployee.certifications.map((c) => (
                      <li key={c} className="flex items-center gap-1.5 font-medium text-[#15803D]">
                        <CheckCircle2 size={13} /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
