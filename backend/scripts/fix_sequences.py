import asyncio
from sqlalchemy import text
from app.core.database_initialization import AsyncSessionLocal

sequence_maps = [
    ("users", "user_id"),
    ("academic_years", "academic_year_id"),
    ("courses", "course_id"),
    ("rooms", "room_id"),
    ("enrollments", "enrollment_id"),
    ("payments", "payment_id"),
    ("batches", "batch_id"),
    ("subjects", "subject_id"),
    ("timetables", "timetable_id"),
    ("grades", "grade_id"),
    ("attendances", "attendance_id"),
    ("staff_attendance", "id"),
    ("parent_student", "id"),
    ("activity_logs", "log_id"),
    ("refresh_tokens", "id")
]

async def fix_sequences():
    async with AsyncSessionLocal() as session:
        dialect_name = session.bind.dialect.name
        print(f"Database dialect: {dialect_name}")
        for table, pk in sequence_maps:
            try:
                # Find max ID
                res = await session.execute(text(f'SELECT COALESCE(MAX("{pk}"), 0) FROM "{table}"'))
                max_id = res.scalar()
                
                if "postgresql" in dialect_name:
                    # Get sequence name
                    seq_res = await session.execute(text(f"SELECT pg_get_serial_sequence('\"{table}\"', '{pk}')"))
                    seq_name = seq_res.scalar()
                    
                    if not seq_name:
                        seq_name = f'"{table}_{pk}_seq"'
                    else:
                        seq_name = f"'{seq_name}'"
                        
                    if max_id > 0:
                        await session.execute(text(f"SELECT setval({seq_name}, {max_id}, true)"))
                    else:
                        await session.execute(text(f"SELECT setval({seq_name}, 1, false)"))
                    print(f"Reset sequence {seq_name} for '{table}' to max_id={max_id}")
                elif "sqlite" in dialect_name:
                    await session.execute(text(f"INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('{table}', {max_id})"))
                    print(f"Reset SQLite sequence for '{table}' to {max_id}")
            except Exception as e:
                print(f"Error resetting sequence for {table}: {e}")
        await session.commit()
    print("Sequence fixing completed successfully!")

if __name__ == "__main__":
    asyncio.run(fix_sequences())
