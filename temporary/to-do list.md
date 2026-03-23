# Performance Enhancement To-Do List

## Frontend
- [x] Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
- [x] Initialize `QueryClient` and `QueryClientProvider` in `layout.tsx`
- [x] Refactor `AdminService` and create `useAdmin` hooks
- [x] Implement `useQuery` for fetching:
    - [x] Activity logs (with Pagination)
    - [ ] Students list
    - [ ] Teachers list
    - [x] Academic years
- [x] Implement `useMutation` for activity log deletions and user deletions

## Backend
- [x] Add database indexes for `User.user_code`, `User.email`, `ActivityLog.timestamp`, `User.role`, `Attendance.attendance_date`
- [x] Implement pagination for `get_activity_logs`
- [ ] Implement pagination for `get_students_details`
- [ ] Implement a simple caching layer for Academic Years and Courses
- [x] Audit `AdminPanelService` for synchronous bottlenecks (All methods are async)
- [x] Ensure all FastAPI routes are `async def`

## Next Steps
- Implement pagination for Students and Payments.
- Refactor remaining pages (Students, Courses, Payments) to use TanStack Query hooks.
- Add server-side search for Activity Logs for even better performance.
- Implement server-side caching (e.g., using `FastAPI-Cache` or a simple in-memory cache) for static data like Academic Years.
