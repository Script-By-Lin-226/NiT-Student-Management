# NiT Student Management System (NiT-SMS) - Technical Documentation

## 1. Executive Summary
The **NiT Student Management System (NiT-SMS)** is a production-grade, full-stack Enterprise Resource Planning (ERP) platform designed specifically for NiT College (Networking and Information Technology). The system automates the complete student lifecycle, from registration and enrollment to financial management and attendance tracking.

## 2. System Architecture
The application follows a **3-Layer Backend Clean Architecture** coupled with a modern **Next.js Frontend**.

### Layer 1: Presentation (Frontend)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS with Tailwind CSS for rapid layouting.
- **State Management**: React Query (for server state) and React Context (for local auth state).
- **Architecture**: Modular components organized by feature (dashboard, tables, forms).

### Layer 2: Business Logic (Backend)
- **Framework**: FastAPI (Python)
- **Structure**: 
    - **Controllers**: API route definitions (`app/controller/v1/`).
    - **Services**: Core business logic and workflow orchestration (`app/services/`).
    - **Repositories**: Isolated database interaction layer (`app/repositories/`).
- **Middleware**: Includes Latency Logging, JWT Authentication, and Rate Limiting.

### Layer 3: Data Access (Database)
- **ORM**: SQLAlchemy (Declarative mapping).
- **Database**: PostgreSQL (Production) / SQLite (Local/Dev).
- **Migrations**: Alembic for version-controlled schema evolution.

---

## 3. Core Modules & Features

### 3.1. Infrastructure & Academic Setup
- **Academic Years**: Management of academic cycles (e.g., 2026-2027) with start/end dates.
- **Course & Subject Management**: Relational mapping of courses to their component subjects.
- **Batch Management**: Ability to divide courses into distinct student groups (batches) for parallel scheduling.
- **Room Management**: Dynamic tracking of physical/virtual room capacity and availability per day/slot.
- **Timetabling**: Unified scheduling system linking Teachers, Rooms, Batches, and Subjects.

### 3.2. User & Student Lifecycle
- **Smart ID Generation**: Automated generation of student/staff codes using configurable formats (e.g., `CO/IN[INDEX][MONTH][YEAR]`).
- **Unified User Management**: Single source of truth for Students, Teachers, Parents, and Staff with role-based attributes.
- **Approval Workflow**: Support for pending student registrations that require admin approval.
- **Parent-Student Linking**: Explicit relational mapping for multi-child parent accounts.

### 3.3. Financial Management Engine
- **Flexible Billing**: Supports full-payment discounts and installment-based fee structures.
- **Transaction immutability**: All payments and discounts are recorded as individual non-editable ledger entries.
- **Multi-method Payments**: Support for Cash, Bank Transfer, and Mobile POS tracking.
- **Automated Balancing**: Real-time balance calculations factoring in dynamic discounts and cumulative payments.

### 3.4. Daily Operations & Security
- **Attendance Tracking**: Slot-based attendance (Morning/Afternoon/Evening) with duplicate prevention.
- **Teaching Hours Reporting**: Automated calculation of teacher workload and instructional hours.
- **Auditing**: Comprehensive `ActivityLog` tracking all administrative actions for accountability.
- **RBAC**: Granular permissions preventing unauthorized access to financial or administrative data.

---

## 4. Functional Workflows

### 4.1. System Initialization Flow
1. **Academic Year Setup**: Admin creates the current academic year.
2. **Resource Definition**: Admin defines Rooms and Subjects.
3. **Course Creation**: Admin creates a Course and associates it with relevant Subjects.
4. **Batch Generation**: Admin creates one or more Batches for a Course to define student groups.
5. **Timetable Assignment**: Admin assigns a Teacher, Subject, and Room to a Batch for specific days/slots.

### 4.2. Student Onboarding & Enrollment Flow
1. **Account Creation**: Admin creates a User with the `student` role.
2. **Smart ID Assignment**: System automatically generates a unique Student Code.
3. **Enrollment**: Admin links the Student to a batch/course via `AdminEnrollmentCreate`.
4. **Financial Initialization**: An initial balance is calculated based on course fees.
5. **Approval**: (Optional) Admin approves the student status to enable portal access.

### 4.3. Financial Transaction Flow
1. **Invoicing**: The system tracks the "Left Amount" (Balance) for each enrollment.
2. **Payment Input**: Staff records a payment (Amount + Discount + Method).
3. **Verification**: System ensures `Amount + Discount` does not exceed the current Balance.
4. **Processing**: A new `Payment` record is created, and the Enrollment's internal balance is updated.
5. **Reconciliation**: Payments are summarized in the Dashboard and Exported via Excel for accounting.

### 4.4. Daily Academic Flow
1. **Attendance Marking**: Teacher/Staff selects a Batch and Slot (e.g., Morning) and marks presence.
2. **Validation**: System checks for existing records to prevent double-marking.
3. **Workload Tracking**: The system calculates "Teaching Hours" based on Timetable slots and marked attendance.

### 4.5. Data Maintenance & Backup Flow
1. **Security Purge**: Admin can use `purge-data` to clear non-admin records for new academic cycles.
2. **System Backup**: Admin triggers `backup/export` to generate a comprehensive Excel master-file.
3. **Restoration**: Admin uses `backup/import` to reconstruct the system state from a validated Excel file.

---

## 5. Key Algorithms

### 5.1. Authentication Flow
1. **Login**: User submits credentials -> Backend verifies via Bcrypt.
2. **Token Issuance**: System issues a short-lived JWT (Access) and long-lived Refresh token.
3. **Refresh**: Client uses Refresh token to Rotate Access tokens without re-login.

### 5.2. Balance Calculation Algorithm
- **Formula**: `Balance = Course_Cost - SUM(Payments.amount) - SUM(Payments.discount_amount)`
- **Rule**: Every payment transaction must specify if it includes a discount to ensure the ledger remains balanced.

---

## 6. Directory Structure
```text
project-root/
├── frontend/             # Next.js 15 (App Router)
│   ├── app/              # (auth) and (portal) route groups
│   ├── components/       # UI Library (Standardized Dashboard Components)
│   ├── services/         # Axios-based API clients (portal.service, etc.)
│   └── hooks/            # Custom React hooks (useAuth, etc.)
├── backend/              # FastAPI (Python)
│   ├── app/
│   │   ├── controller/   # Versioned API Endpoints (v1/admin, v1/portal)
│   │   ├── services/     # Business logic layers (AdminPanelService)
│   │   ├── repositories/ # SQL Alchemy database operations
│   │   ├── models/       # Relational Database schemas
│   │   └── schemas/      # Pydantic request/response models
│   ├── migration/        # Alembic database versions
│   └── scripts/          # Manual maintenance and utility scripts
└── docs/                 # Technical documentation & Design specs
```

---

## 7. Quality & Operations
- **Middleware Layers**: Latency logging, Rate limiting (slowapi), CORS, and Token Rotation.
- **Monitoring**: Centralized logging in `backend/logs/` categorized by request path.
- **Testing**: Manual test cases in `docs/test_plan.md` covering all CRUD operations.
- **Scalability**: Backend optimized for high-volume student records (100k+) via indexed queries and paginated list views.
