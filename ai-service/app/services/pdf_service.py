"""
BidPilot AI — PDF Extraction & Chunking Service
Uses pdfplumber for accurate text extraction with page metadata.
Applies sliding-window chunking preserving page and section context.
"""

import io
import re
import logging
from dataclasses import dataclass, field
from typing import List, Optional

import pdfplumber

logger = logging.getLogger("bidpilot.pdf")

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class PageContent:
    page_number: int        # 1-indexed
    raw_text: str
    char_count: int = 0

    def __post_init__(self):
        self.char_count = len(self.raw_text)


@dataclass
class DocumentChunk:
    text: str
    page_number: int
    chunk_index: int
    section_hint: str = ""
    char_count: int = 0
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        self.char_count = len(self.text)


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def extract_pages(file_bytes: bytes) -> List[PageContent]:
    """
    Extract text from each page of a PDF using pdfplumber.
    Returns a list of PageContent objects (1-indexed pages).
    """
    pages: List[PageContent] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        logger.info(f"PDF has {len(pdf.pages)} pages")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            text = clean_text(text)
            if text.strip():
                pages.append(PageContent(page_number=i + 1, raw_text=text))

    logger.info(f"Extracted text from {len(pages)} non-empty pages")
    return pages


def clean_text(text: str) -> str:
    """Normalise whitespace and remove common PDF artefacts."""
    # Remove null bytes
    text = text.replace("\x00", "")
    # Collapse multiple blank lines → single blank line
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple spaces
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    return text.strip()


# ---------------------------------------------------------------------------
# Section detection
# ---------------------------------------------------------------------------

SECTION_PATTERNS = [
    re.compile(r"^(\d+\.[\d\.]*\s+[A-Z][^\n]{3,60})$", re.MULTILINE),  # 1.2 Title
    re.compile(r"^(SECTION\s+\d+[^\n]{0,60})$", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^([A-Z][A-Z\s]{5,50})$", re.MULTILINE),               # ALL CAPS HEADING
]

def detect_section(text: str) -> str:
    """Extract the most likely section heading from a block of text."""
    for pattern in SECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(1).strip()[:120]
    return ""


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

CHUNK_SIZE_CHARS = 1200     # ~300 tokens — comfortable for embedding
CHUNK_OVERLAP_CHARS = 200   # ~50 tokens overlap for context continuity


def chunk_pages(
    pages: List[PageContent],
    document_id: str,
    tender_id: str,
    organization_id: str,
) -> List[DocumentChunk]:
    """
    Split pages into overlapping chunks with metadata.
    Each chunk carries: page_number, section_hint, tender_id, document_id, org_id.
    """
    chunks: List[DocumentChunk] = []
    chunk_index = 0

    for page in pages:
        text = page.raw_text
        page_num = page.page_number
        section = detect_section(text)

        # Walk through the page text with a sliding window
        start = 0
        while start < len(text):
            end = start + CHUNK_SIZE_CHARS
            chunk_text = text[start:end].strip()

            if len(chunk_text) < 50:
                # Too short to be useful
                break

            chunks.append(
                DocumentChunk(
                    text=chunk_text,
                    page_number=page_num,
                    chunk_index=chunk_index,
                    section_hint=section,
                    metadata={
                        "document_id": document_id,
                        "tender_id": tender_id,
                        "organization_id": organization_id,
                        "page": page_num,
                        "section": section,
                    },
                )
            )
            chunk_index += 1

            if end >= len(text):
                break
            start = end - CHUNK_OVERLAP_CHARS  # overlap

    logger.info(f"Produced {len(chunks)} chunks from {len(pages)} pages")
    return chunks


# ---------------------------------------------------------------------------
# High-level pipeline step
# ---------------------------------------------------------------------------

def process_pdf(
    file_bytes: bytes,
    document_id: str,
    tender_id: str,
    organization_id: str,
) -> tuple[List[PageContent], List[DocumentChunk]]:
    """
    Full pipeline: extract → clean → chunk.
    Returns (pages, chunks).
    """
    pages = extract_pages(file_bytes)
    chunks = chunk_pages(pages, document_id, tender_id, organization_id)
    return pages, chunks
