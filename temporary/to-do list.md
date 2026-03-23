# Task: Admin Password Management & Forgot Password Fix

## Completed
- [x] Backend: Add `UserPasswordChange` and `AdminUserPasswordChange` schemas in `app/schemas/user.py`.
- [x] Backend: Add `change_user_password` and `change_self_password` methods in `AdminPanelService` (`app/services/admin_panel.py`).
- [x] Backend: Add `PUT /admin/users/{user_code}/password` and `PUT /admin/profile/password` routes in `app/controller/v1/admin_route.py`.
- [x] Frontend: Add `changeUserPassword` and `changeSelfPassword` methods in `AdminService` (`services/admin.service.ts`).
- [x] Frontend: Create `/forgot-password` page to resolve 404 error and advise users to contact Admin.
- [x] Frontend: Add "Change Password" modal and action button to the Staff Management page (`app/(portal)/admin/users/page.tsx`).
- [x] Frontend: Add "Security" section with password change form to the Profile page (`app/(portal)/profile/page.tsx`).
- [x] Frontend: Remove `MobileNav` (bottom bar) from `PortalLayout` and adjust bottom padding.
- [x] Frontend: Update `MobileHeader` to include all navigation links (including Backup) in the side drawer.

## Notes
- The "Change Password" action for staff uses the `AdminUserPasswordChange` schema (no old password required).
- The "Self Change Password" action uses the `UserPasswordChange` schema (requires old password verification).
- The `/forgot-password` route was missing, causing a 404. It now correctly informs users on how to proceed.
