"""
BidPilot AI Service — Rate Limiter Middleware (Phase 16)

Token-bucket rate limiting per organization using Upstash Redis.
Falls back gracefully if Redis is not configured (development mode).
"""

import logging
import time
from typing import Optional

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("bidpilot.rate_limiter")

# ---------------------------------------------------------------------------
# Configuration defaults (override via env vars)
# ---------------------------------------------------------------------------
MAX_REQUESTS_PER_HOUR = 200       # per org_id
MAX_AI_REQUESTS_PER_HOUR = 50     # for /agents/* endpoints (LLM calls)
RATE_LIMIT_WINDOW_SECONDS = 3600  # 1 hour


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Token-bucket rate limiter keyed by org_id extracted from request headers.

    Limits:
      - 200 total requests / hour per org
      - 50 AI agent requests / hour per org (paths starting with /agents)

    If Redis (Upstash) is unavailable, the middleware skips limiting and
    logs a warning — this prevents a Redis outage from taking down the API.
    """

    def __init__(self, app, redis_url: Optional[str] = None, redis_token: Optional[str] = None):
        super().__init__(app)
        self.redis_client = None
        self._init_redis(redis_url, redis_token)

    def _init_redis(self, redis_url: Optional[str], redis_token: Optional[str]):
        """Attempt to connect to Upstash Redis. Fails silently in dev."""
        if not redis_url:
            logger.info("Rate limiter: UPSTASH_REDIS_REST_URL not set — rate limiting disabled (dev mode).")
            return
        try:
            # Using httpx-based Upstash REST client (no extra deps needed)
            import httpx
            # Test connection
            response = httpx.get(
                f"{redis_url}/ping",
                headers={"Authorization": f"Bearer {redis_token}"},
                timeout=3.0,
            )
            if response.status_code == 200:
                self.redis_url = redis_url
                self.redis_token = redis_token
                logger.info("Rate limiter: Connected to Upstash Redis.")
            else:
                logger.warning(f"Rate limiter: Upstash ping failed ({response.status_code}) — disabled.")
        except Exception as exc:
            logger.warning(f"Rate limiter: Could not connect to Redis: {exc} — disabled.")

    def _redis_incr(self, key: str, window: int) -> Optional[int]:
        """
        Atomically increment a counter key with TTL using Upstash REST API.
        Returns the new count, or None on failure.
        """
        if not hasattr(self, "redis_url"):
            return None
        try:
            import httpx
            headers = {"Authorization": f"Bearer {self.redis_token}"}
            base = self.redis_url

            # INCR
            r = httpx.post(f"{base}/incr/{key}", headers=headers, timeout=2.0)
            count = r.json().get("result", 1)

            # EXPIRE (set TTL only on first request — count == 1)
            if count == 1:
                httpx.post(f"{base}/expire/{key}/{window}", headers=headers, timeout=2.0)

            return int(count)
        except Exception as exc:
            logger.warning(f"Rate limiter Redis error: {exc}")
            return None

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip health and docs endpoints
        path = request.url.path
        if path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        # Extract org_id from header (set by RBAC middleware) or skip
        org_id = request.headers.get("X-Org-Id") or request.headers.get("x-org-id")
        if not org_id:
            return await call_next(request)

        # --- Global limit ---
        hour_slot = int(time.time()) // RATE_LIMIT_WINDOW_SECONDS
        global_key = f"rl:global:{org_id}:{hour_slot}"
        global_count = self._redis_incr(global_key, RATE_LIMIT_WINDOW_SECONDS)

        if global_count is not None and global_count > MAX_REQUESTS_PER_HOUR:
            logger.warning(f"Rate limit exceeded (global) for org {org_id}: {global_count}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": f"Organization has exceeded {MAX_REQUESTS_PER_HOUR} requests/hour. Please try again later.",
                    "limit": MAX_REQUESTS_PER_HOUR,
                    "current": global_count,
                    "reset_in_seconds": RATE_LIMIT_WINDOW_SECONDS - (int(time.time()) % RATE_LIMIT_WINDOW_SECONDS),
                },
                headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
            )

        # --- AI-specific limit (agents/* paths) ---
        if path.startswith("/agents"):
            ai_key = f"rl:ai:{org_id}:{hour_slot}"
            ai_count = self._redis_incr(ai_key, RATE_LIMIT_WINDOW_SECONDS)

            if ai_count is not None and ai_count > MAX_AI_REQUESTS_PER_HOUR:
                logger.warning(f"Rate limit exceeded (AI) for org {org_id}: {ai_count}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "ai_rate_limit_exceeded",
                        "message": f"Organization has exceeded {MAX_AI_REQUESTS_PER_HOUR} AI agent requests/hour.",
                        "limit": MAX_AI_REQUESTS_PER_HOUR,
                        "current": ai_count,
                        "reset_in_seconds": RATE_LIMIT_WINDOW_SECONDS - (int(time.time()) % RATE_LIMIT_WINDOW_SECONDS),
                    },
                    headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
                )

        # Add rate limit headers to successful responses
        response = await call_next(request)
        if global_count is not None:
            response.headers["X-RateLimit-Limit"] = str(MAX_REQUESTS_PER_HOUR)
            response.headers["X-RateLimit-Remaining"] = str(max(0, MAX_REQUESTS_PER_HOUR - global_count))
        return response
