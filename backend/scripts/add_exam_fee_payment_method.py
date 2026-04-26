
import asyncio
import asyncpg

async def add_exam_fee_payment_method():
    url = "postgresql://nit_db_yca1_user:qoECkymDXjpIC4QAXcuyTur0zNkwk4Xc@dpg-d6vavjfkijhs73coa82g-a.singapore-postgres.render.com/nit_db_yca1"
    
    try:
        conn = await asyncpg.connect(url)
        print("Connected to DB")
        
        print("Adding exam_fee_payment_method column to payments...")
        await conn.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS exam_fee_payment_method VARCHAR")
        
        await conn.close()
        print("Column added successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_exam_fee_payment_method())
