"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Search,
  Plus,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Lock,
  CheckCircle2,
  ExternalLink,
  Check,
} from "lucide-react";

import { useUserPermissions } from "@/hooks/useUserPermissions";
import { PermissionCode } from "@/lib/rbac";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from "@/lib/ai-service";

interface TopbarProps {
  title: string;
  breadcrumb?: string[];
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    permission?: PermissionCode;
  };
}

export default function Topbar({ title, breadcrumb, action }: TopbarProps) {
  const { roleDef, fullName, avatarInitials, hasPermission } = useUserPermissions();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifs = () => {
    getNotifications("a0000000-0000-0000-0001-000000000001")
      .then((res) => {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  // Close popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead("a0000000-0000-0000-0001-000000000001").catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Auto-detect permission if not explicitly provided
  let isActionAllowed = true;
  if (action) {
    if (action.permission) {
      isActionAllowed = hasPermission(action.permission);
    } else if (action.label.toLowerCase().includes("tender")) {
      isActionAllowed = hasPermission("tenders:create");
    } else if (
      action.label.toLowerCase().includes("project") ||
      action.label.toLowerCase().includes("employee") ||
      action.label.toLowerCase().includes("tech") ||
      action.label.toLowerCase().includes("cert")
    ) {
      isActionAllowed = hasPermission("knowledge:create");
    }
  }

  const filteredNotifs =
    activeTab === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const getNotifIcon = (type: string, severity: string) => {
    if (type === "proposal_signed") return <ShieldCheck size={14} className="text-emerald-500" />;
    if (type === "secret_detected") return <Lock size={14} className="text-sky-500" />;
    if (severity === "urgent" || severity === "warning")
      return <AlertTriangle size={14} className="text-amber-500" />;
    return <FileText size={14} className="text-slate-400" />;
  };

  return (
    <header className="gov-topbar relative">
      {/* Title / breadcrumb */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "1px" }}>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {i > 0 && <ChevronRight size={10} style={{ color: "var(--gov-text-muted)" }} />}
                <span style={{ fontSize: "11px", color: "var(--gov-text-muted)" }}>{crumb}</span>
              </span>
            ))}
          </div>
        )}
        <h1
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--gov-text-main)",
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Search */}
      <div style={{ position: "relative", width: "210px" }}>
        <Search
          size={13}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--gov-text-muted)",
            pointerEvents: "none",
          }}
        />
        <Input
          placeholder="Search…"
          className="h-8 pl-8 text-[13px]"
          style={{ background: "var(--background)" }}
        />
      </div>

      {/* Action */}
      {action &&
        (action.href && isActionAllowed ? (
          <Link href={action.href}>
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer gap-1.5 bg-[#DDA625] font-semibold text-[#1E252D] hover:bg-[#C8951E]"
            >
              <Plus size={13} />
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={!isActionAllowed}
            onClick={isActionAllowed ? action.onClick : undefined}
            title={
              !isActionAllowed
                ? `Action '${action.label}' disabled for ${roleDef.displayName}`
                : action.label
            }
            className={`gap-1.5 font-semibold text-[#1E252D] ${
              isActionAllowed
                ? "cursor-pointer bg-[#DDA625] hover:bg-[#C8951E]"
                : "pointer-events-auto cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-400 opacity-50"
            }`}
          >
            <Plus size={13} />
            {action.label}
          </Button>
        ))}

      {/* Separator */}
      <Separator orientation="vertical" className="h-6" />

      {/* Notifications Popover (Phase 15) */}
      <div className="relative" ref={popoverRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="relative h-8 w-8 hover:bg-slate-100"
          title="Notifications & System Alerts"
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-bold text-white shadow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Dropdown Card */}
        {isOpen && (
          <div className="animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-2 w-84 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl duration-100 sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  <Check size={11} /> Mark all read
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-3 pt-2 text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`border-b-2 px-2 pb-1.5 font-medium transition-colors ${
                  activeTab === "all"
                    ? "border-rose-700 font-bold text-rose-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`border-b-2 px-2 pb-1.5 font-medium transition-colors ${
                  activeTab === "unread"
                    ? "border-rose-700 font-bold text-rose-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {filteredNotifs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-slate-300" />
                  No notifications to display
                </div>
              ) : (
                filteredNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2.5 p-3 text-xs transition-colors hover:bg-slate-50 ${
                      !n.is_read ? "bg-rose-50/40" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{getNotifIcon(n.type, n.severity)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-semibold text-slate-900 ${!n.is_read ? "font-bold text-rose-950" : ""}`}
                        >
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            title="Mark as read"
                            className="text-[10px] text-slate-400 hover:text-slate-700"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-600">
                        {n.message}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-0.5 font-semibold text-rose-700 hover:text-rose-800"
                          >
                            View details <ChevronRight size={10} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 p-2 text-center text-[10px] text-slate-500">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="font-medium text-rose-800 hover:underline"
              >
                Configure Webhooks & Notification Settings
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Avatar with Role Tooltip */}
      <Link
        href="/settings/team"
        title={`${fullName} (${roleDef.displayName}) — Click to manage team & roles`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: roleDef.color || "var(--gov-maroon)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: roleDef.textColor || "#fff",
            fontSize: "10.5px",
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        >
          {avatarInitials}
        </div>
      </Link>
    </header>
  );
}
