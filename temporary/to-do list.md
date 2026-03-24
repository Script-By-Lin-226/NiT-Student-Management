# Project: NiT Student Management System (NiT-SMS) - To-Do List

## Documentation & AI Logic
- [ ] Write Technical Documentation in `temporary/NiT-SMS-Technical.md`
- [ ] Write Algorithm description in `Algorithm-OF-SMS.md`
- [x] Refactor Course Discount Logic (Shift to Payment-Based):
    - [x] Remove `discount` from `Course` model and schemas
    - [x] Add `discount_amount` to `Payment` model and schemas
    - [x] Update `AdminPanelService` to handle `discount_amount` during payment
    - [x] Update `frontend/services/admin.service.ts` types
    - [x] Update `frontend/app/(portal)/admin/courses/page.tsx` (Remove Discount UI)
    - [x] Update `frontend/app/(portal)/admin/payments/page.tsx` (Add Discount UI)
- [ ] Verify financial calculations in student invoices
- [ ] Final production build and testing
- [ ] Verify JWT and RBAC middleware functionality
- [ ] Ensure database models (SQLAlchemy) match the schema requirements

## Frontend Tasks
- [ ] Review `(auth)` and `(portal)` routes
- [ ] Verify `AdminService` and `PortalService` API integration
- [ ] Ensure consistent UI across all portal pages

## Backend Tasks
- [ ] Review `admin_panel.py` for student and course management logic

## Testing & Quality
- [ ] Run performance tests as planned in `docs/performance_testing_plan.md`
- [ ] Verify login and role-based access security
