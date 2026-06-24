from app.core.config import settings

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, select
from sqlalchemy.exc import DBAPIError, DisconnectionError, OperationalError
from typing import AsyncGenerator
from datetime import datetime
import asyncpg
from asyncpg.exceptions import (
    ConnectionDoesNotExistError,
    InterfaceError as AsyncpgInterfaceError,
    PostgresConnectionError,
)


def is_transient_db_error(exc: Exception) -> bool:
    """Return True for errors that usually indicate a temporary database disconnect."""
    if isinstance(exc, (ConnectionResetError, DisconnectionError, OperationalError, DBAPIError)):
        return True

    if isinstance(exc, (ConnectionDoesNotExistError, PostgresConnectionError, AsyncpgInterfaceError)):
        return True

    cause = getattr(exc, "orig", None)
    if cause is not None and is_transient_db_error(cause):
        return True

    return False


engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
)

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


async def _seed_accounts_if_needed():
    """Auto-create Chart of Accounts if none exists."""
    from app.models.model import Account
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Account).limit(1))
        if result.scalars().first():
            return

        default_accounts = [
            # Assets
            {"account_name": "Cash in Hand (MMK)", "account_type": "Asset", "currency": "MMK"},
            {"account_name": "CB Bank (MMK)", "account_type": "Asset", "currency": "MMK"},
            {"account_name": "KBZ Bank (MMK)", "account_type": "Asset", "currency": "MMK"},
            {"account_name": "Petty Cash (MMK)", "account_type": "Asset", "currency": "MMK"},
            {"account_name": "Cash/Bank (GBP)", "account_type": "Asset", "currency": "GBP"},
            
            # Revenue
            {"account_name": "Tuition Revenue (MMK)", "account_type": "Revenue", "currency": "MMK"},
            {"account_name": "Exam Fees Revenue (MMK)", "account_type": "Revenue", "currency": "MMK"},
            {"account_name": "Exam Fees Revenue (GBP)", "account_type": "Revenue", "currency": "GBP"},
            {"account_name": "Fine Revenue (MMK)", "account_type": "Revenue", "currency": "MMK"},
            {"account_name": "Extra Items Revenue (MMK)", "account_type": "Revenue", "currency": "MMK"},
            
            # Expenses
            {"account_name": "Utilities Expense (MMK)", "account_type": "Expense", "currency": "MMK"},
            {"account_name": "Maintenance Expense (MMK)", "account_type": "Expense", "currency": "MMK"},
            {"account_name": "Salary Expense (MMK)", "account_type": "Expense", "currency": "MMK"},
            {"account_name": "Petty Cash Expense (MMK)", "account_type": "Expense", "currency": "MMK"},
            {"account_name": "General & Admin Expense (MMK)", "account_type": "Expense", "currency": "MMK"},
            {"account_name": "Marketing Expense (MMK)", "account_type": "Expense", "currency": "MMK"}
        ]
        
        for acc_data in default_accounts:
            acc = Account(
                account_name=acc_data["account_name"],
                account_type=acc_data["account_type"],
                currency=acc_data["currency"],
                is_active=True
            )
            session.add(acc)
        await session.commit()
        print("[seed] ✅ Created default Chart of Accounts")


async def init_db():
    import app.models.model
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_admin_if_needed()
    await _seed_accounts_if_needed()



async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as exc:
            if is_transient_db_error(exc):
                await session.rollback()
                raise HTTPException(
                    status_code=503,
                    detail="Database temporarily unavailable. Please try again in a moment.",
                ) from exc
            raise