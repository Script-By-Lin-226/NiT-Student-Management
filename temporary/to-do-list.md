# To-Do List: Codebase Cleanup & Student Register 400 Error Fix

- [x] 1. Clean Up Useless & Obsolete Files
  - [x] Remove scratch / one-off scripts in `backend/scripts/` (`test_serialize.py`, `test_ts.py`, `create_test_acc.py`, `remove_admin.py`, `remove_sample_expenses.py`, `check_enrollments.py`, `list_codes.py`, `gen_ddl.py`, `gen_op_commands.py`, `add_exam_fee_payment_method.py`, `fix_alembic.py`, `fix_enrollment_fees.py`, `fix_sequences.py`, `migrate_codes.py`, `update_db.py`, `check_timezone.py`, `backfill_receipts.py`)
  - [x] Remove root scratch scripts in `scripts/` (`benchmark_performance.py`, `finance_system.py`, `generate_payment_receipt_summary.py`, `performance_test.py`, `seed_performance_data.py`, `wipe_database.py`)
  - [x] Remove empty `database/` directory
  - [x] Remove `temporary/count_lines.ps1`
  - [x] Clean stale `frontend/tsconfig.tsbuildinfo`
  - [x] Add `backend/pytest.ini` with `pythonpath = .` and `testpaths = tests`

- [x] 2. Fix Student Register Error 400 & Validation
  - [x] Update `StudentRegister` in `backend/app/schemas/user.py` with flexible optional fields & defaults
  - [x] Update `register_user` in `backend/app/services/authentication_service.py` with trimmed/lowercased email matching and clear error messages
  - [x] Improve `_next_student_code` in `backend/app/services/admin_panel.py` with collision detection & regex sequence parser
  - [x] Update `frontend/app/(auth)/register/page.tsx` error handling to correctly parse and display string `detail` from backend

- [x] 3. Verification & Testing
  - [x] Run backend unit tests & syntax checks
  - [x] Run frontend TypeScript compile & build check
