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
        # Fetch all payments sorted by date so we assign sequences chronologically
        result = await session.execute(select(Payment).order_by(Payment.payment_date.asc()))
        payments = result.scalars().all()
        
        print(f"Total payments found: {len(payments)}")
        
        for p in payments:
            # Check if receipt_id matches the new format: nit-DDMMYYYY-0000001
            is_new_format = False
            if p.receipt_id and p.receipt_id.startswith("nit-"):
                parts = p.receipt_id.split("-")
                if len(parts) == 3 and len(parts[1]) == 8 and len(parts[2]) == 7:
                    try:
                        int(parts[1])
                        int(parts[2])
                        is_new_format = True
                    except ValueError:
                        pass
            
            if not is_new_format:
                # Resolve date
                p_date = p.payment_date if p.payment_date else datetime.utcnow()
                date_str = p_date.strftime("%d%m%Y")
                prefix = f"nit-{date_str}-"
                
                # Query max sequence for this day so far (including already backfilled in this session)
                result_seq = await session.execute(
                    select(Payment.receipt_id)
                    .where(Payment.receipt_id.like(f"{prefix}%"))
                )
                receipt_ids = result_seq.scalars().all()
                max_seq = 0
                for rid in receipt_ids:
                    if rid:
                        parts = rid.split("-")
                        if len(parts) >= 3:
                            try:
                                seq = int(parts[-1])
                                if seq > max_seq:
                                    max_seq = seq
                            except ValueError:
                                pass
                next_seq = max_seq + 1
                new_rid = f"{prefix}{next_seq:07d}"
                print(f"Updating payment {p.payment_id} from {p.receipt_id} to {new_rid}")
                p.receipt_id = new_rid
                
        await session.commit()
        print("Backfill completed successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(backfill())
