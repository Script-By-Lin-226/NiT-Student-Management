from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "NiTstu26.com"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 129600   # 90 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 180         # 180 days

    # Rotate access token proactively when <N seconds remain (default 5 min)
    TOKEN_ROTATE_THRESHOLD: int = 300

    # Bind JWT to originating IP (set True only if behind a stable reverse proxy)
    ENABLE_IP_BINDING: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = ""

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    ENABLE_CACHE: bool = True

    # ── App / Deployment ──────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    RENDER_EXTERNAL_URL: str | None = None
    TZ_OFFSET: float = 6.5          # Myanmar timezone (UTC+6:30)

    # ── Server ────────────────────────────────────────────────────────────────
    # Number of Gunicorn worker processes (set via env on Railway)
    WORKER_CONCURRENCY: int = 4
    LOG_LEVEL: str = "INFO"

    # ── Middleware ─────────────────────────────────────────────────────────────
    # Paths that bypass authentication checks
    EXCLUDED_PATHS: list[str] = [
        "/auth/login",
        "/auth/register",
        "/auth/courses",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/favicon.ico",
        "/register",
        "/health",
        "/",
    ]

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str | None) -> str:
        if not v:
            return ""
        # Railway/Render provide postgresql:// but asyncpg needs +asyncpg driver
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
