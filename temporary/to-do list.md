# To-Do List - Add Student Affairs Role to Staff Creation UI & Backend Validation

- [x] Add `student_affairs` option to the Role dropdown in `frontend/app/(portal)/admin/users/page.tsx`
- [x] Implement `getRoleLabel()` helper function in `frontend/app/(portal)/admin/users/page.tsx` to handle user-friendly role names (e.g. "Student Affairs", "HR")
- [x] Update table display cell for Role to use `getRoleLabel(r.role)`
- [x] Run typescript compile checks to verify no type or import errors
- [x] Add `'student_affairs'` to the allowed role list in `AdminStaffCreate` schema within `backend/app/schemas/user.py`
- [x] Verify backend python compile/syntax check is successful
