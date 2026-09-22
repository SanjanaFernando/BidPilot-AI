"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  ROLES,
  ROLE_LIST,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  RoleName,
  PermissionCode,
  getRoleDefinition,
  getRoleBadgeStyle,
  getInitials,
} from "@/lib/rbac";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { mockTeamMembers, MockTeamMember } from "@/lib/mock-data";
import {
  Shield,
  Users,
  Lock,
  Unlock,
  UserPlus,
  KeyRound,
  Check,
  X,
  AlertCircle,
  FileText,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RbacGuard } from "@/components/rbac/RbacGuard";

interface SectionLockItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  tenderCode: string;
  lockedBy: string;
  lockedByRole: RoleName;
  lockedAt: string;
  expiresInMinutes: number;
}

const INITIAL_LOCKS: SectionLockItem[] = [
  {
    id: "lck-1",
    sectionId: "SEC-004",
    sectionTitle: "Technical Architecture & Security",
    tenderCode: "TND-2024-001",
    lockedBy: "Kusal Mendis",
    lockedByRole: "solution_architect",
    lockedAt: "12 mins ago",
    expiresInMinutes: 18,
  },
  {
    id: "lck-2",
    sectionId: "SEC-003",
    sectionTitle: "Understanding of Requirements",
    tenderCode: "TND-2024-001",
    lockedBy: "Dilshan Gunaratne",
    lockedByRole: "bid_manager",
    lockedAt: "5 mins ago",
    expiresInMinutes: 25,
  },
  {
    id: "lck-3",
    sectionId: "SEC-008",
    sectionTitle: "Clinical Workflow & SME Inputs",
    tenderCode: "TND-2024-002",
    lockedBy: "Nuwan Pradeep",
    lockedByRole: "domain_sme",
    lockedAt: "22 mins ago",
    expiresInMinutes: 8,
  },
];

const PERMISSION_GROUPS: { name: string; description: string; permissions: PermissionCode[] }[] = [
  {
    name: "Tender & RFP Lifecycle",
    description: "Creating, editing, viewing, and assigning collaborators to tenders",
    permissions: [
      "tenders:view",
      "tenders:create",
      "tenders:edit",
      "tenders:delete",
      "tenders:assign_collaborators",
    ],
  },
  {
    name: "AI Multi-Agent Pipeline",
    description: "Triggering LangGraph autonomous agents and viewing synthesis outputs",
    permissions: ["agents:run", "agents:view_results"],
  },
  {
    name: "Proposal Authoring & Governance",
    description: "Drafting sections, human review, section sign-off, and executive authorization",
    permissions: [
      "proposals:view",
      "proposals:create",
      "proposals:edit_own",
      "proposals:edit_any",
      "proposals:approve_section",
      "proposals:sign_off",
      "proposals:export",
    ],
  },
  {
    name: "Requirements & Compliance Matrix",
    description: "RFP requirement extraction, contradiction audits, and certification proofs",
    permissions: [
      "requirements:view",
      "requirements:edit",
      "compliance:view",
      "compliance:verify",
      "compliance:sign_off",
    ],
  },
  {
    name: "Enterprise Knowledge Base (RAG)",
    description: "Managing past projects, personnel CVs, and pgvector embeddings",
    permissions: [
      "knowledge:view",
      "knowledge:create",
      "knowledge:edit",
      "knowledge:delete",
      "knowledge:ingest",
    ],
  },
  {
    name: "Security, Team & Audit",
    description: "Provisioning team members, security logs, and tenant settings",
    permissions: ["team:view", "team:manage", "audit:view", "settings:view", "settings:edit"],
  },
];

export default function TeamRbacPage() {
  const { role: activeUserRole, permissions: activeUserPermissions, switchDemoRole } = useUserPermissions();
  const [members, setMembers] = useState<MockTeamMember[]>(mockTeamMembers);
  const [locks, setLocks] = useState<SectionLockItem[]>(INITIAL_LOCKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("domain_sme");
  const [inviteDept, setInviteDept] = useState("Engineering");

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  function handleRoleChange(memberId: string, newRole: RoleName) {
    const def = getRoleDefinition(newRole);
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              role_name: newRole,
              role_display_name: def.displayName,
              role_color: def.color,
              role_text_color: def.textColor,
              role_icon: def.icon,
            }
          : m
      )
    );
    showToast(`Role updated to ${def.displayName}`);
  }

  function handleRemoveMember(memberId: string, name: string) {
    if (confirm(`Are you sure you want to remove ${name} from the organization?`)) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast(`${name} removed from organization.`);
    }
  }

  function handleForceUnlock(lockId: string, sectionTitle: string) {
    setLocks((prev) => prev.filter((l) => l.id !== lockId));
    showToast(`Section lock released: "${sectionTitle}"`);
  }

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const def = getRoleDefinition(inviteRole);
    const newMember: MockTeamMember = {
      id: `mem-${Date.now()}`,
      user_id: `u0000000-0000-0000-0001-${Date.now().toString().slice(-12)}`,
      full_name: inviteName,
      email: inviteEmail,
      job_title: `${def.displayName} Specialist`,
      avatar: getInitials(inviteName),
      role_name: inviteRole,
      role_display_name: def.displayName,
      role_color: def.color,
      role_text_color: def.textColor,
      role_icon: def.icon,
      status: "invited",
      joined_at: new Date().toISOString().split("T")[0],
      department: inviteDept,
    };

    setMembers((prev) => [newMember, ...prev]);
    setShowInviteModal(false);
    setInviteName("");
    setInviteEmail("");
    showToast(`Invitation sent to ${inviteEmail} as ${def.displayName}!`);
  }

  const filteredMembers = members.filter((m) => {
    const memberName = m.full_name || "";
    const memberEmail = m.email || "";
    const memberDept = m.department || "";
    const memberRole = m.role_name || "domain_sme";

    const matchesSearch =
      memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memberEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memberDept.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || memberRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 pb-16">
      <Topbar title="Team & Access Control (RBAC)" breadcrumb={["BidPilot AI", "Settings", "Team & RBAC"]} />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-[#1E252D] px-4 py-3 text-xs font-semibold text-white shadow-xl border border-emerald-500/30 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-[#E2E8F0] bg-white px-7 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7A1C2C]/10 text-[#7A1C2C]">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#1E252D] flex items-center gap-2">
                  Enterprise Role-Based Access Control (RBAC)
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Phase 12 Active
                  </span>
                </h1>
                <p className="text-xs text-[#64748B]">
                  Manage organization team members, role assignments, fine-grained permission matrices, and section locking concurrency.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <RbacGuard permission="team:manage">
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-[#7A1C2C] hover:bg-[#621623] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus size={14} />
                Invite Team Member
              </Button>
            </RbacGuard>
          </div>
        </div>
      </div>

      <main className="px-7 space-y-6">
        {/* Interactive Persona Switcher for Live Demo Testing */}
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-700">
                <KeyRound size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Interactive Persona Switcher (RBAC Simulator)
                  </h3>
                  <span className="text-[10px] rounded bg-amber-200/60 px-1.5 py-0.2 text-amber-800 font-medium">
                    Demo Mode
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Currently active persona: <strong className="text-[#1E252D]">{getRoleDefinition(activeUserRole).displayName}</strong> ({getRoleDefinition(activeUserRole).icon} {activeUserRole}). Switch roles below to see how BidPilot dynamically enforces access policies across the UI.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {ROLE_LIST.map((r) => {
                const isActive = activeUserRole === r.name;
                return (
                  <button
                    key={r.name}
                    onClick={() => {
                      switchDemoRole(r.name);
                      showToast(`Switched active persona to ${r.displayName}`);
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#7A1C2C] text-white shadow-sm ring-2 ring-[#7A1C2C]/30"
                        : "bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.displayName}</span>
                    {isActive && <Check size={12} className="text-emerald-300" />}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B]">Organization Members</p>
                <p className="text-2xl font-bold text-[#1E252D] mt-1">{members.length}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">100% active in LankaTech</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Users size={22} />
              </div>
            </div>
          </Card>

          <Card className="border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B]">Configured Roles</p>
                <p className="text-2xl font-bold text-[#1E252D] mt-1">6</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">24 granular permission gates</p>
              </div>
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                <Shield size={22} />
              </div>
            </div>
          </Card>

          <Card className="border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B]">Active Section Locks</p>
                <p className="text-2xl font-bold text-[#1E252D] mt-1">{locks.length}</p>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Optimistic concurrency</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Lock size={22} />
              </div>
            </div>
          </Card>

          <Card className="border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B]">RBAC Policy Engine</p>
                <p className="text-base font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Enforcing
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">PostgreSQL RLS + FastAPI JWT</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <KeyRound size={22} />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabbed View */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="border-b border-[#E2E8F0] bg-transparent p-0 flex gap-4">
            <TabsTrigger
              value="members"
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs font-semibold data-[state=active]:border-[#7A1C2C] data-[state=active]:text-[#7A1C2C] data-[state=active]:bg-transparent"
            >
              Team Roster ({members.length})
            </TabsTrigger>
            <TabsTrigger
              value="matrix"
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs font-semibold data-[state=active]:border-[#7A1C2C] data-[state=active]:text-[#7A1C2C] data-[state=active]:bg-transparent"
            >
              Permission Matrix (6 Roles × 24 Actions)
            </TabsTrigger>
            <TabsTrigger
              value="locks"
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs font-semibold data-[state=active]:border-[#7A1C2C] data-[state=active]:text-[#7A1C2C] data-[state=active]:bg-transparent flex items-center gap-1.5"
            >
              Section Concurrency Locks
              {locks.length > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                  {locks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 1. Team Members Tab */}
          <TabsContent value="members" className="space-y-4 pt-2">
            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#1E252D]">
                      Organization Team Members
                    </CardTitle>
                    <CardDescription className="text-xs text-[#64748B]">
                      Assigned personas and tenant permissions within LankaTech Solutions.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
                      <Input
                        placeholder="Search by name, email, dept..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 w-56 pl-8 text-xs border-[#CBD5E1]"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-8 rounded-md border border-[#CBD5E1] bg-white px-2 text-xs text-[#334155]"
                    >
                      <option value="all">All Roles</option>
                      {ROLE_LIST.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      <tr>
                        <th className="px-6 py-3">Member</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Assigned Role</th>
                        <th className="px-4 py-3 text-center">Tenders</th>
                        <th className="px-4 py-3 text-center">Locks</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredMembers.map((member) => {
                        const memberRole = (member.role_name || (member as any).role || "domain_sme") as RoleName;
                        const memberName = member.full_name || (member as any).name || "Team Member";
                        const memberJob = member.job_title || (member as any).jobTitle || "";
                        const memberAvatar = member.avatar || getInitials(memberName);
                        const roleDef = getRoleDefinition(memberRole);
                        const isCurrentPersona = memberName.toLowerCase().includes("ashan");

                        return (
                          <tr key={member.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: roleDef.color }}
                                >
                                  {memberAvatar}
                                </div>
                                <div>
                                  <div className="font-semibold text-[#1E252D] flex items-center gap-1.5">
                                    {memberName}
                                    {isCurrentPersona && (
                                      <span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#64748B]">{member.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-[#334155]">
                              <div>{member.department}</div>
                              <div className="text-[10px] text-[#94A3B8]">{memberJob}</div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold"
                                  style={getRoleBadgeStyle(memberRole)}
                                >
                                  <span>{roleDef.icon}</span>
                                  <span>{roleDef.displayName}</span>
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-center font-medium text-[#334155]">
                              {(member as any).assignedTendersCount ?? 3}
                            </td>

                            <td className="px-4 py-3.5 text-center font-medium">
                              {(member as any).lockedSectionsCount > 0 ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  {(member as any).lockedSectionsCount} active
                                </span>
                              ) : (
                                <span className="text-[#94A3B8]">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <Badge
                                status={
                                  member.status === "active"
                                    ? "Active"
                                    : member.status === "invited"
                                    ? "Review"
                                    : "Draft"
                                }
                              />
                            </td>

                            <td className="px-6 py-3.5 text-right">
                              <RbacGuard
                                permission="team:manage"
                                fallback={
                                  <span className="text-[11px] text-[#94A3B8] italic">Read-only</span>
                                }
                              >
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={memberRole}
                                    onChange={(e) =>
                                      handleRoleChange(member.id, e.target.value as RoleName)
                                    }
                                    className="h-7 rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                                  >
                                    {ROLE_LIST.map((r) => (
                                      <option key={r.name} value={r.name}>
                                        {r.displayName}
                                      </option>
                                    ))}
                                  </select>

                                  {!isCurrentPersona && (
                                    <button
                                      onClick={() => handleRemoveMember(member.id, memberName)}
                                      className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors"
                                      title="Remove member"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </RbacGuard>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Permission Matrix Tab */}
          <TabsContent value="matrix" className="space-y-4 pt-2">
            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#1E252D]">
                      Role Capabilities & Permission Matrix
                    </CardTitle>
                    <CardDescription className="text-xs text-[#64748B]">
                      Fine-grained matrix mapping the 6 enterprise roles to 24 critical operations.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Check size={13} className="text-emerald-600 font-bold" /> Granted
                    </span>
                    <span className="flex items-center gap-1">
                      <X size={13} className="text-[#CBD5E1]" /> Denied
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B]">
                      <tr>
                        <th className="px-6 py-3 w-1/3">Permission / Operation</th>
                        {ROLE_LIST.map((r) => (
                          <th key={r.name} className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span>{r.icon}</span>
                              <span className="text-[10px] text-[#1E252D] font-bold mt-0.5">
                                {r.displayName}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {PERMISSION_GROUPS.map((group) => (
                        <tr key={group.name} className="bg-white">
                          <td colSpan={7} className="p-0">
                            <div className="bg-[#F1F5F9]/60 px-6 py-2 border-y border-[#E2E8F0]">
                              <span className="font-bold text-[11px] uppercase tracking-wider text-[#334155]">
                                {group.name}
                              </span>
                              <span className="text-[10px] text-[#64748B] ml-2 font-normal">
                                — {group.description}
                              </span>
                            </div>
                            <table className="w-full text-left text-xs">
                              <tbody className="divide-y divide-[#E2E8F0]">
                                {group.permissions.map((permCode) => (
                                  <tr key={permCode} className="hover:bg-[#F8FAFC]">
                                    <td className="px-6 py-2.5 w-1/3 font-mono text-[11px] text-[#334155]">
                                      {permCode}
                                    </td>
                                    {ROLE_LIST.map((r) => {
                                      const hasAccess = ROLE_PERMISSIONS[r.name]?.includes(permCode);
                                      return (
                                        <td key={r.name} className="px-3 py-2.5 text-center">
                                          {hasAccess ? (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                              <Check size={12} strokeWidth={3} />
                                            </span>
                                          ) : (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#CBD5E1]">
                                              <X size={12} />
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Concurrency Locks Tab */}
          <TabsContent value="locks" className="space-y-4 pt-2">
            <Card className="border-[#E2E8F0] bg-white">
              <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#1E252D] flex items-center gap-2">
                      Active Optimistic Section Locks
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Live Concurrency
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-[#64748B]">
                      Prevents overwriting section edits when multiple collaborators work on proposal RFPs simultaneously.
                    </CardDescription>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocks(INITIAL_LOCKS);
                      showToast("Section lock registry refreshed.");
                    }}
                    className="text-xs flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    Refresh Locks
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {locks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#64748B]">
                    <Unlock size={28} className="mx-auto mb-2 text-[#94A3B8]" />
                    <p className="font-semibold text-[#1E252D]">No Active Section Locks</p>
                    <p className="mt-0.5">All proposal sections are currently free for collaborative editing.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                        <tr>
                          <th className="px-6 py-3">Locked Section</th>
                          <th className="px-4 py-3">Tender RFP</th>
                          <th className="px-4 py-3">Held By</th>
                          <th className="px-4 py-3">Acquired</th>
                          <th className="px-4 py-3">Expires In</th>
                          <th className="px-6 py-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {locks.map((lock) => {
                          const roleDef = getRoleDefinition(lock.lockedByRole);
                          return (
                            <tr key={lock.id} className="hover:bg-[#F8FAFC]">
                              <td className="px-6 py-3.5">
                                <div className="font-semibold text-[#1E252D] flex items-center gap-1.5">
                                  <Lock size={13} className="text-amber-600 flex-shrink-0" />
                                  <span>{lock.sectionTitle}</span>
                                </div>
                                <div className="text-[10px] font-mono text-[#64748B]">
                                  ID: {lock.sectionId}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-mono text-[11px] text-[#334155]">
                                {lock.tenderCode}
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold"
                                    style={getRoleBadgeStyle(lock.lockedByRole)}
                                  >
                                    <span>{roleDef.icon}</span>
                                    <span>{lock.lockedBy}</span>
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-[#64748B]">
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Clock size={12} />
                                  {lock.lockedAt}
                                </span>
                              </td>

                              <td className="px-4 py-3.5">
                                <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-2 py-0.5 text-[11px]">
                                  {lock.expiresInMinutes} mins
                                </span>
                              </td>

                              <td className="px-6 py-3.5 text-right">
                                <RbacGuard
                                  permission="team:manage"
                                  fallback={
                                    <span className="text-[10px] text-[#94A3B8]">Admin only</span>
                                  }
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleForceUnlock(lock.id, lock.sectionTitle)}
                                    className="h-7 text-[11px] text-red-600 hover:bg-red-50 hover:border-red-200"
                                  >
                                    <Unlock size={12} className="mr-1" />
                                    Force Release
                                  </Button>
                                </RbacGuard>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-[#CBD5E1] bg-white shadow-2xl animate-in fade-in zoom-in-95">
            <CardHeader className="border-b border-[#E2E8F0] px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-[#1E252D] flex items-center gap-2">
                  <UserPlus size={16} className="text-[#7A1C2C]" />
                  Invite New Team Member
                </CardTitle>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X size={16} />
                </button>
              </div>
              <CardDescription className="text-xs text-[#64748B]">
                Send an organization invitation and configure RBAC authorization.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleInviteSubmit}>
              <CardContent className="space-y-4 px-6 py-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E252D]">Full Name</label>
                  <Input
                    required
                    placeholder="e.g. Sanjaya Ranasinghe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="h-8 text-xs border-[#CBD5E1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E252D]">Work Email</label>
                  <Input
                    required
                    type="email"
                    placeholder="sanjaya@lankatech.lk"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-8 text-xs border-[#CBD5E1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1E252D]">Role Assignment</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as RoleName)}
                      className="h-8 w-full rounded-md border border-[#CBD5E1] bg-white px-2 text-xs text-[#334155]"
                    >
                      {ROLE_LIST.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1E252D]">Department</label>
                    <Input
                      placeholder="e.g. Solution Delivery"
                      value={inviteDept}
                      onChange={(e) => setInviteDept(e.target.value)}
                      className="h-8 text-xs border-[#CBD5E1]"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <Info size={13} className="text-slate-500" />
                    Role Privileges:
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {getRoleDefinition(inviteRole).description}
                  </p>
                </div>
              </CardContent>

              <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] px-6 py-3 bg-[#F8FAFC]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#7A1C2C] hover:bg-[#621623] text-white text-xs font-semibold"
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
