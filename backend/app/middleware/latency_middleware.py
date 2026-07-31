"""
Latency Logging Middleware
==========================
Logs every request with structured fields including:
- method, path, status code, latency (ms)
- request_id (injected by AuthMiddleware)
- Adds X-Process-Time response header
"""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api.latency")

# Threshold in ms above which a request is logged as WARNING
SLOW_THRESHOLD_MS = 500


class LatencyLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        latency_ms = (time.perf_counter() - start_time) * 1000

        request_id = getattr(request.state, "request_id", "-")
        status_code = response.status_code
        method = request.method
        path = request.url.path

        log_data = {
            "request_id": request_id,
            "method": method,
            "path": path,
            "status": status_code,
            "latency_ms": round(latency_ms, 2),
        }

        if latency_ms > SLOW_THRESHOLD_MS:
            logger.warning(
                f"SLOW {method} {path} | {status_code} | {latency_ms:.2f}ms | rid={request_id}"
            )
        else:
            logger.info(
                f"{method} {path} | {status_code} | {latency_ms:.2f}ms | rid={request_id}"
            )

        response.headers["X-Process-Time"] = f"{latency_ms:.2f}ms"
        return response
