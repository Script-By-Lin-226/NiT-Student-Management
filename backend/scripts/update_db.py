import asyncio
from app.core.database_initialization import engine
from sqlalchemy import text
import random

async def update_db():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Connected! Adding columns...")
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_fee_gbp DOUBLE PRECISION"))
        except Exception as e:
            print(f"courses alter skipped: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS signature TEXT"))
        except Exception as e:
            print(f"users alter skipped: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_paid_gbp DOUBLE PRECISION"))
            await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_paid_mmk DOUBLE PRECISION"))
            await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_currency VARCHAR DEFAULT 'MMK'"))
            await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS fine_reason TEXT"))
            await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS extra_items_payment_method VARCHAR"))
        except Exception as e:
            print(f"payments alter skipped: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_id VARCHAR UNIQUE"))
        except Exception as e:
            print(f"payments receipt_id UNIQUE alter skipped: {e}")
            try:
                await conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_id VARCHAR"))
            except Exception as e2:
                print(f"payments receipt_id basic alter failed: {e2}")

    # Backfill existing payments that do not have receipt_id
    from app.core.database_initialization import AsyncSessionLocal
    from app.models.model import Payment
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Payment).where(Payment.receipt_id == None))
        payments_to_backfill = result.scalars().all()
        if payments_to_backfill:
            print(f"Found {len(payments_to_backfill)} payments to backfill receipt_id...")
            for p in payments_to_backfill:
                while True:
                    rnd = random.randint(100000, 999999)
                    receipt_id = f"nit-1A-{rnd}"
                    # Check uniqueness
                    exists_r = await session.execute(select(Payment).where(Payment.receipt_id == receipt_id))
                    if not exists_r.scalars().first():
                        p.receipt_id = receipt_id
                        print(f"Backfilled payment {p.payment_id} with receipt_id {receipt_id}")
                        break
            await session.commit()
            print("Backfill completed successfully.")
        else:
            print("No payments required backfilling.")

    print("Database update finished.")

if __name__ == "__main__":
    asyncio.run(update_db())
