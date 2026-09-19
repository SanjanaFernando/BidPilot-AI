"use client";

import React, { ReactNode } from "react";
import { Quote, FileText, CheckCircle2, Award } from "lucide-react";

interface StructuredDocumentRendererProps {
  content: string;
  onSelectClaim?: (claimText: string) => void;
  onMouseUp?: () => void;
}

export function StructuredDocumentRenderer({
  content,
  onSelectClaim,
  onMouseUp,
}: StructuredDocumentRendererProps) {
  if (!content) {
    return <div className="text-slate-400 italic">No content available for this section.</div>;
  }

  // Helper to parse inline styles: bold (**text**), italics (*text*), and citation tags ([Ref 1])
  const parseInline = (text: string): ReactNode[] => {
    // Regex matching bold **...**, citation [Ref ...], and standard text
    const parts: ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Citation match e.g. [Ref 1] or [Ref 1: PRJ-001]
      const refMatch = remaining.match(/^(\[Ref\s*[^\]]+\])/);
      if (refMatch) {
        const fullTag = refMatch[1];
        parts.push(
          <span
            key={`ref-${keyIdx++}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectClaim) onSelectClaim(text);
            }}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-[#FDF3DA] text-[#7A1C2C] border border-[#F1DCB1] hover:bg-[#FBE9C4] cursor-pointer shadow-2xs transition-transform active:scale-95 select-none"
            title="Verified Evidence Citation · Click to inspect dossier"
          >
            <Quote className="w-2.5 h-2.5 text-[#7A1C2C]" />
            {fullTag.replace(/^\[|\]$/g, "")}
          </span>
        );
        remaining = remaining.slice(fullTag.length);
        continue;
      }

      // Bold match **...**
      const boldMatch = remaining.match(/^(\*\*([^*]+)\*\*)/);
      if (boldMatch) {
        parts.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-slate-900">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[1].length);
        continue;
      }

      // Regular character match until next token
      const nextTokenIdx = remaining.search(/\*\*|\[Ref/);
      if (nextTokenIdx === -1) {
        parts.push(remaining);
        break;
      } else if (nextTokenIdx === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextTokenIdx));
        remaining = remaining.slice(nextTokenIdx);
      }
    }

    return parts;
  };

  // Split lines into structured blocks
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let currentTableRows: string[][] = [];
  let inTable = false;
  let blockIdx = 0;

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      const headerRow = currentTableRows[0];
      const bodyRows = currentTableRows.slice(1).filter((r) => !r.every((c) => c.match(/^:?-+:?$/)));

      blocks.push(
        <div key={`table-${blockIdx++}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {headerRow.map((cell, cIdx) => (
                  <th key={`th-${cIdx}`} className="px-3.5 py-2.5 font-bold text-slate-700 tracking-wide">
                    {parseInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bodyRows.map((row, rIdx) => (
                <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/70 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={`td-${rIdx}-${cIdx}`} className="px-3.5 py-2 text-slate-600">
                      {parseInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table row detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      currentTableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (!trimmed) {
      continue;
    }

    // Heading 1 (# ...)
    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h1
          key={`h1-${blockIdx++}`}
          className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-6 mb-3 pb-2 border-b-2 border-slate-100 flex items-center gap-2"
        >
          <FileText className="w-5 h-5 text-[#7A1C2C] inline-block" />
          {parseInline(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // Heading 2 (## ...)
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${blockIdx++}`}
          className="text-base md:text-lg font-bold text-slate-900 tracking-tight mt-5 mb-2.5 text-[#1E252D] flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-[#7A1C2C] inline-block" />
          {parseInline(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }

    // Heading 3 (### ...)
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${blockIdx++}`}
          className="text-sm md:text-base font-semibold text-slate-800 mt-4 mb-1.5"
        >
          {parseInline(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }

    // Callout quote block (> ...)
    if (trimmed.startsWith("> ")) {
      blocks.push(
        <div
          key={`quote-${blockIdx++}`}
          className="my-3.5 p-4 rounded-xl bg-indigo-50/70 border-l-4 border-indigo-600 text-xs md:text-sm text-indigo-950 leading-relaxed italic shadow-2xs"
        >
          {parseInline(trimmed.replace(/^>\s+/, ""))}
        </div>
      );
      continue;
    }

    // Bullet list item (- ... or * ...)
    if (trimmed.match(/^[-*]\s+/)) {
      blocks.push(
        <div key={`bullet-${blockIdx++}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-slate-700 text-sm leading-relaxed">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
          <div className="flex-1">{parseInline(trimmed.replace(/^[-*]\s+/, ""))}</div>
        </div>
      );
      continue;
    }

    // Numbered list item (1. ... or 2. ...)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push(
        <div key={`num-${blockIdx++}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-slate-700 text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold text-[#7A1C2C] mt-0.5 flex-shrink-0 bg-slate-100 rounded px-1.5 py-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1">{parseInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Regular paragraph
    blocks.push(
      <p
        key={`p-${blockIdx++}`}
        className="my-2.5 text-sm md:text-[14.5px] leading-relaxed text-slate-700 font-normal"
      >
        {parseInline(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return (
    <div
      onMouseUp={onMouseUp}
      className="p-8 md:p-10 bg-white rounded-2xl border border-slate-200/80 shadow-xs max-w-4xl mx-auto selection:bg-indigo-100 selection:text-indigo-900 select-text cursor-text"
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div className="prose prose-slate max-w-none space-y-1">{blocks}</div>
    </div>
  );
}
