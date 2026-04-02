import asyncio
from sqlalchemy.future import select
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User

async def migrate_student_codes():
    async with AsyncSessionLocal() as session:
        # Fetch all students
        result = await session.execute(
            select(User).where(User.role == "student")
        )
        students = result.scalars().all()
        
        updates = 0
        for s in students:
            old_code = s.user_code
            prefix = old_code[:2]
            if prefix not in ["CO", "IN"]:
                continue
            
            try:
                # Target: prefix + seq:04d + month:unpadded + year:2d
                # We need to detect if it's the old 3-digit style, the failed 5-digit style, or already 4-digit.
                
                # Let's try to extract seq and date by looking at common lengths
                if len(old_code) in [8, 9] and old_code[2:5].isdigit() and not old_code[2:6].startswith('0000'):
                    # Legacy 3-digit style (e.g. CO001426)
                    seq = int(old_code[2:5])
                    date_part = old_code[5:]
                elif len(old_code) >= 10:
                    # Likely the 5-digit style I just created (e.g. CO00001426)
                    seq = int(old_code[2:7])
                    date_part = old_code[7:]
                elif len(old_code) in [9, 10]:
                    # Maybe it's already 4-digit? (e.g. CO0001426)
                    # We can re-process it anyway
                    seq = int(old_code[2:6])
                    date_part = old_code[6:]
                else:
                    continue

                if len(date_part) == 3: # M-YY
                    month = int(date_part[0])
                    year = date_part[1:]
                elif len(date_part) == 4: # MM-YY
                    month = int(date_part[:2])
                    year = date_part[2:]
                else:
                    continue
                
                # Target format: 4-digit seq, UNPADDED month
                new_code = f"{prefix}{seq:04d}{month}{year}"
                
                if new_code != old_code:
                    print(f"Migrating: {old_code} -> {new_code} ({s.username})")
                    s.user_code = new_code
                    updates += 1
            except Exception as e:
                print(f"Skipping {old_code}: {e}")
                continue
        
        if updates > 0:
            await session.commit()
            print(f"✅ Successfully migrated {updates} student codes to 4-digit sequence.")
        else:
            print("No student codes needed migration.")

if __name__ == "__main__":
    asyncio.run(migrate_student_codes())
