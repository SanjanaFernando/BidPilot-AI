"""
BidPilot AI — Embedding Service (Google Gemini text-embedding-004)
Generates 768-dimensional vectors compatible with our pgvector schema.
"""

import logging
import time
from typing import List, Optional

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import get_settings

logger = logging.getLogger("bidpilot.embedding")

# ---------------------------------------------------------------------------
# Initialise Gemini client once
# ---------------------------------------------------------------------------
_initialised = False


def _ensure_initialised():
    global _initialised
    if not _initialised:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in .env")
        genai.configure(api_key=settings.gemini_api_key)
        _initialised = True


# ---------------------------------------------------------------------------
# Core embedding functions
# ---------------------------------------------------------------------------

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
)
def get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    """
    Generate a single 768-dim embedding using Gemini text-embedding-004.

    task_type options:
      - RETRIEVAL_DOCUMENT  → for chunks being stored
      - RETRIEVAL_QUERY     → for search queries
      - SEMANTIC_SIMILARITY → for general comparison
    """
    _ensure_initialised()
    settings = get_settings()

    # Truncate to ~2000 chars to stay within token limits safely
    text = text[:8000].strip()
    if not text:
        return [0.0] * 768

    # The SDK requires the "models/" prefix
    model_name = settings.gemini_embed_model
    if not model_name.startswith("models/"):
        model_name = f"models/{model_name}"

    kwargs = {
        "model": model_name,
        "content": text,
        "task_type": task_type,
    }
    if "embedding-001" in model_name or "embedding-2" in model_name:
        kwargs["output_dimensionality"] = 768

    result = genai.embed_content(**kwargs)
    return result["embedding"]


def get_query_embedding(query: str) -> List[float]:
    """Embed a search query (uses RETRIEVAL_QUERY task type for better results)."""
    return get_embedding(query, task_type="RETRIEVAL_QUERY")


def get_embeddings_batch(
    texts: List[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
    delay_between: float = 0.1,
) -> List[Optional[List[float]]]:
    """
    Embed a list of texts with a small delay to respect rate limits.
    Returns a list of embeddings (or None on individual failures).
    Free tier: 1500 req/day, 1500 RPM — safe at 10/sec.
    """
    _ensure_initialised()
    embeddings = []
    total = len(texts)

    for i, text in enumerate(texts):
        try:
            emb = get_embedding(text, task_type=task_type)
            embeddings.append(emb)
            logger.info(f"  Embedded chunk {i+1}/{total}")
        except Exception as e:
            logger.warning(f"  Failed to embed chunk {i+1}/{total}: {e}")
            embeddings.append(None)

        if i < total - 1:
            time.sleep(delay_between)

    return embeddings


def check_gemini_health() -> dict:
    """Verify Gemini API is reachable and model is available."""
    try:
        _ensure_initialised()
        settings = get_settings()
        model_name = settings.gemini_embed_model
        if not model_name.startswith("models/"):
            model_name = f"models/{model_name}"

        kwargs = {
            "model": model_name,
            "content": "health check",
            "task_type": "SEMANTIC_SIMILARITY",
        }
        if "embedding-001" in model_name or "embedding-2" in model_name:
            kwargs["output_dimensionality"] = 768

        result = genai.embed_content(**kwargs)
        dims = len(result["embedding"])
        return {"status": "ok", "model": model_name, "dimensions": dims}
    except Exception as e:
        return {"status": "error", "error": str(e)}

