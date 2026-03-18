"""added_financial_and_batch

Revision ID: 73140dedb182
Revises: 982f053b09e1
Create Date: 2026-03-18 11:45:34.750258

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '73140dedb182'
down_revision: Union[str, Sequence[str], None] = '982f053b09e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('courses', sa.Column('batch_no', sa.String(), nullable=True))
    op.add_column('courses', sa.Column('cost', sa.Float(), nullable=True))
    op.add_column('courses', sa.Column('discount_plan', sa.String(), nullable=True))
    op.add_column('enrollments', sa.Column('payment_plan', sa.String(), nullable=True))
    op.add_column('enrollments', sa.Column('downpayment', sa.Float(), nullable=True))
    op.add_column('enrollments', sa.Column('installment_amount', sa.Float(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('enrollments', 'installment_amount')
    op.drop_column('enrollments', 'downpayment')
    op.drop_column('enrollments', 'payment_plan')
    op.drop_column('courses', 'discount_plan')
    op.drop_column('courses', 'cost')
    op.drop_column('courses', 'batch_no')
    # ### end Alembic commands ###
