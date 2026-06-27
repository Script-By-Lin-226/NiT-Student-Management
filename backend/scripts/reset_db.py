import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to system path
sys.path.append(os.path.join(os.getcwd(), "backend"))
sys.path.append(os.getcwd())

from app.core.database_initialization import engine, Base, AsyncSessionLocal, _seed_admin_if_needed, _seed_accounts_if_needed
# Import models so Base.metadata is populated
import app.models.model 

async def auto_backup(session):
    import pandas as pd
    from app.core.timezone_utils import get_now_local
    from app.models.model import (
        User, AcademicYear, Course, Room, Enrollment, Payment,
        Batch, Subject, TimeTable, Grade, Attendance, StaffAttendance,
        ParentStudent, ActivityLog, Account, Expense, JournalEntry, JournalEntryLine
    )
    from sqlalchemy import select
    
    print("📦 Initiating automatic database backup before resetting...")
    
    models = [
        (User, "Users"),
        (AcademicYear, "AcademicYears"),
        (Course, "Courses"),
        (Room, "Rooms"),
        (Enrollment, "Enrollments"),
        (Payment, "Payments"),
        (Batch, "Batches"),
        (Subject, "Subjects"),
        (TimeTable, "Timetables"),
        (Grade, "Grades"),
        (Attendance, "Attendances"),
        (StaffAttendance, "StaffAttendances"),
        (ParentStudent, "ParentStudentLinks"),
        (ActivityLog, "ActivityLogs"),
        (Account, "Accounts"),
        (Expense, "Expenses"),
        (JournalEntry, "JournalEntries"),
        (JournalEntryLine, "JournalEntryLines")
    ]
    
    # Ensure backup directory exists
    backup_dir = os.path.join(os.getcwd(), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = f"auto_backup_reset_{get_now_local().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(backup_dir, filename)
    
    try:
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            for model, sheet_name in models:
                result = await session.execute(select(model))
                items = result.scalars().all()
                
                data = []
                for item in items:
                    d = {c.name: getattr(item, c.name) for c in model.__table__.columns}
                    from datetime import date as py_date, datetime as py_datetime
                    for k, v in d.items():
                        if isinstance(v, py_datetime):
                            d[k] = v.strftime("%Y-%m-%d %H:%M:%S")
                        elif isinstance(v, py_date):
                            d[k] = v.strftime("%Y-%m-%d")
                        elif isinstance(v, (pd.Timestamp, pd.Timedelta)):
                            d[k] = str(v)
                    data.append(d)
                
                df = pd.DataFrame(data)
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                
        print(f"✅ Backup successfully saved to: {filepath}")
    except Exception as e:
        print(f"⚠️ Warning: Auto-backup failed: {str(e)}")
        confirm_proceed = input("Proceed with database reset anyway without a backup? (y/N): ")
        if confirm_proceed.lower() not in ['y', 'yes']:
            raise RuntimeError("Operation aborted due to backup failure.")

async def reset_database():
    print(f"Connecting to database: {engine.url.database}...")
    print("Resetting database data and auto increment indices...")
    
    # Run auto-backup first
    async with AsyncSessionLocal() as session:
        try:
            await auto_backup(session)
        except Exception as e:
            print(f"❌ Operation cancelled: {str(e)}")
            return

    async with engine.begin() as conn:
        tables = [table.name for table in Base.metadata.sorted_tables]
        if not tables:
            print("No tables found to reset.")
            return
            
        table_list = ", ".join([f'"{table}"' for table in tables])
        print(f"Truncating tables: {table_list}")
        
        if "postgresql" in engine.url.drivername:
            # PostgreSQL specific command to empty tables, reset sequences, and clear foreign key relations correctly
            query = text(f"TRUNCATE TABLE {table_list} RESTART IDENTITY CASCADE;")
            await conn.execute(query)
        elif "sqlite" in engine.url.drivername:
            # SQLite does not support TRUNCATE CASCADE directly
            for table in reversed(tables): # Deleting in reverse topological order
                await conn.execute(text(f'DELETE FROM "{table}";'))
            
            # Reset SQLite auto-increment
            try:
                await conn.execute(text("DELETE FROM sqlite_sequence;"))
            except Exception:
                pass # sqlite_sequence might not exist if no auto_increment used
        else:
            print(f"Unsupported database dialect for reset: {engine.url.drivername}")
            return
            
    print("✅ All data, indexes, and primary key auto increments have been reset successfully.")
    
    print("Re-seeding initial admin data and Chart of Accounts...")
    try:
        await _seed_admin_if_needed()
        await _seed_accounts_if_needed()
    except Exception as e:
        print(f"Note: Could not automatically seed initial data: {e}")

if __name__ == "__main__":
    asyncio.run(reset_database())
