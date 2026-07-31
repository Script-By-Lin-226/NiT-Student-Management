import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from alembic import context
from app.core.database_initialization import Base  # import your Base
import app.models.model  # import all models to populate Base.metadata

# this is the Alembic Config object
config = context.config

# Logging setup
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for autogenerate
target_metadata = Base.metadata

# Database URL (asyncpg)
import os

# Get URL from environment first, then alembic.ini
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = config.get_main_option("sqlalchemy.url")

# Railway/Render provides postgresql:// but asyncpg needs +asyncpg
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Sync function called in async context for migrations."""
    import sqlalchemy as sa
    from alembic.script import ScriptDirectory

    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()

    user_tables = [t for t in tables if t != 'alembic_version']
    if len(user_tables) > 0:
        # Check if alembic_version table exists and has a record
        has_version_table = 'alembic_version' in tables
        has_record = False
        if has_version_table:
            result = connection.execute(sa.text("SELECT 1 FROM alembic_version LIMIT 1"))
            has_record = result.fetchone() is not None

        if not has_record:
            script = ScriptDirectory.from_config(config)
            head_revision = script.get_current_head()
            if head_revision:
                print(f"[Alembic Auto-Stamp] Database tables exist but alembic_version is empty/missing. Stamping database with head revision: {head_revision}")
                if not has_version_table:
                    connection.execute(sa.text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"))
                else:
                    connection.execute(sa.text("DELETE FROM alembic_version"))
                connection.execute(sa.text(f"INSERT INTO alembic_version (version_num) VALUES ('{head_revision}')"))

    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable: AsyncEngine = create_async_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        # run_sync allows sync migration functions in async context
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())