from app.core.config import settings

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, select
from typing import AsyncGenerator
from datetime import datetime

engine = create_async_engine(settings.DATABASE_URL)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False
)

Base = declarative_base()


async def _seed_admin_if_needed():
    """Auto-create admin account if none exists with that code or email."""
    email = settings.ADMIN_EMAIL
    password = settings.ADMIN_PASSWORD
    if not email or not password: return

    from app.models.model import User
    from app.security.password_hashing import hash_password
    from sqlalchemy import or_

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(or_(User.email == email, User.user_code == "ADMIN001"))
        )
        if result.scalars().first():
            return

        hashed = await hash_password(password)
        admin = User(
            user_code="ADMIN001",
            username="Administrator",
            email=email,
            password_hash=hashed,
            data_of_birth=datetime(2000, 1, 1),
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f"[seed] ✅ Created admin: {email}")


async def init_db():
    import app.models.model
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_admin_if_needed()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session