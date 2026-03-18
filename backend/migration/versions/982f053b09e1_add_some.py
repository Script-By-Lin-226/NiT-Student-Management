"""Add some

Revision ID: 982f053b09e1
Revises: 4ca886e59717
Create Date: 2026-03-17 23:17:42.334991

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '982f053b09e1'
down_revision: Union[str, Sequence[str], None] = '4ca886e59717'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # NOTE:
    # This revision was auto-generated incorrectly (it attempted to drop most tables).
    # Keep it as a no-op to avoid destructive migrations on existing databases.
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Keep as no-op; downgrades are not supported for this project.
    pass
