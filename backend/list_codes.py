import asyncio
import os
from sqlalchemy.future import select
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User

async def list_student_codes():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User.user_code, User.role, User.username).where(User.role == "student").limit(20)
        )
        rows = result.all()
        for r in rows:
            print(f"Code: {r.user_code}, Name: {r.username}")

if __name__ == "__main__":
    asyncio.run(list_student_codes())
