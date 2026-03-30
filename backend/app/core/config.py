from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

# Load environment variables from .env file
load_dotenv()



from pydantic import field_validator

class Settings(BaseSettings):
    SECRET_KEY: str = "NiTstu26.com"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    DATABASE_URL: str = "postgresql://nit_db_yca1_user:qoECkymDXjpIC4QAXcuyTur0zNkwk4Xc@dpg-d6vavjfkijhs73coa82g-a.singapore-postgres.render.com/nit_db_yca1"
    FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    RENDER_EXTERNAL_URL: str | None = None
    TZ_OFFSET: float = 6.5  # Myanmar timezone by default
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    ENABLE_CACHE: bool = True

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

