
import asyncio
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.user_code == "ADMIN001"))
        u = res.scalars().first()
        if u:
            print(f"ID: {u.user_id}, Code: {u.user_code}, Username: {u.username}, Email: {u.email}, Role: {u.role}")
        else:
            print("ADMIN001 not found")

if __name__ == "__main__":
    asyncio.run(check())
