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
    """Auto-create admin account from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
    Runs on every startup but only inserts if no admin with that email exists."""
    email = settings.ADMIN_EMAIL
    password = settings.ADMIN_PASSWORD
    if not email or not password:
        return  # no env vars set, skip

    # Import here to avoid circular imports
    from app.models.model import User
    from app.security.password_hashing import hash_password

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalars().first()
        if existing:
            print(f"[seed] Admin {email} already exists, skipping.")
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
        print(f"[seed] ✅ Admin account created: {email}")


async def init_db():
    import app.models.model  # Ensure models are registered with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed admin account if env vars are configured
    await _seed_admin_if_needed()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session