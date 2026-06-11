import sys
import os
import asyncio
from sqlalchemy import text

# Add backend directory to system path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.config import settings
from app.core.database_initialization import Base, engine, AsyncSessionLocal, _seed_admin_if_needed
import app.models.model  # Ensure models are registered to Base.metadata

STAFF_ROLES = ["admin", "teacher", "hr", "manager", "sales"]

async def auto_backup(session):
    import pandas as pd
    from app.core.timezone_utils import get_now_local
    from app.models.model import (
        User, AcademicYear, Course, Room, Enrollment, Payment,
        Batch, Subject, TimeTable, Grade, Attendance, StaffAttendance,
        ParentStudent, ActivityLog
    )
    from sqlalchemy import select
    
    print("📦 Initiating automatic database backup before wiping...")
    
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
        (ActivityLog, "ActivityLogs")
    ]
    
    # Ensure backup directory exists
    backup_dir = os.path.join(os.getcwd(), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = f"auto_backup_{get_now_local().strftime('%Y%m%d_%H%M%S')}.xlsx"
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
        confirm_proceed = input("Proceed with database wipe anyway without a backup? (y/N): ")
        if confirm_proceed.lower() not in ['y', 'yes']:
            raise RuntimeError("Operation aborted due to backup failure.")

async def wipe_db():
    print("=" * 60)
    print("DATABASE WIPE & RESET UTILITY (EXCEPT ADMIN & STAFF)")
    print("=" * 60)
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    print("-" * 60)
    
    # Prompt user for explicit confirmation
    confirm = input("⚠️ WARNING: This will delete ALL data (except Admin and Staff accounts) and reset table indexes. Are you sure? (y/N): ")
    if confirm.lower() not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return

    dialect_name = engine.dialect.name
    print(f"Detected database dialect: {dialect_name}")

    # Fetch all defined table names from SQLAlchemy metadata
    all_tables = [table.name for table in Base.metadata.sorted_tables]
    if not all_tables:
        print("No tables found in metadata definitions.")
        return

    # Separate tables that will be fully wiped from the users table (which is partially wiped)
    fully_wiped_tables = [name for name in all_tables if name != "users"]

    # Perform auto-backup first
    async with AsyncSessionLocal() as session:
        try:
            await auto_backup(session)
        except Exception as e:
            print(f"❌ Operation cancelled: {str(e)}")
            return

    print("-" * 60)
    print(f"Tables to fully wipe: {', '.join(fully_wiped_tables)}")
    print("Table to partially wipe (preserving admin & staffs): users")
    print("-" * 60)

    async with engine.begin() as conn:
        if dialect_name == "postgresql":
            # 1. Truncate all tables except users (restarting their identity sequences)
            if fully_wiped_tables:
                tables_str = ", ".join(f'"{name}"' for name in fully_wiped_tables)
                query = text(f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE;")
                print("Executing TRUNCATE CASCADE on dependent tables...")
                await conn.execute(query)
            
            # 2. Delete non-staff/non-admin users from users table
            print("Deleting student and parent user accounts...")
            roles_placeholder = ", ".join(f"'{role}'" for role in STAFF_ROLES)
            await conn.execute(text(f"DELETE FROM users WHERE role NOT IN ({roles_placeholder});"))
            
            # 3. Reset users table sequence to the MAX(user_id) to avoid PK conflicts
            print("Resetting users auto-increment sequence...")
            await conn.execute(text(
                "SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 1));"
            ))
            
        elif dialect_name == "sqlite":
            # Disable foreign keys temporarily for manual wiping
            await conn.execute(text("PRAGMA foreign_keys = OFF;"))
            
            # 1. Delete all records from dependent tables and clear their sqlite_sequence
            print("Deleting dependent table records...")
            for name in fully_wiped_tables:
                await conn.execute(text(f'DELETE FROM "{name}";'))
                try:
                    await conn.execute(text(f'DELETE FROM sqlite_sequence WHERE name="{name}";'))
                except Exception:
                    pass
            
            # 2. Delete non-staff/non-admin users from users table
            print("Deleting student and parent user accounts...")
            roles_placeholder = ", ".join(f"'{role}'" for role in STAFF_ROLES)
            await conn.execute(text(f"DELETE FROM users WHERE role NOT IN ({roles_placeholder});"))
            
            # 3. Update users sequence in sqlite_sequence
            print("Resetting users auto-increment sequence...")
            try:
                res = await conn.execute(text(
                    "UPDATE sqlite_sequence SET seq = COALESCE((SELECT MAX(user_id) FROM users), 0) WHERE name = 'users';"
                ))
                if res.rowcount == 0:
                    await conn.execute(text(
                        "INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES ('users', COALESCE((SELECT MAX(user_id) FROM users), 0));"
                    ))
            except Exception:
                pass
                
            # Re-enable foreign keys
            await conn.execute(text("PRAGMA foreign_keys = ON;"))
            
        else:
            # Generic fallback
            print("Executing generic fallback DELETE in reverse dependency order...")
            for name in reversed(fully_wiped_tables):
                await conn.execute(text(f'DELETE FROM "{name}";'))
            roles_placeholder = ", ".join(f"'{role}'" for role in STAFF_ROLES)
            await conn.execute(text(f"DELETE FROM users WHERE role NOT IN ({roles_placeholder});"))

    print("✅ Database data wiped successfully (Admin & Staff preserved).")
    
    # If all admin accounts were accidentally deleted, re-seed the default admin
    print("Checking if admin account needs to be seeded...")
    await _seed_admin_if_needed()
    
    print("✅ Database reset complete.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(wipe_db())
