from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import select, text
import asyncio
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import sys

# Ensure backend/ (current folder) is in path
sys.path.append(os.getcwd())

load_dotenv()

async def check_logs():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return
    # add +asyncpg if missing
    if db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
        
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        from app.models.model import ActivityLog
        result = await conn.execute(select(ActivityLog).order_by(ActivityLog.log_id.desc()).limit(1))
        row = result.first()
        if row:
            print(f"Log ID: {row.log_id}")
            print(f"Log Time (Database): {row.timestamp}")
            print(f"Current UTC: {datetime.now(timezone.utc)}")
            print(f"Current Local: {datetime.now()}")
        else:
            # Let's create a dummy log to test
            print("No logs found. Creating a dummy log...")
            # We need a user_id
            user_result = await conn.execute(text("SELECT user_id FROM users LIMIT 1"))
            user_id = user_result.scalar()
            if user_id:
                now_val = datetime.now()
                await conn.execute(text("INSERT INTO activity_logs (user_id, action, details, timestamp) VALUES (:u, 'Check Timezone', 'Test Log', :t)"), {"u": user_id, "t": now_val})
                await conn.commit()
                print(f"Added log with timestamp: {now_val}")
            else:
                print("No users found to create log")

if __name__ == "__main__":
    asyncio.run(check_logs())
