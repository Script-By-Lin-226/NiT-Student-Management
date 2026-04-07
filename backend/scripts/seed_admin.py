import asyncio
from app.core.database_initialization import _seed_admin_if_needed

if __name__ == "__main__":
    asyncio.run(_seed_admin_if_needed())
