"""Add Attendance model

Revision ID: 7bab03cadee8
Revises: 4b3ed77451fc
Create Date: 2026-03-17 14:16:58.507482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7bab03cadee8'
down_revision: Union[str, Sequence[str], None] = '4b3ed77451fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the attendances table."""
    op.create_table(
        'attendances',
        sa.Column('attendance_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('check_today', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('attendance_id')
    )
    op.create_index(op.f('ix_attendances_attendance_id'), 'attendances', ['attendance_id'], unique=False)


def downgrade() -> None:
    """Drop the attendances table."""
    op.drop_index(op.f('ix_attendances_attendance_id'), table_name='attendances')
    op.drop_table('attendances')
