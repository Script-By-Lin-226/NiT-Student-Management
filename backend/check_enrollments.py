import asyncio
from sqlalchemy.future import select
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User, Enrollment

async def check():
    async with AsyncSessionLocal() as session:
        # Check enrollments
        res = await session.execute(select(Enrollment.enrollment_code).limit(5))
        for r in res:
            print(f"Enrollment Code: {r.enrollment_code}")

if __name__ == "__main__":
    asyncio.run(check())
