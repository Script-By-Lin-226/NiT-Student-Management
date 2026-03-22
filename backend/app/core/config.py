from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

# Load environment variables from .env file
load_dotenv()



from pydantic import field_validator

class Settings(BaseSettings):
    SECRET_KEY: str = "your_secret_key_here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    DATABASE_URL: str = "postgresql://nit_db_yca1_user:qoECkymDXjpIC4QAXcuyTur0zNkwk4Xc@dpg-d6vavjfkijhs73coa82g-a.singapore-postgres.render.com/nit_db_yca1"
    FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_EMAIL: str = "NiT@gmail.com"
    ADMIN_PASSWORD: str = "NiT@2026"
    RENDER_EXTERNAL_URL: str | None = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str | None) -> str:
        if not v:
            return ""
        # Railway/Render provides postgresql:// but asyncpg needs +asyncpg
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

settings = Settings()

