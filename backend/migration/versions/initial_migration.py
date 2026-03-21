"""initial

Revision ID: initial_001
Revises: 
Create Date: 2026-03-21 21:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'initial_001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Since migrations are broken, we rely on init_db to create tables 
    # but we need a valid migration head to track versioning.
    # Alternatively, we can use create_all here too.
    # But since init_db is in the app, let's just make it do nothing if tables exist.
    pass

def downgrade():
    pass
