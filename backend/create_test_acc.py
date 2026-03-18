import asyncio
from datetime import datetime
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User
from app.services.admin_panel import _next_student_code
from app.security.password_hashing import hash_password
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as session:
        # Check if exists
        res = await session.execute(select(User).where(User.email == "test_student@gmail.com"))
        if res.scalars().first():
            print("Student test_student@gmail.com already exists.")
            return

        user_code = await _next_student_code(session)
        hashed = await hash_password("password123")
        dob = datetime(2000, 1, 1)

        new_user = User(
            user_code=user_code,
            username="test_student",
            email="test_student@gmail.com",
            password_hash=hashed,
            data_of_birth=dob,
            role="student",
            is_active=True
        )
        session.add(new_user)
        await session.commit()
        print("Created student: test_student@gmail.com / password123")

if __name__ == "__main__":
    asyncio.run(run())
