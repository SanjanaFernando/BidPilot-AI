"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Award,
  Search,
  Trash2,
  Edit2,
  X,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CertificationsService, CertificationItem } from "@/lib/knowledge-service";

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificationItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    issuer: "",
    holderType: "Company" as CertificationItem["holderType"],
    holderName: "LankaTech Solutions (Pvt) Ltd",
    issueDate: "2024-01-01",
    expiryDate: "2027-01-01",
    expiry: "2027-01-01",
    credentialId: "",
    credentialUrl: "",
    status: "Active" as CertificationItem["status"],
  });

  useEffect(() => {
    loadCertifications();
  }, []);

  async function loadCertifications() {
    setLoading(true);
    try {
      const data = await CertificationsService.getAll();
      setCertifications(data);
    } catch (err) {
      console.error("Failed to load certifications:", err);
    } finally {
      setLoading(false);
    }
  }

  const active = certifications.filter((c) => c.status === "Active").length;
  const expiring = certifications.filter((c) => c.status === "Expiring Soon").length;
  const expired = certifications.filter((c) => c.status === "Expired").length;

  const filteredCertifications = certifications.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.holderName && c.holderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.credentialId && c.credentialId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  function handleOpenAdd() {
    setIsEditing(false);
    setSelectedCert(null);
    setFormData({
      name: "",
      issuer: "Bureau Veritas",
      holderType: "Company",
      holderName: "LankaTech Solutions (Pvt) Ltd",
      issueDate: "2024-01-15",
      expiryDate: "2027-01-14",
      expiry: "2027-01-14",
      credentialId: "BVC-ISMS-LK-8942",
      credentialUrl: "https://certificates.bureauveritas.com",
      status: "Active",
    });
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(cert: CertificationItem) {
    setIsEditing(true);
    setSelectedCert(cert);
    setFormData({
      name: cert.name,
      issuer: cert.issuer,
      holderType: cert.holderType,
      holderName: cert.holderName || "LankaTech Solutions (Pvt) Ltd",
      issueDate: cert.issueDate || "2024-01-15",
      expiryDate: cert.expiryDate || cert.expiry,
      expiry: cert.expiryDate || cert.expiry,
      credentialId: cert.credentialId || "",
      credentialUrl: cert.credentialUrl || "",
      status: cert.status,
    });
    setIsAddModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (isEditing && selectedCert) {
      await CertificationsService.update(selectedCert.id, {
        name: formData.name,
        issuer: formData.issuer,
        holderType: formData.holderType,
        holderName: formData.holderName,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        expiry: formData.expiryDate,
        credentialId: formData.credentialId,
        credentialUrl: formData.credentialUrl,
        status: formData.status,
      });
    } else {
      await CertificationsService.create({
        name: formData.name,
        issuer: formData.issuer,
        holderType: formData.holderType,
        holderName: formData.holderName,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        expiry: formData.expiryDate,
        credentialId: formData.credentialId,
        credentialUrl: formData.credentialUrl,
        status: formData.status,
      });
    }

    setIsAddModalOpen(false);
    await loadCertifications();
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to remove this certification from compliance records?")) {
      await CertificationsService.delete(id);
      await loadCertifications();
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <Topbar
        title="Certifications"
        breadcrumb={["Knowledge Base", "Certifications"]}
        action={{ label: "Register Cert.", onClick: handleOpenAdd }}
      />

      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-7 py-4">
        <div className="flex items-center gap-3">
          <Award size={20} className="text-[#7A1C2C]" />
          <div>
            <h2 className="text-base font-bold text-[#1E252D]">
              Corporate &amp; Staff Certifications
            </h2>
            <p className="text-xs text-[#64748B]">
              {certifications.length} verified credentials tracked for RFP mandatory compliance
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="h-8 gap-1.5 border-none bg-[#DDA625] px-3 text-xs font-bold text-[#1E252D] shadow-none hover:bg-[#C8951E]"
        >
          <Plus size={14} /> Register Certificate
        </Button>
      </div>

      <main className="space-y-6 px-7">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-[#E2E8F0] border-l-[#15803D] bg-white">
            <CardContent className="flex items-center gap-4 p-4">
              <CheckCircle2 size={24} className="text-[#15803D]" />
              <div>
                <div className="text-2xl font-extrabold text-[#15803D] tabular-nums">{active}</div>
                <div className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                  Active &amp; Compliant
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-[#E2E8F0] border-l-[#B45309] bg-white">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle size={24} className="text-[#B45309]" />
              <div>
                <div className="text-2xl font-extrabold text-[#B45309] tabular-nums">
                  {expiring}
                </div>
                <div className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                  Expiring Soon
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-[#E2E8F0] border-l-[#B91C1C] bg-white">
            <CardContent className="flex items-center gap-4 p-4">
              <XCircle size={24} className="text-[#B91C1C]" />
              <div>
                <div className="text-2xl font-extrabold text-[#B91C1C] tabular-nums">{expired}</div>
                <div className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                  Expired / Inactive
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search by certification name, issuer, credential ID..."
              className="h-9 pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["all", "Active", "Expiring Soon", "Expired"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  selectedStatus === st
                    ? "bg-[#7A1C2C] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
              >
                {st === "all" ? "All Statuses" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Certifications Table */}
        <Card className="overflow-hidden border-[#E2E8F0] bg-white">
          <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
            <CardTitle className="text-sm font-bold text-[#1E252D]">
              Verified Credentials Register ({filteredCertifications.length})
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="gov-table w-full">
              <thead>
                <tr>
                  <th>Ref. ID</th>
                  <th>Certification Name</th>
                  <th>Issuing Authority</th>
                  <th>Holder Type</th>
                  <th>Credential ID</th>
                  <th className="text-center">Expiry Date</th>
                  <th className="text-center">Audit Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#64748B]">
                      Loading certifications repository...
                    </td>
                  </tr>
                ) : filteredCertifications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#64748B]">
                      No certifications found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCertifications.map((cert) => (
                    <tr key={cert.id} className="hover:bg-[#F8FAFC]">
                      <td>
                        <span className="font-mono text-xs font-bold text-[#64748B]">
                          {cert.id}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="flex-shrink-0 text-[#7A1C2C]" />
                          <div>
                            <span className="text-xs font-bold text-[#1E252D]">{cert.name}</span>
                            {cert.credentialUrl && (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-[#7A1C2C] hover:underline"
                              >
                                verify <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-xs font-medium text-[#1E252D]">{cert.issuer}</td>
                      <td className="text-xs text-[#64748B]">
                        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#475569]">
                          {cert.holderType}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-[#64748B]">
                        {cert.credentialId || "N/A"}
                      </td>
                      <td className="text-center font-mono text-xs text-[#64748B]">
                        {cert.expiryDate || cert.expiry}
                      </td>
                      <td className="text-center">
                        <span
                          className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
                            cert.status === "Active"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : cert.status === "Expiring Soon"
                                ? "bg-[#FEF3C7] text-[#B45309]"
                                : "bg-[#FEE2E2] text-[#B91C1C]"
                          }`}
                        >
                          {cert.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(cert)}
                            title="Edit Certificate"
                            className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#7A1C2C]"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cert.id)}
                            title="Delete Certificate"
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

      {/* Add / Edit Certification Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1E252D]">
                {isEditing ? "Edit Certificate" : "Register Compliance Credential"}
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
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Certification Title *
                </Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ISO/IEC 27001:2022 ISMS"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">
                    Issuing Authority *
                  </Label>
                  <Input
                    required
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                    placeholder="e.g. Bureau Veritas, SGS"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Holder Type</Label>
                  <select
                    value={formData.holderType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        holderType: e.target.value as CertificationItem["holderType"],
                      })
                    }
                    className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                  >
                    <option value="Company">Company</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Issue Date</Label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#1E252D]">Expiry Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expiryDate: e.target.value,
                        expiry: e.target.value,
                      })
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
                        status: e.target.value as CertificationItem["status"],
                      })
                    }
                    className="mt-1 w-full rounded-md border border-[#E2E8F0] p-2 text-xs focus:border-[#7A1C2C] focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Credential / Certificate Number
                </Label>
                <Input
                  value={formData.credentialId}
                  onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                  placeholder="e.g. BVC-ISMS-LK-8942"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#1E252D]">
                  Verification URL / Registry Link
                </Label>
                <Input
                  type="url"
                  value={formData.credentialUrl}
                  onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
                  placeholder="https://certificates.issuer.com/verify/..."
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
                  {isEditing ? "Save Changes" : "Register Certificate"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
