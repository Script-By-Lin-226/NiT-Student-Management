# To-Do List: Performance Optimization for Enrollments, Rooms, and Students

- [x] 1. Optimize Rooms Service (`list_rooms` & `get_room_availability`)
  - [x] Replace N+1 query loop with bulk `GROUP BY` aggregation query for enrollment loads
  - [x] Bulk fetch timetable room pairs and default course room assignments
  - [x] Add caching for `list_rooms` (`rooms:list`, 60s TTL)
  - [x] Add cache invalidation for `rooms:list` on room, timetable, and enrollment mutations

- [x] 2. Optimize Students Service (`get_students_details` & cache invalidation)
  - [x] Add pagination caching for `get_students_details` (`students:list:{page}:{limit}`, 60s TTL)
  - [x] Defer heavy text columns (`User.signature`, `User.address`, `User.password_hash`) on list queries
  - [x] Invalidate `students:list:*` on student creation, update, deletion, approval, and registration

- [x] 3. Optimize Enrollments Service & Invalidation
  - [x] Ensure `enrollment:list:*` cache is invalidated consistently across student creation with auto-enrollment, approvals, and mutations

- [x] 4. Verification & Testing
  - [x] Run backend unit tests (`pytest`)
  - [x] Verify Python syntax compilation
  - [x] Verify frontend build (`npm run build`)
