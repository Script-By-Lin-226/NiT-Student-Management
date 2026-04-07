import asyncio
import json
from app.core.database_initialization import AsyncSessionLocal
from app.models.model import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        query = select(User)
        res = await session.execute(query)
        users = res.scalars().all()
        try:
            from fastapi.encoders import jsonable_encoder
            print(jsonable_encoder(users))
        except Exception as e:
            print("fastapi encode error:", e)
            
        try:
            import json
            print(json.dumps([u.__dict__ for u in users], default=str))
        except Exception as e:
            print("json encode error:", e)

asyncio.run(main())
