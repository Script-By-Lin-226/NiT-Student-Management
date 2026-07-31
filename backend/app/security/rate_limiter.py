"""
Rate Limiter
============
Uses slowapi backed by Redis when available (falls back to in-memory).
Redis-backed limiting is shared across all Gunicorn workers — critical for
correctness when running multiple processes on Railway.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    # Redis backend makes limits accurate across all Gunicorn workers.
    # Falls back to in-memory if the URL is empty/unavailable.
    storage_uri=settings.REDIS_URL if settings.REDIS_URL else None,
    default_limits=["200/minute"],   # Global fallback limit per IP
)
