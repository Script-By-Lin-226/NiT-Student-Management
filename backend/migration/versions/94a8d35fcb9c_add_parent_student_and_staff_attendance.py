"""add_parent_student_and_staff_attendance

Revision ID: 94a8d35fcb9c
Revises: 09bfe58a5fb3
Create Date: 2026-03-17 15:19:43.198362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '94a8d35fcb9c'
down_revision: Union[str, Sequence[str], None] = '09bfe58a5fb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('parent_student',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('relationship_label', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('parent_id', 'student_id', name='uq_parent_student')
    )
    
    op.create_table('staff_attendances',
    sa.Column('attendance_id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('attendance_date', sa.Date(), nullable=False),
    sa.Column('check_in_time', sa.String(), nullable=True),
    sa.Column('check_out_time', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('attendance_id'),
    sa.UniqueConstraint('user_id', 'attendance_date', name='uq_staff_attendance_date')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('staff_attendances')
    op.drop_table('parent_student')
