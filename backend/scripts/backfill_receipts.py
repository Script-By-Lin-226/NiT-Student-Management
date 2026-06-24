import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.model import Payment
from sqlalchemy.pool import NullPool
from datetime import datetime

async def backfill():
    print("Starting backfill with new receipt ID format (nit-daymonthyear-0000001)...")
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Fetch all payments sorted by date and id so we assign sequences chronologically
        result = await session.execute(select(Payment).order_by(Payment.payment_date.asc(), Payment.payment_id.asc()))
        payments = result.scalars().all()
        
        # Phase 1: Assign temporary unique values to avoid unique constraint violations during update
        for p in payments:
            p.receipt_id = f"temp-{p.payment_id}"
        await session.commit()
        
        # Phase 2: Resequence chronologically
        max_seq = 0
        for p in payments:
            # Resolve date
            p_date = p.payment_date if p.payment_date else datetime.utcnow()
            date_str = p_date.strftime("%d%m%Y")
            prefix = f"nit-{date_str}-"
            
            max_seq += 1
            new_rid = f"{prefix}{max_seq:07d}"
            print(f"Updating payment {p.payment_id} to {new_rid}")
            p.receipt_id = new_rid
                
        await session.commit()
        print("Backfill completed successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(backfill())
