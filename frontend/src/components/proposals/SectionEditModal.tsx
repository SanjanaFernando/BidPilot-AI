"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  Table as TableIcon,
  Quote,
  Save,
  Eye,
  Edit3,
  Columns,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { StructuredDocumentRenderer } from "./StructuredDocumentRenderer";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Lock } from "lucide-react";

interface SectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  initialContent: string;
  onSave: (newContent: string, newTitle?: string) => Promise<void>;
}

export function SectionEditModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  initialContent,
  onSave,
}: SectionEditModalProps) {
  const { hasPermission, roleDef } = useUserPermissions();
  const canEdit = hasPermission("proposals:edit_own") || hasPermission("proposals:edit_any");

  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(sectionTitle);
  const [tab, setTab] = useState<"edit" | "split" | "preview">(canEdit ? "split" : "preview");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setTitle(sectionTitle);
    setSavedSuccess(false);
    if (!canEdit) {
      setTab("preview");
    }
  }, [initialContent, sectionTitle, isOpen, canEdit]);

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const insertSnippet = (prefix: string, suffix: string = "") => {
    if (!canEdit) return;
    const textarea = document.getElementById("section-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + (selected || "text") + suffix;
    const newText = content.substring(0, start) + replacement + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected.length || 4)
      );
    }, 50);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await onSave(content, title);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save section edits. Please check connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="mr-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Proposal Section Editor
              </span>
              {!canEdit && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  <Lock size={10} /> Read-Only ({roleDef.displayName})
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full border-b border-transparent bg-transparent py-0.5 text-base font-bold text-slate-900 ${
                canEdit
                  ? "cursor-text hover:border-slate-300 focus:border-[#7A1C2C] focus:outline-none"
                  : "cursor-not-allowed opacity-75"
              }`}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setTab("edit")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  tab === "edit"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 size={13} /> Edit
              </button>
              <button
                onClick={() => setTab("split")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  tab === "split"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns size={13} /> Split
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  tab === "preview"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye size={13} /> Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Read-only Alert Banner */}
        {!canEdit && (
          <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs font-medium text-amber-900">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-amber-700" />
              Viewing in <strong>Read-Only</strong> mode as <strong>{roleDef.displayName}</strong>.
              You cannot modify section markdown or save changes.
            </span>
            <span className="text-[11px] text-amber-700">Requires 'proposals:edit_own'</span>
          </div>
        )}

        {/* Toolbar */}
        {(tab === "edit" || tab === "split") && (
          <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 py-2 text-slate-700">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => insertSnippet("**", "**")}
              className={`rounded p-1.5 ${canEdit ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900" : "cursor-not-allowed opacity-40"}`}
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => insertSnippet("*", "*")}
              className={`rounded p-1.5 ${canEdit ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900" : "cursor-not-allowed opacity-40"}`}
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => insertSnippet("## ")}
              className={`rounded p-1.5 ${canEdit ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900" : "cursor-not-allowed opacity-40"}`}
              title="Heading 2"
            >
              <Heading2 size={15} />
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => insertSnippet("### ")}
              className={`rounded p-1.5 ${canEdit ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900" : "cursor-not-allowed opacity-40"}`}
              title="Heading 3"
            >
              <Heading3 size={15} />
            </button>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => insertSnippet("- ")}
              className={`rounded p-1.5 ${canEdit ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900" : "cursor-not-allowed opacity-40"}`}
              title="Bullet list"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() =>
                insertSnippet(
                  "\n| Milestone / Module | Deliverable | Duration | Target Output |\n| --- | --- | --- | --- |\n| Phase 1 | Core Specifications | 3 Weeks | Architecture SRS |\n"
                )
              }
              className={`rounded p-1.5 ${canEdit ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900" : "cursor-not-allowed opacity-40"}`}
              title="Insert Table"
            >
              <TableIcon size={15} />
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() =>
                insertSnippet("\n*Evidence Reference: [CIT-001: Verified Company Portfolio]*\n")
              }
              className={`flex items-center gap-1 rounded p-1.5 px-2 text-xs font-medium ${canEdit ? "cursor-pointer text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700" : "cursor-not-allowed text-slate-400 opacity-40"}`}
              title="Insert Evidence Citation"
            >
              <Quote size={13} /> + Citation Anchor
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {(tab === "edit" || tab === "split") && (
            <div
              className={`flex flex-1 flex-col p-4 ${tab === "split" ? "border-r border-slate-200" : ""}`}
            >
              <textarea
                id="section-editor-textarea"
                value={content}
                readOnly={!canEdit}
                onChange={(e) => canEdit && setContent(e.target.value)}
                placeholder="Write proposal section markdown here..."
                className={`w-full flex-1 resize-none rounded-lg border p-4 font-mono text-xs leading-relaxed focus:outline-none ${
                  canEdit
                    ? "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#7A1C2C]"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600 opacity-80"
                }`}
              />
            </div>
          )}

          {(tab === "preview" || tab === "split") && (
            <div className="flex-1 overflow-y-auto bg-white p-6">
              <div className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                Live Document Render
              </div>
              <StructuredDocumentRenderer content={content} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-4 font-mono text-xs text-slate-500">
            <span>{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{charCount.toLocaleString()} characters</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !canEdit}
              title={!canEdit ? `Saving disabled for role ${roleDef.displayName}` : "Save Changes"}
              className={`gap-1.5 font-bold ${
                canEdit
                  ? "cursor-pointer bg-[#7A1C2C] text-white hover:bg-[#621623]"
                  : "pointer-events-auto cursor-not-allowed bg-slate-300 text-slate-500 opacity-60"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Saving...
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-300" /> Saved!
                </>
              ) : (
                <>
                  <Save size={13} /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
