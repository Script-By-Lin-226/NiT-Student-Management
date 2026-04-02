import asyncio
import os
import sys

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, and_
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import Enrollment, Course

async def fix_fees():
    print("Starting Enrollment Fee Fix...")
    async with AsyncSessionLocal() as session:
        # Find enrollments with missing or zero total_fee
        query = select(Enrollment).where(
            (Enrollment.total_fee == None) | (Enrollment.total_fee == 0.0)
        )
        result = await session.execute(query)
        enrollments = result.scalars().all()
        
        print(f"Found {len(enrollments)} enrollments to fix.")
        
        fixed_count = 0
        for e in enrollments:
            # Get the course to find the current price
            c_res = await session.execute(select(Course).where(Course.course_id == e.course_id))
            course = c_res.scalar_one_or_none()
            
            if course:
                # Use current course fee as the default for frozen fee
                price = course.fee_full_payment if e.payment_plan == "full" else course.fee_installment
                if price:
                    e.total_fee = price
                    fixed_count += 1
                    print(f"Fixed Enrollment {e.enrollment_code}: Set total_fee to {price}")
                    
            if fixed_count % 50 == 0 and fixed_count > 0:
                await session.commit()
                print(f"Committed {fixed_count} records...")

        await session.commit()
        print(f"Finished! Fixed {fixed_count} enrollment fees.")

if __name__ == "__main__":
    asyncio.run(fix_fees())
