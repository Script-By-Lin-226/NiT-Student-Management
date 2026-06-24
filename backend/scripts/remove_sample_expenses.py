import os
import sys
import asyncio

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from app.core.database_initialization import get_db, init_db
from app.models.model import Expense

async def main():
    await init_db()
    db_gen = get_db()
    session = await db_gen.__anext__()
    try:
        q = delete(Expense).where(Expense.title == "Office Desk Utility Bill")
        result = await session.execute(q)
        await session.commit()
        print(f"Successfully deleted {result.rowcount} sample expense(s) from the database.")
    except Exception as e:
        print(f"Error deleting sample expenses: {e}")
        await session.rollback()
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(main())
