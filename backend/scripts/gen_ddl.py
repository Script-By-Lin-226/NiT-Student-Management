import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.database_initialization import Base
import app.models.model
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql

def generate_ddl():
    # Sort tables by dependency
    tables = Base.metadata.sorted_tables
    for table in tables:
        # Use postgresql dialect to get correct types
        print(f"    # ### Create {table.name} table ###")
        ddl = CreateTable(table).compile(dialect=postgresql.dialect())
        # Convert DDL to op.create_table or similar?
        # Actually, let's just print the SQL and use op.execute(text(...))?
        # No, better to use Alembic commands.
        print(f"    op.execute(text(\"\"\"{ddl}\"\"\"))")

if __name__ == "__main__":
    generate_ddl()
