from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.controller.v1.authentication_route import router as auth_router
from app.controller.v1.admin_route import router as admin_router
from app.controller.v1.portal_route import router as portal_router
from app.controller.v1.staff_route import router as staff_router
from app.controller.v1.accounting_route import router as accounting_router
from app.middleware.authentication_middleware import AuthMiddleware
from app.middleware.latency_middleware import LatencyLoggingMiddleware
from starlette.middleware.cors import CORSMiddleware
from app.core.database_initialization import init_db, is_transient_db_error, engine
from app.core.config import settings
from app.security.rate_limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.services.uptime_service import keep_alive_task
from sqlalchemy.exc import DBAPIError
from sqlalchemy import text
import asyncio
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def life_cycle(app: FastAPI):
    from app.core.cache import cache_manager
    logger.info("Starting NiT Student Management API...")
    await init_db()
    await cache_manager.connect()

    # Start the keep-alive background task if RENDER_EXTERNAL_URL is configured
    if settings.RENDER_EXTERNAL_URL:
        asyncio.create_task(keep_alive_task())

    logger.info("API startup complete.")
    yield
    logger.info("Shutting down API...")
    await cache_manager.close()


app = FastAPI(
    lifespan=life_cycle,
    title="NiT Student Management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Attach rate limiter to app state (required by slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(portal_router)
app.include_router(staff_router)
app.include_router(accounting_router)


# Middleware stack (applied in reverse order — last added runs first)
app.add_middleware(LatencyLoggingMiddleware)
app.add_middleware(AuthMiddleware)  # Handles auth + token rotation (single decode per request)

# Build allowed origins: localhost for dev + FRONTEND_URL for Railway
_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://nit-student-management.vercel.app",
    "https://www.nitstu-management.com",
]
_frontend_url = settings.FRONTEND_URL
if _frontend_url and _frontend_url not in _origins:
    _origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-new-token", "X-Request-ID", "X-Process-Time"],
)


@app.exception_handler(DBAPIError)
async def dbapi_exception_handler(request, exc: DBAPIError):
    if is_transient_db_error(exc):
        return JSONResponse(
            status_code=503,
            content={"status_code": 503, "message": "Database temporarily unavailable. Please try again in a moment."},
        )
    return JSONResponse(
        status_code=500,
        content={"status_code": 500, "message": "An unexpected database error occurred."},
    )


@app.get("/")
async def root():
    return {"message": "NiT Student Management API", "status": "running"}


@app.get("/health")
async def health():
    """Deep health check — probes DB and Redis connectivity for Railway."""
    status = {"status": "ok", "db": "unknown", "cache": "unknown"}

    # Probe database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        status["db"] = "ok"
    except Exception as e:
        status["db"] = "error"
        status["status"] = "degraded"
        logger.error(f"Health check DB error: {e}")

    # Probe Redis cache
    try:
        from app.core.cache import cache_manager
        if cache_manager._client:
            await cache_manager._client.ping()
            status["cache"] = "ok"
        else:
            status["cache"] = "in-memory"
    except Exception as e:
        status["cache"] = "error"
        logger.error(f"Health check cache error: {e}")

    http_status = 200 if status["status"] == "ok" else 503
    return JSONResponse(status, status_code=http_status)
