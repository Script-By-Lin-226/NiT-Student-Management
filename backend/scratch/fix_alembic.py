"""Fix alembic_version table to point to current head revision."""
import sqlalchemy

DB_URL = "postgresql://nit_db_yca1_user:qoECkymDXjpIC4QAXcuyTur0zNkwk4Xc@dpg-d6vavjfkijhs73coa82g-a.singapore-postgres.render.com/nit_db_yca1"
NEW_HEAD = "66f225fa6cd2"

engine = sqlalchemy.create_engine(DB_URL)
with engine.connect() as conn:
    # Check current
    result = conn.execute(sqlalchemy.text("SELECT * FROM alembic_version"))
    print("Before:", list(result))
    
    # Update to head
    conn.execute(sqlalchemy.text(f"UPDATE alembic_version SET version_num = '{NEW_HEAD}'"))
    conn.commit()
    
    # Verify
    result = conn.execute(sqlalchemy.text("SELECT * FROM alembic_version"))
    print("After:", list(result))

engine.dispose()
print("Done! alembic_version updated to head.")
