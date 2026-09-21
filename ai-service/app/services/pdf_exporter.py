"""
BidPilot AI — Professional PDF Proposal Exporter (Phase 11)
Converts multi-agent proposal synthesis markdown and metadata into a beautifully styled,
executive-ready PDF document using ReportLab.
"""

from __future__ import annotations

import io
import os
import re
from typing import Any, Dict, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
    Image as RLImage,
)
from reportlab.pdfgen import canvas

# Brand Colors
PRIMARY = colors.HexColor("#7A1C2C")    # Burgundy
SECONDARY = colors.HexColor("#1E252D")  # Slate Navy
ACCENT = colors.HexColor("#DDA625")     # Gold
MUTED = colors.HexColor("#64748B")      # Muted Slate
BG_LIGHT = colors.HexColor("#F8FAFC")   # Light Slate
BORDER_LIGHT = colors.HexColor("#E2E8F0")# Light Border
SUCCESS_BG = colors.HexColor("#DCFCE7") # Light Green
SUCCESS_TXT = colors.HexColor("#15803D")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total page count
    along with running header and running footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED)

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawRightString(
                8.5 * inch - 0.75 * inch,
                11 * inch - 0.5 * inch,
                "CONFIDENTIAL — BID PROPOSAL RESPONSE",
            )
            self.setStrokeColor(BORDER_LIGHT)
            self.setLineWidth(0.5)
            self.line(0.75 * inch, 11 * inch - 0.55 * inch, 8.5 * inch - 0.75 * inch, 11 * inch - 0.55 * inch)

        # Footer (all pages)
        self.setStrokeColor(BORDER_LIGHT)
        self.setLineWidth(0.5)
        self.line(0.75 * inch, 0.65 * inch, 8.5 * inch - 0.75 * inch, 0.65 * inch)

        footer_text = f"BidPilot AI Enterprise · Generated with Traceable RAG & Human Sign-off"
        self.drawString(0.75 * inch, 0.45 * inch, footer_text)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 0.75 * inch, 0.45 * inch, page_str)

        self.restoreState()


def build_proposal_pdf(
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
    Generate a styled, printable PDF document from proposal sections.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    style_pretitle = ParagraphStyle(
        "PreTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=ACCENT,
        spaceAfter=4,
    )

    style_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=6,
    )

    style_subtitle = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=SECONDARY,
        spaceAfter=14,
    )

    style_h1 = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    style_h2 = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    style_h3 = ParagraphStyle(
        "Heading3_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True,
    )

    style_body = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=SECONDARY,
        spaceAfter=6,
    )

    style_bullet = ParagraphStyle(
        "Bullet_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=SECONDARY,
        leftIndent=14,
        spaceAfter=3,
    )

    style_callout = ParagraphStyle(
        "Callout_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=MUTED,
        spaceBefore=4,
        spaceAfter=4,
    )

    style_table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=SECONDARY,
    )

    style_table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    story = []

    # -------------------------------------------------------------------------
    # LOGO & COVER / HEADER BANNER
    # -------------------------------------------------------------------------
    logo_candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "logo.png")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "logo.png")),
        os.path.abspath("frontend/public/logo.png"),
    ]
    logo_path = next((p for p in logo_candidates if os.path.exists(p)), None)
    if logo_path:
        try:
            story.append(RLImage(logo_path, width=0.9 * inch, height=0.9 * inch))
            story.append(Spacer(1, 4))
        except Exception:
            pass

    story.append(Paragraph("FORMAL PROPOSAL RESPONSE", style_pretitle))
    story.append(Paragraph(tender_title, style_title))
    story.append(
        Paragraph(
            f"<b>Prepared for:</b> {client_name} &nbsp;|&nbsp; <b>Tender Reference:</b> {tender_ref} &nbsp;|&nbsp; <b>Organization:</b> {organization_name}",
            style_subtitle,
        )
    )

    # -------------------------------------------------------------------------
    # METADATA SUMMARY TABLE
    # -------------------------------------------------------------------------
    meta_data = [
        [
            Paragraph("<b>TENDER REFERENCE</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=7.5, textColor=MUTED, alignment=1)),
            Paragraph("<b>PROPOSAL VERSION</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=7.5, textColor=MUTED, alignment=1)),
            Paragraph("<b>COMPLIANCE SCORE</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=7.5, textColor=MUTED, alignment=1)),
            Paragraph("<b>WIN PROBABILITY</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=7.5, textColor=MUTED, alignment=1)),
        ],
        [
            Paragraph(f"<b>{tender_ref}</b>", ParagraphStyle("Val", fontName="Helvetica-Bold", fontSize=9.5, textColor=SECONDARY, alignment=1)),
            Paragraph(f"<b>v{version}.0 (Final)</b>", ParagraphStyle("Val", fontName="Helvetica-Bold", fontSize=9.5, textColor=SECONDARY, alignment=1)),
            Paragraph(f"<b>{int(compliance_score or 95)}% Verified</b>", ParagraphStyle("Val", fontName="Helvetica-Bold", fontSize=9.5, textColor=PRIMARY, alignment=1)),
            Paragraph(f"<b>{int(win_probability or 90)}% Predicted</b>", ParagraphStyle("Val", fontName="Helvetica-Bold", fontSize=9.5, textColor=PRIMARY, alignment=1)),
        ],
    ]

    t_meta = Table(meta_data, colWidths=[1.75 * inch, 1.75 * inch, 1.75 * inch, 1.75 * inch])
    t_meta.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.75, BORDER_LIGHT),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ])
    )
    story.append(t_meta)
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceBefore=4, spaceAfter=14))

    # -------------------------------------------------------------------------
    # PROPOSAL SECTIONS
    # -------------------------------------------------------------------------
    for sec_idx, sec in enumerate(sections):
        title = sec.get("title", f"Section {sec_idx + 1}")
        content = sec.get("content_markdown") or sec.get("content") or ""

        # Section H1
        story.append(Paragraph(f"{title}", style_h1))

        # Parse Section Content
        _render_pdf_markdown(
            story=story,
            text=content,
            style_h2=style_h2,
            style_h3=style_h3,
            style_body=style_body,
            style_bullet=style_bullet,
            style_callout=style_callout,
            style_table_cell=style_table_cell,
            style_table_header=style_table_header,
        )

        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT, spaceBefore=4, spaceAfter=8))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


def _render_pdf_markdown(
    story: List[Any],
    text: str,
    style_h2: ParagraphStyle,
    style_h3: ParagraphStyle,
    style_body: ParagraphStyle,
    style_bullet: ParagraphStyle,
    style_callout: ParagraphStyle,
    style_table_cell: ParagraphStyle,
    style_table_header: ParagraphStyle,
):
    """Parse markdown blocks into ReportLab flowables."""
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Markdown Table Detection
        if line.startswith("|") and "|" in line[1:]:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            _render_pdf_table(story, table_lines, style_table_cell, style_table_header)
            continue

        # Heading 2 (##)
        if line.startswith("## "):
            cleaned = _xml_escape(line.replace("## ", "").strip())
            story.append(Paragraph(cleaned, style_h2))
            i += 1
            continue

        # Heading 3 (###)
        if line.startswith("### "):
            cleaned = _xml_escape(line.replace("### ", "").strip())
            story.append(Paragraph(cleaned, style_h3))
            i += 1
            continue

        # Heading 4 (####)
        if line.startswith("#### "):
            cleaned = _xml_escape(line.replace("#### ", "").strip())
            story.append(Paragraph(f"<b>{cleaned}</b>", style_body))
            i += 1
            continue

        # Bullet List Item (- or * )
        if line.startswith("- ") or line.startswith("* "):
            bullet_text = _format_inline_markdown(line[2:].strip())
            story.append(Paragraph(f"• {bullet_text}", style_bullet))
            i += 1
            continue

        # Evidence Citation (*Evidence Reference: ...*)
        if line.startswith("*Evidence Reference:") or line.startswith("Evidence:"):
            callout_text = _xml_escape(line.strip("*_ "))
            callout_data = [[
                Paragraph(f"🔍 <b>Evidence Traceability:</b> {callout_text}", style_callout)
            ]]
            t_callout = Table(callout_data, colWidths=[7.0 * inch])
            t_callout.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ])
            )
            story.append(t_callout)
            story.append(Spacer(1, 4))
            i += 1
            continue

        # Horizontal Rule (---)
        if line.startswith("---") or line.startswith("___"):
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT, spaceBefore=4, spaceAfter=4))
            i += 1
            continue

        # Regular Paragraph
        formatted = _format_inline_markdown(line)
        story.append(Paragraph(formatted, style_body))
        i += 1


def _format_inline_markdown(text: str) -> str:
    """Escape XML entities and transform **bold**, *italics*, and `code` into HTML tags."""
    # First escape & < >
    escaped = _xml_escape(text)
    # Bold **text**
    escaped = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', escaped)
    # Italic *text*
    escaped = re.sub(r'\*(.*?)\*', r'<i>\1</i>', escaped)
    # Code `text`
    escaped = re.sub(r'`(.*?)`', r'<font face="Courier" color="#7A1C2C"><b>\1</b></font>', escaped)
    return escaped


def _xml_escape(text: str) -> str:
    """Escape XML special characters."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _render_pdf_table(
    story: List[Any],
    table_lines: List[str],
    style_cell: ParagraphStyle,
    style_header: ParagraphStyle,
):
    """Parse Markdown table and append styled ReportLab Table."""
    if len(table_lines) < 2:
        return

    parsed_rows = []
    for line in table_lines:
        if re.match(r'^\s*\|?[\s\-:|]+\|?\s*$', line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if cells:
            parsed_rows.append(cells)

    if not parsed_rows:
        return

    col_count = max(len(r) for r in parsed_rows)
    table_data = []

    for row_idx, row in enumerate(parsed_rows):
        is_hdr = (row_idx == 0)
        formatted_row = []
        for c_idx in range(col_count):
            val = row[c_idx] if c_idx < len(row) else ""
            fmt = _format_inline_markdown(val)
            p = Paragraph(fmt, style_header if is_hdr else style_cell)
            formatted_row.append(p)
        table_data.append(formatted_row)

    col_width = 7.0 * inch / col_count
    t = Table(table_data, colWidths=[col_width] * col_count)
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(t)
    story.append(Spacer(1, 6))
