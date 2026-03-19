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
import os

@asynccontextmanager
async def life_cycle(app: FastAPI):
    print("Starting the application...")
    await init_db()
    yield
    print("Stopping the application...")

app = FastAPI(lifespan=life_cycle)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(portal_router)
app.include_router(staff_router)

app.add_middleware(AuthMiddleware)

# Build allowed origins: localhost for dev + FRONTEND_URL for Railway
_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_frontend_url = settings.FRONTEND_URL
if _frontend_url and _frontend_url not in _origins:
    _origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-new-token"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

