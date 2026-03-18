from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your_secret_key_here")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))
    DATABASE_URL: str = os.getenv("DATABASE_URL")

settings = Settings()