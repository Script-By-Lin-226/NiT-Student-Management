# NiT Student Management System (NiT-SMS) - Technical Documentation

## 1. Introduction
The **NiT Student Management System (NiT-SMS)** is a production-ready, full-stack Enterprise Resource Planning (ERP) application designed for NiT College (Networking and Information Technology). The system aims to automate college operations including student registration, course management, academic timeline tracking, financial transactions (invoices/payments), and staff management.

## 2. System Architecture
The application follows a **3-Layer Backend Clean Architecture** coupled with a modern **Next.js Frontend**.

### Layer 1: Presentation (Frontend)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Fetching**: Axios / Fetch with React Query for optimized caching and dashboard performance.
- **Routing**: Role-based routing separation using Next.js route groups (`(auth)` and `(portal)`).

### Layer 2: Business Logic (Backend)
- **Framework**: FastAPI (Python)
- **Application Server**: Uvicorn / Gunicorn
- **Business Logic**: Concentrated in `app/services/` (e.g., `admin_panel.py`).
- **Middleware**: 
    - `AuthMiddleware` for JWT verification and session handling.
    - `LatencyLoggingMiddleware` for performance monitoring.
    - `CORSMiddleware` for secure cross-origin communication.
    - `RateLimiter` (slowapi) to prevent brute-force and DDoS attacks.

### Layer 3: Data Access (ORM & DB)
- **ORM**: SQLAlchemy (declarative style).
- **Database**: PostgreSQL (Supabase for cloud / Local for dev).
- **Migration**: Alembic for version-controlled schema updates.

---

## 3. Backend Modules & Components

### API Layer (`app/controller/v1/`)
- **`authentication_route.py`**: Handles user login, logout, and token refresh.
- **`admin_route.py`**: Exposes CRUD endpoints for students, courses, payments, academic years, etc.
- **`portal_route.py`**: Features specifically for student/teacher portals.
- **`staff_route.py`**: HR and staff attendance management.

### Service Layer (`app/services/`)
- **`admin_panel.py`**: The core "engine" of the backend, managing complex logic like paginated student listings, bulk enrollment, installment payment processing, and automatic ID generation.
- **`authentication_service.py`**: Logic for password hashing (bcrypt) and JWT generation.
- **`rbac_portal.py`**: Role-Based Access Control logic for verifying permissions.

### Models (`app/models/model.py`)
- **`User`**: Unified model for Student, Teacher, Admin, HR, etc., with `role` field.
- **`Course`**: Academic course details including fees (MMK and GBP).
- **`Enrollment`**: Linking users to courses with payment plans.
- **`Payment`**: Tracking financial transactions (Cash, Bank Transfer, Mobile).
- **`Attendance`**: Tracking student attendance per slot (Morning/Afternoon/Evening).
- **`ActivityLog`**: System audit trail for admin actions.

---

## 4. Frontend Design & State Management
- **Dashboard UI**: High-contrast modern tech theme (optimized for administration).
- **Services (`frontend/services/`)**: Centralized API clients (`AdminService`, `AuthService`) that wrap Axios calls.
- **Components**: Modular React components for tables, modals, sidebars, and forms.
- **State**: Mix of React Context (auth state) and Server State (React Query for data fetching).

## 5. Security & Authentication
1. **JWT Auth**: Access tokens (15 mins) and Refresh tokens (7 days) stored in secure HTTP-only cookies and managed via middleware.
2. **RBAC**: Every endpoint in the backend and route in the frontend checks the user's `role` against required permissions. Roles include: `admin`, `student`, `teacher`, `hr`, `manager`, `sales`.
3. **Database Security**: Password hashing with Bcrypt, protected database URIs via environment variables.

## 6. Deployment & Operations
- **Containerization**: Dockerized backend and frontend.
- **Hosting**: Backend on Railway/Render (PaaS) and Frontend on Vercel.
- **Monitoring**: Centralized logging utility for API requests, errors, and external service failures.
