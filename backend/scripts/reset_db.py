import asyncio
from sqlalchemy import text
from app.core.database_initialization import engine, Base, _seed_admin_if_needed
# Import models so Base.metadata is populated
import app.models.model 

async def reset_database():
    print(f"Connecting to database: {engine.url.database}...")
    print("Resetting database data and auto increment indices...")
    
    async with engine.begin() as conn:
        tables = [table.name for table in Base.metadata.sorted_tables]
        if not tables:
            print("No tables found to reset.")
            return
            
        table_list = ", ".join([f'"{table}"' for table in tables])
        print(f"Truncating tables: {table_list}")
        
        if "postgresql" in engine.url.drivername:
            # PostgreSQL specific command to empty tables, reset sequences, and clear foreign key relations correctly
            query = text(f"TRUNCATE TABLE {table_list} RESTART IDENTITY CASCADE;")
            await conn.execute(query)
        elif "sqlite" in engine.url.drivername:
            # SQLite does not support TRUNCATE CASCADE directly
            for table in reversed(tables): # Deleting in reverse topological order
                await conn.execute(text(f'DELETE FROM "{table}";'))
            
            # Reset SQLite auto-increment
            try:
                await conn.execute(text("DELETE FROM sqlite_sequence;"))
            except Exception:
                pass # sqlite_sequence might not exist if no auto_increment used
        else:
            print(f"Unsupported database dialect for reset: {engine.url.drivername}")
            return
            
    print("✅ All data, indexes, and primary key auto increments have been reset successfully.")
    
    print("Re-seeding initial admin data if configured...")
    try:
        await _seed_admin_if_needed()
    except Exception as e:
        print(f"Note: Could not automatically seed admin account: {e}")

if __name__ == "__main__":
    asyncio.run(reset_database())
