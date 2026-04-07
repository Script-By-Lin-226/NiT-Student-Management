import asyncio
from sqlalchemy import text
from app.core.database_initialization import engine

async def fix_alembic():
    target_revision = "4f228d277b6f"
    print(f"Aligning database with revision: {target_revision}...")
    
    async with engine.begin() as conn:
        # Check if table exists
        result = await conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version');"))
        exists = result.scalar()
        
        if not exists:
            print("alembic_version table does not exist. Creating it...")
            await conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num));"))
            await conn.execute(text(f"INSERT INTO alembic_version (version_num) VALUES ('{target_revision}');"))
        else:
            print("Updating existing alembic_version table...")
            await conn.execute(text("DELETE FROM alembic_version;"))
            await conn.execute(text(f"INSERT INTO alembic_version (version_num) VALUES ('{target_revision}');"))
            
    print(f"✅ Database has been successfully stamped with revision {target_revision}.")

if __name__ == "__main__":
    asyncio.run(fix_alembic())
