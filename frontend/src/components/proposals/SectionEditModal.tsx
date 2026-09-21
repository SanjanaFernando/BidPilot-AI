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
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(sectionTitle);
  const [tab, setTab] = useState<"edit" | "split" | "preview">("split");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setTitle(sectionTitle);
    setSavedSuccess(false);
  }, [initialContent, sectionTitle, isOpen]);

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const insertSnippet = (prefix: string, suffix: string = "") => {
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
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 50);
  };

  const handleSave = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[88vh] flex flex-col rounded-xl overflow-hidden bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Proposal Section Editor
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#7A1C2C] focus:outline-none w-full py-0.5"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setTab("edit")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  tab === "edit" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 size={13} /> Edit
              </button>
              <button
                onClick={() => setTab("split")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  tab === "split" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns size={13} /> Split
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  tab === "preview" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye size={13} /> Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {(tab === "edit" || tab === "split") && (
          <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-200 bg-white text-slate-700">
            <button
              type="button"
              onClick={() => insertSnippet("**", "**")}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900"
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("*", "*")}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900"
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <span className="h-4 w-px bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => insertSnippet("## ")}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900"
              title="Heading 2"
            >
              <Heading2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("### ")}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900"
              title="Heading 3"
            >
              <Heading3 size={15} />
            </button>
            <span className="h-4 w-px bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => insertSnippet("- ")}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900"
              title="Bullet list"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  "\n| Milestone / Module | Deliverable | Duration | Target Output |\n| --- | --- | --- | --- |\n| Phase 1 | Core Specifications | 3 Weeks | Architecture SRS |\n"
                )
              }
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900"
              title="Insert Table"
            >
              <TableIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("\n*Evidence Reference: [CIT-001: Verified Company Portfolio]*\n")}
              className="p-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 text-indigo-600 font-medium text-xs flex items-center gap-1 px-2"
              title="Insert Evidence Citation"
            >
              <Quote size={13} /> + Citation Anchor
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {(tab === "edit" || tab === "split") && (
            <div className={`flex-1 flex flex-col p-4 ${tab === "split" ? "border-r border-slate-200" : ""}`}>
              <textarea
                id="section-editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write proposal section markdown here..."
                className="w-full flex-1 p-4 font-mono text-xs leading-relaxed text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7A1C2C] focus:bg-white resize-none"
              />
            </div>
          )}

          {(tab === "preview" || tab === "split") && (
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Live Document Render
              </div>
              <StructuredDocumentRenderer content={content} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-4">
            <span>{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{charCount.toLocaleString()} characters</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-[#7A1C2C] hover:bg-[#621623] text-white font-bold"
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
