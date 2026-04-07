# NiT Student Management System (NiT-SMS) - Core Algorithms

This document outlines the logical processes and algorithms that drive the student management system's core functionalities.

---

## 1. Authentication & RBAC Flow
**Goal**: Secure user access and provide role-specific features.
1.  **Login Algorithm**:
    -   Receive `username/email` and `password`.
    -   Lookup `User` by username/email in the `users` table.
    -   Verify password hash using `bcrypt`.
    -   Generate a short-lived `JWT access token` (15 mins) and a long-lived `refresh token` (7 days).
    -   Store the refresh token in the `refresh_tokens` table.
    -   Return tokens and basic user profile (role, name) to the frontend.
2.  **RBAC Logic**:
    -   **Frontend**: Next.js middleware or higher-order component checks current user role before rendering dashboard layouts.
    -   **Backend**: `AuthMiddleware` extracts JWT, verifies validity, and confirms the `role` field matches the required permissions for the endpoint (e.g., `admin` only for `DELETE /api/users`).

---

## 2. Student Enrollment Algorithm
**Goal**: Link a student to a course and initialize their financial record.
1.  **Validation**:
    -   Check if the Student exists (`user_id`).
    -   Check if the Course exists (`course_id`) and has an active Academic Year.
    -   Verify the student isn't already enrolled in the same course for the current period.
2.  **Processing**:
    -   Assign a unique `enrollment_code` (e.g., `STU-2026-001`).
    -   Create an `Enrollment` record.
    -   Initialize a `Payment` plan based on the course's `fee_full_payment` or `fee_installment`.
    -   If a `downpayment` is provided, create an initial `Payment` record with status `Paid`.
3.  **Output**:
    -   Confirm enrollment success and trigger invoice generation for remaining fees.

---

## 3. Financial Tracking & Payment Algorithm
**Goal**: Maintain consistent accounting for student fees and installments.
1.  **Payment Processing**:
    -   Identify the `enrollment_id`.
    -   Input `amount`, `payment_method`, `month` (for installments), and `discount_amount` (optional).
    -   Verification: Ensure `amount + discount_amount` does not exceed the remaining balance for that enrollment.
    -   Record the transaction in the `payments` table.
    -   Store `discount_amount` directly in the `payments` record for transactional immutability.
2.  **Balance Calculation**:
    -   `Total Disount` = `SUM(discount_amount)` for all payments of an enrollment.
    -   `Total Paid` = `SUM(amount)` for all payments of an enrollment.
    -   `Left Amount` = `Course Cost - (Total Paid + Total Discount)`.
3.  **Fine Calculation**:
    -   Compare current date with `due_date` (if applicable).
    -   If late, apply `fine_amount` to the transaction.
4.  **Receipt & Export**:
    -   Aggregate enrollment details, payment details, discounts, and remaining balance into a structured PDF receipt or Excel report.

---

## 4. Attendance Management Algorithm
**Goal**: Periodic (slot-based) attendance tracking for students and staff.
1.  **Marking Attendance**:
    -   Select a `Date` (defaulting to today), a `Slot` (Morning/Afternoon/Evening), and a `Batch`.
    -   For each student in the batch:
        -   Create an `Attendance` record with `is_present` status.
        -   Apply a **Unique Constraint** (`user_id`, `attendance_date`, `slot`) to prevent duplicate marking for the same student in the same slot.
2.  **Reporting**:
    -   Calculate attendance percentage per student for the course duration to monitor academic performance.

---

## 5. Dashboard Analytics Logic
**Goal**: High-level KPI visualization for administrators.
1.  **Student Metrics**: `COUNT(*)` from `users` where `role = 'student'`.
2.  **Enrollment Stats**: Group by `course_id` and count active enrollments.
3.  **Revenue Analytics**: `SUM(amount)` from `payments` filtered by current month/year.
4.  **Activity Logs**: Retrieve the latest `N` records from `activity_logs` order by `timestamp DESC` to show recent system actions.

---

## 6. Smart Student ID Generation
**Goal**: Automated, collision-free student identification.
1.  Get current `Academic Year`.
2.  Count existing student registrations for that year.
3.  Format: `CO/IN[index][month][year]` (e.g., `CO0001226`).
4.  Ensure uniqueness at the database level using `UniqueConstraint`.
