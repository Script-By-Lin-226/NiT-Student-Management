import sys
import os
import asyncio
from datetime import datetime, timedelta
import random

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User, ActivityLog, Course, AcademicYear, Room, Enrollment

async def seed_data():
    print("Seeding performance data...")
    async with AsyncSessionLocal() as session:
        # 1. Academic Year
        year = AcademicYear(
            year_name="2026-2027",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 12, 31)
        )
        session.add(year)
        await session.flush()
        
        # 2. Rooms
        for i in range(1, 6):
            session.add(Room(room_name=f"Room {i}", capacity=30))
            
        # 3. Students
        students = []
        for i in range(1, 10001):
            s = User(
                user_code=f"STU{i:05d}",
                username=f"Student {i}",
                email=f"student{i}@example.com",
                password_hash="mock_hash",
                data_of_birth=datetime(2005, 1, 1),
                role="student",
                is_active=True
            )
            session.add(s)
            students.append(s)
        await session.flush()
        
        # 4. Courses
        courses = []
        for i in range(1, 11):
            c = Course(
                course_code=f"CRS{i:03d}",
                course_name=f"Course {i}",
                academicyear_id=year.academic_year_id,
                room=f"Room {random.randint(1,5)}",
                fee_full_payment=100000.0,
                start_date=datetime.now().date()
            )
            session.add(c)
            courses.append(c)
        await session.flush()
        
        # 5. Activity Logs
        for i in range(1, 1001):
            log = ActivityLog(
                user_id=1, # Admin
                action=random.choice(["Create Student", "Record Payment", "Mark Attendance", "Update Enrollment"]),
                details=f"Test activity {i}",
                timestamp=datetime.now() - timedelta(minutes=random.randint(0, 10000))
            )
            session.add(log)
            
        # 6. Enrollments
        for i in range(1, 51):
            session.add(Enrollment(
                enrollment_code=f"ENR{i:03d}",
                student_id=random.choice(students).user_id,
                course_id=random.choice(courses).course_id,
                status=True,
                payment_plan="full"
            ))
            
        await session.commit()
        print("✅ Seeded 100 students, 1000 activity logs, 10 courses, and 50 enrollments.")

if __name__ == "__main__":
    asyncio.run(seed_data())
