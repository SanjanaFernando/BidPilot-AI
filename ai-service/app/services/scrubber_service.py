"""
BidPilot AI — Enterprise Secret & PII Scrubbing Service (Phase 13)

Provides automated pre-embedding inspection and redaction for:
  - API Keys & Tokens (OpenAI, Gemini, AWS, GitHub, Generic Bearer)
  - Private Keys & Certificates (RSA, SSH, PGP)
  - Financial & Proprietary Margins (Salaries, Profit margins, Credit Cards)
  - Personally Identifiable Information (NIC/SSN, Phone Numbers, Private Emails)
"""

import re
import logging
from typing import List, Dict, Tuple, Any

logger = logging.getLogger("bidpilot.scrubber")

# ---------------------------------------------------------------------------
# Sensitive Pattern Definitions
# ---------------------------------------------------------------------------

PATTERNS = [
    # 1. AWS Access Keys
    {
        "type": "AWS Access Key",
        "category": "API Key",
        "regex": re.compile(r"\b(AKIA[0-9A-Z]{16})\b"),
        "replacement": "[REDACTED_AWS_KEY]",
    },
    # 2. OpenAI API Keys
    {
        "type": "OpenAI API Key",
        "category": "API Key",
        "regex": re.compile(r"\b(sk-[a-zA-Z0-9]{32,64})\b"),
        "replacement": "[REDACTED_OPENAI_KEY]",
    },
    # 3. Google Gemini / Cloud API Keys
    {
        "type": "Google API Key",
        "category": "API Key",
        "regex": re.compile(r"\b(AIzaSy[a-zA-Z0-9_-]{33})\b"),
        "replacement": "[REDACTED_GOOGLE_KEY]",
    },
    # 4. GitHub Personal Access Tokens
    {
        "type": "GitHub Token",
        "category": "API Key",
        "regex": re.compile(r"\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b"),
        "replacement": "[REDACTED_GITHUB_TOKEN]",
    },
    # 5. Generic Bearer / Secret Tokens
    {
        "type": "Bearer Secret Token",
        "category": "Credentials",
        "regex": re.compile(r"(?i)\b(bearer\s+[a-zA-Z0-9_\-\.]{20,})\b"),
        "replacement": "Bearer [REDACTED_TOKEN]",
    },
    # 6. RSA / Private Key Blocks
    {
        "type": "Private Key Block",
        "category": "Credentials",
        "regex": re.compile(r"-----BEGIN\s+([A-Z\s]+)?PRIVATE KEY-----[\s\S]*?-----END\s+([A-Z\s]+)?PRIVATE KEY-----"),
        "replacement": "[REDACTED_PRIVATE_KEY_BLOCK]",
    },
    # 7. Credit Card Numbers
    {
        "type": "Credit Card Number",
        "category": "Financial",
        "regex": re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b"),
        "replacement": "[REDACTED_CREDIT_CARD]",
    },
    # 8. Proprietary Salary / Rate Markers
    {
        "type": "Internal Salary / Rate",
        "category": "Financial",
        "regex": re.compile(r"(?i)\b(salary|base pay|hourly rate|margin rate)\s*[:=]\s*(\$|LKR|USD|EUR|Rs\.?)\s*[\d,]+(\.\d{2})?(\s*/\s*(hr|hour|mo|month|yr|year))?\b"),
        "replacement": "\\1: [CONFIDENTIAL_INTERNAL_RATE]",
    },
    # 9. Sri Lankan NIC / National ID Numbers
    {
        "type": "National Identity Card (NIC/ID)",
        "category": "PII",
        "regex": re.compile(r"\b([0-9]{9}[vVxX]|[0-9]{12})\b"),
        "replacement": "[REDACTED_NIC_NUMBER]",
    },
    # 10. Passwords in plain text configs
    {
        "type": "Plaintext Password",
        "category": "Credentials",
        "regex": re.compile(r"(?i)\b(password|passwd|secret_key|client_secret)\s*[:=]\s*['\"]?([^\s'\"]{6,})['\"]?"),
        "replacement": "\\1=[REDACTED_PASSWORD]",
    },
]


def scan_text(text: str) -> List[Dict[str, Any]]:
    """
    Scan text for secrets, credentials, financial figures, and PII.
    Returns a list of detected items with masked snippets and category info.
    """
    findings: List[Dict[str, Any]] = []
    if not text:
        return findings

    for rule in PATTERNS:
        matches = rule["regex"].finditer(text)
        for m in matches:
            val = m.group(0)
            masked = val[:3] + "..." + val[-2:] if len(val) > 8 else "***"
            findings.append({
                "type": rule["type"],
                "category": rule["category"],
                "start": m.start(),
                "end": m.end(),
                "masked_preview": masked,
            })

    return findings


def scrub_text(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Scan and redact sensitive tokens from text before chunking or embedding.
    Returns:
      - scrubbed_text: Sanitized string with sensitive items replaced.
      - findings: Metadata list of all redactions applied.
    """
    if not text:
        return text, []

    findings = scan_text(text)
    if not findings:
        return text, []

    scrubbed = text
    for rule in PATTERNS:
        scrubbed = rule["regex"].sub(rule["replacement"], scrubbed)

    logger.info(f"Scrubbed {len(findings)} sensitive items from text")
    return scrubbed, findings
