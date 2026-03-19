from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

# Load environment variables from .env file
load_dotenv()

def _fix_db_url(url: str | None) -> str:
    """Railway provides DATABASE_URL as postgresql://, asyncpg needs postgresql+asyncpg://"""
    if not url:
        return ""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your_secret_key_here")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))
    DATABASE_URL: str = _fix_db_url(os.getenv("DATABASE_URL"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    # Auto-seed admin account on first startup (set in Railway env vars)
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

settings = Settings()
