import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("latency_logger")

class LatencyLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000  # in ms
        
        # Log slow requests (> 500ms)
        if process_time > 500:
            logger.warning(
                f"Slow Request: {request.method} {request.url.path} - {process_time:.2f}ms"
            )
        else:
            logger.info(
                f"Request: {request.method} {request.url.path} - {process_time:.2f}ms"
            )
            
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        return response
