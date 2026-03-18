from app.core.config import settings

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator

engine = create_async_engine(settings.DATABASE_URL)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False
)

Base = declarative_base()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight schema sync for existing DBs (create_all doesn't add columns).
        # Safe for Postgres: IF NOT EXISTS guards against repeated runs.
        await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS start_date VARCHAR"))
        await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS room VARCHAR"))
        await conn.execute(text("ALTER TABLE attendances ADD COLUMN IF NOT EXISTS attendance_date DATE"))
        await conn.execute(text("ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_today BOOLEAN DEFAULT FALSE"))
        await conn.execute(text("ALTER TABLE timetables ADD COLUMN IF NOT EXISTS room_name VARCHAR"))
        await conn.execute(text("ALTER TABLE timetables ADD COLUMN IF NOT EXISTS course_id INTEGER"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS nrc VARCHAR"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT"))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session