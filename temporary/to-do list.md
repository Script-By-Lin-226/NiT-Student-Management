# To-Do List: Flexible Payment System

## Architecture & Database Changes
- [ ] Add `total_fee` and `exam_fee_gbp` to `Enrollment` model in `backend/app/models/model.py`.
- [ ] Add the same fields to `AdminEnrollmentCreate` and `AdminEnrollmentUpdate` in `backend/app/schemas/enrollment.py`.
- [ ] Update `AdminEnrollmentCreate` to handle default values for these new fields based on the course's current fees.
- [ ] Execute `ALTER TABLE enrollments ADD COLUMN total_fee FLOAT;` and `ALTER TABLE enrollments ADD COLUMN exam_fee_gbp FLOAT;` in the database.

## Backend Service Updates
- [ ] Update `create_enrollment` in `backend/app/services/admin_panel.py` to snapshot current course fees into `Enrollment`.
- [ ] Update `list_enrollments` in `backend/app/services/admin_panel.py` to use `e.total_fee` (fallback to `c.fee_...` for legacy data).
- [ ] Update `update_enrollment` in `backend/app/services/admin_panel.py` to allow manual fee updates.
- [ ] Update `create_payment` in `backend/app/services/admin_panel.py` to use `enroll.total_fee` and `enroll.exam_fee_gbp`.
- [ ] Update `get_student_relations` in `backend/app/services/admin_panel.py` to use enrollment fees instead of course fees.

## Frontend UI Updates
- [ ] Add "Total Fee" and "Exam Fee (GBP)" fields to Enrollment form/modal.
- [ ] Ensure they are pre-filled when a course is selected but can be changed.
- [ ] Display the balance correctly based on these new fields in student details and enrollment list.
