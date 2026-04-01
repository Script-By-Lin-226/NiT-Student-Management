import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_database_sequences():
    """
    Identifies all tables with serial/sequence columns in a PostgreSQL database 
    and resets their sequences to the current MAX(id) + 1. 
    This prevents 'duplicate key value violates unique constraint' errors.
    """
    
    # We use the configured DATABASE_URL from settings
    database_url = settings.DATABASE_URL
    if "postgresql" not in database_url:
        logger.warning("Database is not PostgreSQL. Skipping sequence reset.")
        return

    logger.info(f"Connecting to database to fix sequences...")
    engine = create_async_engine(database_url)

    try:
        async with engine.begin() as conn:
            # Query to get all tables and their serial columns
            query = text("""
                SELECT 
                    t.table_name, 
                    c.column_name, 
                    pg_get_serial_sequence(t.table_name, c.column_name) as seq_name
                FROM 
                    information_schema.tables t
                JOIN 
                    information_schema.columns c ON t.table_name = c.table_name
                WHERE 
                    t.table_schema = 'public' 
                    AND pg_get_serial_sequence(t.table_name, c.column_name) IS NOT NULL;
            """)
            
            result = await conn.execute(query)
            rows = result.fetchall()
            
            if not rows:
                logger.info("No sequences found to reset.")
                return

            for table_name, column_name, seq_name in rows:
                logger.info(f"Resetting sequence '{seq_name}' for table '{table_name}.{column_name}'...")
                
                # Get the max ID from the table
                max_id_query = text(f'SELECT COALESCE(MAX("{column_name}"), 0) FROM "{table_name}";')
                max_id_result = await conn.execute(max_id_query)
                max_id = max_id_result.scalar() or 0
                
                # Set the sequence to max_id + 1
                # The 'false' flag means the next nextval() will return max_id + 1 if max_id > 0
                # If max_id is 0, we set it to 1.
                new_val = max(1, max_id)
                reset_query = text(f"SELECT setval('{seq_name}', {new_val}, true)")
                await conn.execute(reset_query)
                
            logger.info("✅ All primary key sequences have been successfully synchronized with existing data.")

    except Exception as e:
        logger.error(f"❌ Failed to fix sequences: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_database_sequences())
