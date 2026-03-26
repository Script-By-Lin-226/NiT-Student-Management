
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def update_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return
    
    # Pre-process asyncpg-compatible URL (usually strip +asyncpg for the lower-level driver or handle it accordingly)
    # asyncpg.connect expects a simple postgresql:// prefix
    url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        conn = await asyncpg.connect(url)
        print("Connected to DB")
        
        # Check and alter courses table
        # Rename exam_fee to exam_fee_gbp if it exists, otherwise add it.
        # But user previously has 'exam_fee' which is MMK. Renaming might be safer but maybe they want to keep it?
        # Let's just add the columns and drop the old one if it exists or just use new ones.
        
        # Adding columns if they don't exist
        print("Adding columns to courses...")
        await conn.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_fee_gbp FLOAT")
        # Optional: try to drop exam_fee if it exists
        # await conn.execute("ALTER TABLE courses DROP COLUMN IF EXISTS exam_fee")
        
        print("Adding columns to payments...")
        await conn.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_paid_gbp FLOAT")
        await conn.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_paid_mmk FLOAT")
        await conn.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_currency VARCHAR DEFAULT 'MMK'")
        await conn.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS fine_reason TEXT")
        
        print("Adding teacher_id to timetables...")
        await conn.execute("ALTER TABLE timetables ADD COLUMN IF NOT EXISTS teacher_id INTEGER")
        # Add foreign key if it doesn't exist (using a try-except in SQL or just ignoring if it fails, or just the column is enough for now)
        try:
             await conn.execute("ALTER TABLE timetables ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE SET NULL")
        except:
             pass

        print("Adding timetable_id to attendances...")
        await conn.execute("ALTER TABLE attendances ADD COLUMN IF NOT EXISTS timetable_id INTEGER")
        try:
             await conn.execute("ALTER TABLE attendances ADD CONSTRAINT fk_attendance_timetable FOREIGN KEY (timetable_id) REFERENCES timetables(timetable_id) ON DELETE SET NULL")
        except:
             pass

        await conn.close()
        print("Database updated successfully")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(update_db())
