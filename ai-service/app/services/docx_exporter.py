"""
BidPilot AI — Professional DOCX Proposal Exporter
Converts multi-agent proposal synthesis markdown and metadata into a beautifully formatted,
executive-ready Microsoft Word (.docx) document.
"""

import io
import os
import re
from typing import Any, Dict, List, Optional
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# Brand Color Palette
PRIMARY_COLOR = RGBColor(122, 28, 44)     # #7A1C2C (Burgundy)
SECONDARY_COLOR = RGBColor(30, 37, 45)    # #1E252D (Slate Navy)
ACCENT_COLOR = RGBColor(221, 166, 37)     # #DDA625 (Gold)
MUTED_COLOR = RGBColor(100, 116, 139)     # #64748B (Muted Gray)
LIGHT_BG_HEX = "F8FAFC"
HEADER_BG_HEX = "7A1C2C"


def _set_cell_background(cell, fill_hex: str):
    """Set background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)


def _set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner padding for table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def build_proposal_docx(
    tender_title: str,
    tender_ref: str,
    client_name: str,
    sections: List[Dict[str, Any]],
    compliance_score: Optional[float] = 95.0,
    win_probability: Optional[float] = 90.0,
    version: int = 1,
    organization_name: str = "BidPilot Enterprise Solutions",
) -> io.BytesIO:
    """
    Generate a formatted DOCX document from proposal sections.
    """
    doc = Document()

    # Set page margins (1 inch)
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)
        
        # Header & Footer
        header = s.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run(f"CONFIDENTIAL — {tender_title[:45]}...")
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = MUTED_COLOR

        footer = s.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run(f"{organization_name} · Tender Ref: {tender_ref} · Proposal v{version}")
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = MUTED_COLOR

    # -------------------------------------------------------------------------
    # COVER / HEADER BANNER
    # -------------------------------------------------------------------------
    logo_candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "logo.png")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "logo.png")),
        os.path.abspath("frontend/public/logo.png"),
    ]
    logo_path = next((p for p in logo_candidates if os.path.exists(p)), None)
    if logo_path:
        try:
            logo_p = doc.add_paragraph()
            logo_p.paragraph_format.space_before = Pt(0)
            logo_p.paragraph_format.space_after = Pt(4)
            logo_run = logo_p.add_run()
            logo_run.add_picture(logo_path, width=Inches(1.0))
        except Exception:
            pass

    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(8)
    title_p.paragraph_format.space_after = Pt(4)
    run_pre = title_p.add_run("FORMAL PROPOSAL RESPONSE\n")
    run_pre.font.size = Pt(11)
    run_pre.font.bold = True
    run_pre.font.color.rgb = ACCENT_COLOR

    run_main = title_p.add_run(tender_title)
    run_main.font.size = Pt(22)
    run_main.font.bold = True
    run_main.font.color.rgb = PRIMARY_COLOR

    # Subtitle / Issued To
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(4)
    sub_p.paragraph_format.space_after = Pt(16)
    r_sub = sub_p.add_run(f"Prepared for: {client_name}  |  Tender Reference: {tender_ref}")
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = SECONDARY_COLOR

    # -------------------------------------------------------------------------
    # METADATA SUMMARY TABLE
    # -------------------------------------------------------------------------
    meta_table = doc.add_table(rows=2, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False

    meta_cols = [
        ("Tender Reference", tender_ref),
        ("Proposal Version", f"v{version}.0 (Final)"),
        ("Compliance Score", f"{int(compliance_score or 95)}% Verified"),
        ("Win Probability", f"{int(win_probability or 90)}% Predicted"),
    ]

    for col_idx, (label, val) in enumerate(meta_cols):
        # Header cell
        h_cell = meta_table.cell(0, col_idx)
        _set_cell_background(h_cell, "F1F5F9")
        _set_cell_margins(h_cell, 80, 80, 100, 100)
        p_h = h_cell.paragraphs[0]
        p_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_h = p_h.add_run(label.upper())
        r_h.font.size = Pt(8)
        r_h.font.bold = True
        r_h.font.color.rgb = MUTED_COLOR

        # Value cell
        v_cell = meta_table.cell(1, col_idx)
        _set_cell_background(v_cell, "FFFFFF")
        _set_cell_margins(v_cell, 100, 100, 100, 100)
        p_v = v_cell.paragraphs[0]
        p_v.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_v = p_v.add_run(val)
        r_v.font.size = Pt(10.5)
        r_v.font.bold = True
        r_v.font.color.rgb = PRIMARY_COLOR if "Score" in label or "Win" in label else SECONDARY_COLOR

    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # -------------------------------------------------------------------------
    # PROPOSAL SECTIONS
    # -------------------------------------------------------------------------
    for sec_idx, sec in enumerate(sections):
        title = sec.get("title", f"Section {sec_idx + 1}")
        content = sec.get("content_markdown") or sec.get("content") or ""

        # Section Heading (H1)
        h1 = doc.add_heading(level=1)
        h1.paragraph_format.space_before = Pt(20)
        h1.paragraph_format.space_after = Pt(8)
        h1_run = h1.add_run(f"{sec_idx + 1}. {title}")
        h1_run.font.size = Pt(15)
        h1_run.font.bold = True
        h1_run.font.color.rgb = PRIMARY_COLOR

        # Process Section Content
        _render_markdown_content(doc, content)

        # Section separator
        doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Save to BytesIO
    out_stream = io.BytesIO()
    doc.save(out_stream)
    out_stream.seek(0)
    return out_stream


def _render_markdown_content(doc: Document, text: str):
    """
    Parse markdown blocks (headings, tables, lists, citations, paragraphs)
    and append formatted elements to Word document.
    """
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Blank line
        if not line:
            i += 1
            continue

        # Markdown Table Detection
        if line.startswith("|") and "|" in line[1:]:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            _render_markdown_table(doc, table_lines)
            continue

        # Heading 2 (##)
        if line.startswith("## "):
            h2 = doc.add_heading(level=2)
            h2.paragraph_format.space_before = Pt(12)
            h2.paragraph_format.space_after = Pt(4)
            h2_run = h2.add_run(line.replace("## ", "").strip())
            h2_run.font.size = Pt(13)
            h2_run.font.bold = True
            h2_run.font.color.rgb = SECONDARY_COLOR
            i += 1
            continue

        # Heading 3 (###)
        if line.startswith("### "):
            h3 = doc.add_heading(level=3)
            h3.paragraph_format.space_before = Pt(10)
            h3.paragraph_format.space_after = Pt(3)
            h3_run = h3.add_run(line.replace("### ", "").strip())
            h3_run.font.size = Pt(11.5)
            h3_run.font.bold = True
            h3_run.font.color.rgb = PRIMARY_COLOR
            i += 1
            continue

        # Heading 4 (####)
        if line.startswith("#### "):
            h4 = doc.add_heading(level=4)
            h4.paragraph_format.space_before = Pt(8)
            h4.paragraph_format.space_after = Pt(2)
            h4_run = h4.add_run(line.replace("#### ", "").strip())
            h4_run.font.size = Pt(10.5)
            h4_run.font.bold = True
            h4_run.font.color.rgb = SECONDARY_COLOR
            i += 1
            continue

        # Bullet List Item (- or * )
        if line.startswith("- ") or line.startswith("* "):
            bullet_text = line[2:].strip()
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            _add_formatted_runs(p, bullet_text)
            i += 1
            continue

        # Callout / Evidence Citation (*Evidence Reference: ...*)
        if line.startswith("*Evidence Reference:") or line.startswith("Evidence:"):
            p_callout = doc.add_paragraph()
            p_callout.paragraph_format.space_before = Pt(6)
            p_callout.paragraph_format.space_after = Pt(6)
            p_callout.paragraph_format.left_indent = Inches(0.2)
            r_c = p_callout.add_run("🔍 " + line.strip("*_ "))
            r_c.font.size = Pt(9.5)
            r_c.font.italic = True
            r_c.font.color.rgb = MUTED_COLOR
            i += 1
            continue

        # Horizontal Rule (---)
        if line.startswith("---") or line.startswith("___"):
            p_sep = doc.add_paragraph()
            p_sep.paragraph_format.space_before = Pt(4)
            p_sep.paragraph_format.space_after = Pt(4)
            i += 1
            continue

        # Regular Paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        _add_formatted_runs(p, line)
        i += 1


def _add_formatted_runs(paragraph, text: str):
    """
    Parse inline bold (**text**), italics (*text*), and code (`text`).
    """
    # Tokenize bold text
    parts = re.split(r'(\*\*.*?\*\*)', text)
    for part in parts:
        if part.startswith("**") and part.endswith("**") and len(part) >= 4:
            run = paragraph.add_run(part[2:-2])
            run.font.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = SECONDARY_COLOR
        else:
            # Tokenize italics
            subparts = re.split(r'(\*.*?\*)', part)
            for sub in subparts:
                if sub.startswith("*") and sub.endswith("*") and len(sub) >= 2:
                    run = paragraph.add_run(sub[1:-1])
                    run.font.italic = True
                    run.font.size = Pt(10)
                    run.font.color.rgb = SECONDARY_COLOR
                else:
                    if sub:
                        run = paragraph.add_run(sub)
                        run.font.size = Pt(10)
                        run.font.color.rgb = SECONDARY_COLOR


def _render_markdown_table(doc: Document, table_lines: List[str]):
    """
    Parse Markdown table syntax into a styled Word table.
    """
    if len(table_lines) < 2:
        return

    # Parse rows
    parsed_rows = []
    for line in table_lines:
        # Ignore divider line (| --- | --- |)
        if re.match(r'^\s*\|?[\s\-:|]+\|?\s*$', line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if cells:
            parsed_rows.append(cells)

    if not parsed_rows:
        return

    col_count = max(len(r) for r in parsed_rows)
    table = doc.add_table(rows=len(parsed_rows), cols=col_count)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    for row_idx, row_data in enumerate(parsed_rows):
        is_header = (row_idx == 0)
        for col_idx in range(col_count):
            cell = table.cell(row_idx, col_idx)
            val = row_data[col_idx] if col_idx < len(row_data) else ""
            
            _set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            if is_header:
                _set_cell_background(cell, HEADER_BG_HEX)
            elif row_idx % 2 == 1:
                _set_cell_background(cell, LIGHT_BG_HEX)
            else:
                _set_cell_background(cell, "FFFFFF")

            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            
            run = p.add_run(val.strip("*_"))
            run.font.size = Pt(9 if not is_header else 9.5)
            run.font.bold = is_header or ("**" in val)
            run.font.color.rgb = RGBColor(255, 255, 255) if is_header else SECONDARY_COLOR

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
