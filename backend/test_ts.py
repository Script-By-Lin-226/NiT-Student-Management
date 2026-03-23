import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

async def run():
    db_url = os.getenv("DATABASE_URL")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        print(f"Current System Time: {datetime.now()}")
        # Check database time
        res = await conn.execute(text("SELECT now()"))
        db_now = res.scalar()
        print(f"Database now(): {db_now}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
