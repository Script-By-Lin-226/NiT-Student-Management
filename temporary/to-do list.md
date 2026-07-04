# To-Do List - Add Student Affairs Role to Staff Creation UI

- [x] Add `student_affairs` option to the Role dropdown in `frontend/app/(portal)/admin/users/page.tsx`
- [x] Implement `getRoleLabel()` helper function in `frontend/app/(portal)/admin/users/page.tsx` to handle user-friendly role names (e.g. "Student Affairs", "HR")
- [x] Update table display cell for Role to use `getRoleLabel(r.role)`
- [x] Run typescript compile checks to verify no type or import errors
