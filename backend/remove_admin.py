
import asyncio
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User
from sqlalchemy import delete

async def remove():
    async with AsyncSessionLocal() as session:
        # Check if ID 1 or ADMIN001 exists
        u = await session.get(User, 1)
        if u:
            print(f"Deleting user with ID: {u.user_id}, Code: {u.user_code}")
            await session.delete(u)
            await session.commit()
            print("Successfully deleted first admin.")
        else:
            print("First admin not found.")

if __name__ == "__main__":
    asyncio.run(remove())
