from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.controller.v1.authentication_route import router as auth_router
from app.controller.v1.admin_route import router as admin_router
from app.controller.v1.portal_route import router as portal_router
from app.controller.v1.staff_route import router as staff_router
from app.middleware.authentication_middleware import AuthMiddleware
from starlette.middleware.cors import CORSMiddleware
from app.core.database_initialization import init_db
from app.core.config import settings
from app.security.rate_limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.services.uptime_service import keep_alive_task
import os
import asyncio

@asynccontextmanager
async def life_cycle(app: FastAPI):
    print("Starting the application...")
    await init_db()
    
    # Start the keep-alive background task if RENDER_EXTERNAL_URL is configured
    if settings.RENDER_EXTERNAL_URL:
        asyncio.create_task(keep_alive_task())
    
    yield
    print("Stopping the application...")

app = FastAPI(lifespan=life_cycle)

# Attach rate limiter to app state (required by slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(portal_router)
app.include_router(staff_router)

app.add_middleware(AuthMiddleware)

# Build allowed origins: localhost for dev + FRONTEND_URL for Railway
_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://nit-student-management.vercel.app"
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
    expose_headers=["x-new-token"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
def health():
    return {"status": "ok"}

