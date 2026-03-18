# NiT College ERP -- AI Engineering Specification

## Role

Act as a **Senior Full‑Stack Web Developer, System Architect, and AI
Engineering Agent**.

You are responsible for designing and building a **Student Management System for NiT College (Networking and Information
Technology)**.

The system must follow **enterprise‑level architecture, clean
engineering practices, and scalable design patterns** and *** Reference Dashboard UI from './reference'. ***.

Your output must include:

-   Full **Next.js Frontend**
-   Full **FastAPI Backend**
-   **JWT Authentication System**
-   **RBAC Authorization**
-   **Admin Dashboard**
-   **Clean Modular Codebase**
-   **API Documentation**
-   **Setup and Deployment Instructions**
-   **Engineering Logs for maintainability**
-   **CRUD for all functionalities**
-   **All code must be modular, reusable, and easily extendable. **

------------------------------------------------------------------------

# 1. Project Objective

Build a **Modern College ERP System** to manage:

-   Students
-   Staff
-   Courses
-   Academic Timeline
-   Finance
-   Inventory
-   Sales and Marketing Operations

The system must support **full operational lifecycle management for a
technology college**.

Before coding, the AI agent must:

1. Analyze requirements
2. Design system architecture
3. Design database schema
4. Generate directory structure
5. Create todo-list.md in ./temporary
6. Implement backend first
7. Implement frontend second

Primary goal:

**Streamline operations from student admission to financial management
and inventory tracking.**

------------------------------------------------------------------------

# 2. System Architecture

The application MUST follow **3‑Layer Clean Architecture**.

## Layer 1 --- Presentation Layer

Technology:

-   Next.js (React)
-   TypeScript
-   TailwindCSS

Responsibilities:

-   UI rendering
-   Dashboard visualization
-   Form handling
-   Client validation
-   API communication
-   RBAC protected routes

Restrictions:

-   Must NOT contain business logic
-   Must NOT directly access database

------------------------------------------------------------------------

## Layer 2 --- Application Layer

Technology:

-   FastAPI (Python)

Responsibilities:

-   Business logic
-   Authentication
-   Authorization
-   Financial logic engine
-   Installment processing
-   Data validation using Pydantic
-   API endpoints
-   External integrations

------------------------------------------------------------------------

## Layer 3 --- Data Layer

Technology:

-   PostgreSQL

Responsibilities:

-   Store structured relational data
-   Maintain financial integrity
-   Maintain transactional history
-   Support reporting queries

------------------------------------------------------------------------

# 3. Core ERP Modules

## Home Page

Professional landing page for **NiT College (Networking and Information
Technology)**.

Content:

-   College introduction
-   Courses overview
-   Facilities
-   Contact information

Design:

Modern, Minimalist, High‑Contrast Tech Theme.

------------------------------------------------------------------------

## Core Features

# 4. Course & Academic Year Management
This module allows administrators to manage the academic structure of the institution.
Key Features:
• Create and manage Academic Years (e.g., 2026-2027)
• Create Courses / Classes / Programs/branch
• Assign subjects to courses
•Track course capacity and enrolled students
•Easy course search and filtering

# 5. Student Registration Module
This module manages the full lifecycle of student registration.
Key Features:
· Register new students with full protile information
•Store student personal details (Name, NRC/Passport, Date of Birth, Address, Contact)
• Assign students to courses automatically
•Track student enrollment status
· Manage student records centrally in the system

# 6. Smart Student ID Automation
This feature automatically generates a unique student ID for every registered student.
Key Features:
· Automatic Student ID generation
·Configurable ID format (Example: STD-2026-001)
• Student ID card information storage
• Prevent duplicate student IDs
• Quick search by Student ID

# 7. Invoice & Payment Integration (Accounting)
This module integrates student payments directly with the accounting system.
Key Features:
• Automatic invoice generation for course fees
• Record student payments (Cash / Bank Transfer / Mobile Payment)
· Payment tracking and outstanding balance monitoring
· Automatic accounting entries in the system
·Payment history for each student
Provides management with real-time data and insights.
Key Features:
• Total number of students dashboard
• Course enrollment statistics
• Revenue and payment reports
• Student registration reports
· Export reports to Excel

------------------------------------------------------------------------

# 8. Project Folder Structure

Use a **clean scalable directory structure**.

    project-root/

    frontend/
        components/
        pages/
        hooks/
        services/
        styles/
        utils/
        types/

    backend/
        api/
        routers/
        controllers/
        models/
        schemas/
        services/
        auth/
        middleware/
        database/

    docs/
    tests/
    scripts/

    temporary/
        code-log.md
        engineering-report.md

------------------------------------------------------------------------

# 9. Security Requirements

Security must include:

JWT Authentication

Role Based Access Control

Protected admin routes

Secure API endpoints

Password hashing (bcrypt)

Input validation

Rate limiting

Secure HTTP headers

CORS configuration

All secrets must be stored in:

`.env`

Example:

DATABASE_URL\
JWT_SECRET\
API_KEYS

------------------------------------------------------------------------

# 10. API Design

Use REST API conventions.

Examples:

GET /api/students\
GET /api/students/{id}\
POST /api/students\
PUT /api/students/{id}\
DELETE /api/students/{id}

Standard response format:

    {
      "success": true,
      "data": {},
      "error": null
    }

------------------------------------------------------------------------

# 11. Documentation Requirements

The system must generate documentation.

Location:

    docs/

Required documents:

-   architecture.md
-   api-documentation.md
-   environment-setup.md
-   deployment-guide.md

FastAPI must automatically generate:

Swagger / OpenAPI docs.

------------------------------------------------------------------------

# 12. Development Roadmap

Phase 1

System setup

-   FastAPI backend
-   Next.js frontend
-   JWT authentication
-   RBAC system

Phase 2

Student and Course Management modules.

Phase 3

Financial engine implementation.

Phase 4

Inventory and HR payroll modules.

Phase 5

Dashboard analytics and reporting.

Phase 6

Testing and deployment.

------------------------------------------------------------------------

# 13. Engineering Rules

The AI agent must follow these rules:

-   Maintain clean modular architecture
-   Separate frontend and backend logic
-   Controllers must not contain business logic
-   Services must implement core logic
-   Repositories must handle database access
-   Avoid code duplication
-   Write maintainable code

------------------------------------------------------------------------

# 14. Logging and Maintainability

Every development step must be logged.

Location:

    ./temporary/

Required logs:

code-log.md

This must include:

-   files created
-   files modified
-   purpose of each module
-   explanation of backend logic

Goal:

Make future maintenance and refactoring easy.

------------------------------------------------------------------------

# 15. Hosting For Firebase MCP and Database For Supabase MCP 

------------------------------------------------------------------------

# 16. When generating code always show:

File Path:
Example: backend/services/student_service.py

Errors must follow format

{
  "success": false,
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student does not exist"
  }
}

------------------------------------------------------------------------

# 17. Expected Final Output

The system must generate:

1.  Complete **Next.js frontend**
2.  Complete **FastAPI backend**
3.  JWT authentication system
4.  RBAC authorization
5.  Admin dashboard
6.  Financial management engine
7.  Inventory system
8.  Student lifecycle system
9.  Clean project directory
10. Setup instructions
11. Engineering logs

------------------------------------------------------------------------

# End of Specification
