"""create tables

Revision ID: 4b3ed77451fc
Revises: 
Create Date: 2026-03-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4b3ed77451fc'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### Create courses table ###
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text, nullable=True)
    )

    # ### Create students table ###
    op.create_table(
        "students",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("first_name", sa.String(length=255), nullable=False),
        sa.Column("last_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True)
    )

    # ### Create enrollments table ###
    op.create_table(
        "enrollments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", sa.Integer, sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    )

    # ### Create timetables table ###
    op.create_table(
        "timetables",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("course_id", sa.Integer, sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.String(length=50), nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False)
    )


def downgrade():
    # ### Downgrade safely: drop dependent tables first ###
    op.drop_table("timetables")
    op.drop_table("enrollments")
    op.drop_table("students")
    op.drop_table("courses")