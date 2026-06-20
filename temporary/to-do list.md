# To-Do List: Voucher (Receipt) Design Updates

- [x] Increase logo size in PDF Receipt from 28x28mm to 36x36mm.
- [x] Adjust header positions and spacing to align with the larger logo.
- [x] Relocate the summary block (Tuition Paid, Exam Fee Paid, Grand Total, etc.) to flow directly under the payment transaction table (at `finalY + 5`).
- [x] Position the signature block and contact footer dynamically at the bottom of the page (`Math.max(summaryEndY + 12, 235)`).
- [x] Increase logo size in PDF Receipt from 36x36mm to 45x45mm.
- [x] Remove "NiT College" header text.
- [x] Make "Payment Receipt" the main header text, styled bold, size 18, vertically centered relative to the logo.
- [x] Adjust header layout variables (`headerX`, divider line Y position, and `contentY`) to accommodate the larger 45x45mm logo.
- [x] Center the logo horizontally on the PDF page (`x = 82.5`).
- [x] Position the "Payment Receipt" title directly under the logo, horizontally centered (`x = 105`, `{ align: "center" }`).
- [x] Adjust the divider line and student info layout (`contentY`) relative to the new centered header height.
- [ ] Increase logo size further to 50x50mm.
- [ ] Keep "Payment Receipt" text size at 12pt (styled bold for emphasis) rather than making it larger.

# Parent Portal Payment Details
- [x] Backend: Add `get_child_payments` to `ParentPortalService` in `portal_service.py`
- [x] Backend: Add route `GET /portal/parent/children/{student_code}/payments` in `portal_route.py`
- [x] Frontend: Add `ChildPayment` interface and `getChildPayments` method to `portal.service.ts`
- [x] Frontend: Update `useDashboardData` hook to fetch child payments
- [x] Frontend: Update `DashboardPage` parent view to display payment KPI cards and detailed fees summary

# Parent Portal Individual Payment Records
- [x] Backend: Add nested payment transaction records in `get_child_payments` response
- [x] Frontend: Update `ChildPayment` interface in `portal.service.ts` to include `payments` list
- [x] Frontend: Add collapsible sub-table in parent dashboard fees summary to view individual transactions

# Parent Portal Exam Fee Display
- [x] Backend: Expose exam fee summary fields in `get_child_payments` response
- [x] Frontend: Update `ChildPayment` interface in `portal.service.ts` to include exam fee fields
- [x] Frontend: Display Exam Fee column in Tuition & Fees Summary table on parent dashboard
- [x] Frontend: Display Exam Fee column in Transactions modal on parent dashboard

# Payment Receipt ID
- [x] Add `receipt_id` column to `Payment` model and DB schema via Alembic migrations.
- [x] Create function to generate unique `receipt_id` with format `nit-daymonthyear-0000001` (daily sequencing) when registering payments.
- [x] Expose `receipt_id` in serialization of payments for admin panel and portal endpoints.
- [x] Render `receipt_id` centered directly under the header on the PDF receipt.
- [x] Backfill all existing payments using the daily sequential receipt ID format chronologically.

# Mobile UI Fixes
- [x] Fix Modal bottom navigation overlap issue on mobile by changing z-index from 50 to 70 in:
  - [x] Timetables Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/timetables/page.tsx)
  - [x] Users (Staff) Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/users/page.tsx)
  - [x] Parents Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/parents/page.tsx)
  - [x] Students Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/students/page.tsx)
  - [x] Rooms Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/rooms/page.tsx)
  - [x] Payments Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/payments/page.tsx)
  - [x] Enrollments Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/enrollments/page.tsx)
  - [x] Courses Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/courses/page.tsx)
  - [x] Attendance Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/attendance/page.tsx)
  - [x] Academic Years Page: [page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/academic-years/page.tsx)

# Activity Logs Auto-Refresh
- [x] Add `refetchInterval` to `useActivityLogs` in `frontend/hooks/useAdmin.ts` for automatic background refreshing (polling) of logs without manual page reload.
- [x] Update `frontend/app/(portal)/admin/activity/page.tsx` to handle manual refetch spinner state without showing annoying spinner animations during background polling, and ensure that new logs display automatically.


