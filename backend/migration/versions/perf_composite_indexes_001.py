"""Production performance: add composite indexes for common query patterns

Revision ID: perf_composite_indexes_001
Revises: 03d1a81d17aa
Create Date: 2026-07-31

Indexes added:
- ix_users_role               (users.role)             — role-filtered list queries
- ix_users_role_active        (users.role, is_active)  — active user listing
- ix_enrollments_student_status (student_id, status)   — enrollment lookup by student+status
- ix_enrollments_student_course (student_id, course_id)— duplicate enrollment check
- ix_payments_enrollment_date   (enrollment_id, payment_date) — payment history per enrollment
- ix_refresh_tokens_user_revoked (user_id, is_revoked) — token validation lookup
- ix_activity_logs_user_time    (user_id, timestamp)   — per-user activity log queries
- ix_attendance_user_date       (user_id, attendance_date) — attendance lookup
- ix_staff_attendance_user_date (user_id, date)        — staff attendance lookup
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = 'perf_composite_indexes_001'
down_revision: Union[str, Sequence[str], None] = '03d1a81d17aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add composite and single-column indexes for production query performance."""

    # ── users ──────────────────────────────────────────────────────────────────
    # Role is frequently filtered (get students, teachers, parents etc.)
    op.create_index(
        'ix_users_role',
        'users',
        ['role'],
        unique=False,
        if_not_exists=True,
    )
    # Combined role + active status — common admin list filter
    op.create_index(
        'ix_users_role_active',
        'users',
        ['role', 'is_active'],
        unique=False,
        if_not_exists=True,
    )

    # ── enrollments ────────────────────────────────────────────────────────────
    # Lookup all enrollments for a student filtered by status
    op.create_index(
        'ix_enrollments_student_status',
        'enrollments',
        ['student_id', 'status'],
        unique=False,
        if_not_exists=True,
    )
    # Check for duplicate enrollment (student + course)
    op.create_index(
        'ix_enrollments_student_course',
        'enrollments',
        ['student_id', 'course_id'],
        unique=False,
        if_not_exists=True,
    )

    # ── payments ───────────────────────────────────────────────────────────────
    # Payment history per enrollment, ordered by date
    op.create_index(
        'ix_payments_enrollment_date',
        'payments',
        ['enrollment_id', 'payment_date'],
        unique=False,
        if_not_exists=True,
    )

    # ── refresh_tokens ─────────────────────────────────────────────────────────
    # Token validation: lookup non-revoked tokens for a user
    op.create_index(
        'ix_refresh_tokens_user_revoked',
        'refresh_tokens',
        ['user_id', 'is_revoked'],
        unique=False,
        if_not_exists=True,
    )

    # ── activity_logs ──────────────────────────────────────────────────────────
    # Per-user activity lookup ordered by time
    op.create_index(
        'ix_activity_logs_user_time',
        'activity_logs',
        ['user_id', 'timestamp'],
        unique=False,
        if_not_exists=True,
    )

    # ── attendances ────────────────────────────────────────────────────────────
    # Attendance lookup per student per date (covers most attendance queries)
    op.create_index(
        'ix_attendance_user_date',
        'attendances',
        ['user_id', 'attendance_date'],
        unique=False,
        if_not_exists=True,
    )

    # ── staff_attendance ───────────────────────────────────────────────────────
    # Staff attendance lookup per user per date
    op.create_index(
        'ix_staff_attendance_user_date',
        'staff_attendance',
        ['user_id', 'date'],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    """Drop the performance indexes added in this migration."""
    op.drop_index('ix_staff_attendance_user_date', table_name='staff_attendance', if_exists=True)
    op.drop_index('ix_attendance_user_date', table_name='attendances', if_exists=True)
    op.drop_index('ix_activity_logs_user_time', table_name='activity_logs', if_exists=True)
    op.drop_index('ix_refresh_tokens_user_revoked', table_name='refresh_tokens', if_exists=True)
    op.drop_index('ix_payments_enrollment_date', table_name='payments', if_exists=True)
    op.drop_index('ix_enrollments_student_course', table_name='enrollments', if_exists=True)
    op.drop_index('ix_enrollments_student_status', table_name='enrollments', if_exists=True)
    op.drop_index('ix_users_role_active', table_name='users', if_exists=True)
    op.drop_index('ix_users_role', table_name='users', if_exists=True)
