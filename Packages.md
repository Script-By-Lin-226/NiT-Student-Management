# Project Dependency & Package Analysis

This document details the packages and libraries used in this project across both the **Front-End** and **Back-End** environments. The packages are grouped by functional categories, specifically highlighting PDF export, API handling, data backup, and other utilities.
postgresql://nit_db_yca1_user:qoECkymDXjpIC4QAXcuyTur0zNkwk4Xc@dpg-d6vavjfkijhs73coa82g-a.singapore-postgres.render.com/nit_db_yca1
---

## 🖥️ Front-End Dependencies (`frontend`)

The frontend is built on **Next.js 16 (React 19)** using TypeScript and Tailwind CSS. The configuration is defined in the [package.json](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/package.json).

### 1. PDF Export & Receipts
These libraries are responsible for client-side generation of printable documents, such as payment receipts and income reports.

*   **`jspdf` (`^4.2.1`)**
    *   **Purpose:** Core library used to generate PDF documents directly in the browser.
    *   **Usage in Project:**
        *   Used in [pdfReceipt.ts](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/utils/pdfReceipt.ts) to generate formatted A4/A5 receipts (with support for Myanmar Pyidaungsu fonts, watermark logos, and signature placements).
        *   Used in [pdfIncomeReport.ts](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/utils/pdfIncomeReport.ts) to generate landscape format financial income reports.
*   **`jspdf-autotable` (`^5.0.7`)**
    *   **Purpose:** A `jsPDF` plugin for generating tables in PDF documents.
    *   **Usage in Project:**
        *   Renders list of payments inside [pdfReceipt.ts](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/utils/pdfReceipt.ts#L254) and structured financial reports inside [pdfIncomeReport.ts](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/utils/pdfIncomeReport.ts).

### 2. API Communication & Query State Management
These packages handle all communication with the FastAPI backend.

*   **`axios` (`^1.13.6`)**
    *   **Purpose:** A promise-based HTTP client for browser requests.
    *   **Usage in Project:**
        *   Configured as the primary client in [api.ts](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/services/api.ts) with request/response interceptors to manage Bearer auth tokens.
*   **`@tanstack/react-query` (`^5.95.0`) & `@tanstack/react-query-devtools` (`^5.95.0`)**
    *   **Purpose:** A powerful library for fetching, caching, synchronizing, and updating server state.
    *   **Usage in Project:** Used across pages to manage data-fetching life cycles, caching, and cache invalidation.

### 3. Excel & Data Export
*   **`xlsx` (SheetJS) (`^0.18.5`)**
    *   **Purpose:** Utility for parser and writer of various spreadsheet formats (Excel, CSV).
    *   **Usage in Project:**
        *   [excelExport.ts](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/utils/excelExport.ts): Generates custom formatted spreadsheet files on the client side.
        *   [students/page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/students/page.tsx): Exports selected student details and systems backup.
        *   [backup/page.tsx](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/frontend/app/(portal)/admin/backup/page.tsx): Handles loading local `.xlsx` files to upload database backups.

### 4. UI Elements, Iconography & Analytics
*   **`recharts` (`^3.8.0`):** Graph and charts library used to display financial overview statistics and visual reports.
*   **`lucide-react` (`^0.577.0`):** Modern SVG icon collection.
*   **`sonner` (`^2.0.7`):** Toast notifications.
*   **`@ducanh2912/next-pwa` (`^10.2.9`):** Configures Progressive Web App (PWA) capabilities.
*   **`clsx` (`^2.1.1`) & `tailwind-merge` (`^3.5.0`):** Helper functions to construct dynamic class strings and resolve Tailwind class conflicts.
*   **`@vercel/analytics` (`^2.0.1`) & `@vercel/speed-insights` (`^2.0.0`):** Ingests telemetry and page load speed details.

---

## 🐍 Back-End Dependencies (`backend`)

The backend is built on **Python FastAPI** and uses **PostgreSQL/SQLite** via SQLAlchemy. Configured dependencies are found in [requirements.txt](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/backend/requirements.txt).

### 1. API Framework & Core Web Server
*   **`fastapi` (`0.135.1`) & `starlette` (`0.52.1`)**
    *   **Purpose:** Web API framework and underlying ASGI toolkit.
    *   **Usage in Project:** Used to build routers and controllers like [admin_route.py](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/backend/app/controller/v1/admin_route.py) and [accounting_route.py](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/backend/app/controller/v1/accounting_route.py).
*   **`uvicorn[standard]` (`0.34.2`)**
    *   **Purpose:** High-performance ASGI server for running the FastAPI application.
*   **`pydantic` (`2.12.5`) & `pydantic-settings` (`2.9.1`)**
    *   **Purpose:** Data validation, serialization, and settings management using Python type annotations.
    *   **Usage in Project:** Powers the request/response data schemas.

### 2. Database & ORM
*   **`SQLAlchemy` (`2.0.48`)**
    *   **Purpose:** SQL toolkit and Object Relational Mapper (ORM).
    *   **Usage in Project:** Maps Python model classes (defined in [model.py](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/backend/app/models/model.py)) to SQL database tables.
*   **`alembic` (`1.13.1`)**
    *   **Purpose:** Database migrations management for SQLAlchemy.
*   **`psycopg2-binary` (`2.9.9`) & `asyncpg` (`0.31.0`)**
    *   **Purpose:** Synchronous and Asynchronous database drivers/adapters for PostgreSQL.

### 3. Excel Processing & Backup Operations
*   **`pandas` (`2.2.3`) & `openpyxl` (`3.1.5`)**
    *   **Purpose:** Powerful data analysis toolkit (`pandas`) and Excel reader/writer engine (`openpyxl`).
    *   **Usage in Project:**
        *   Used in [backup_service.py](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/backend/app/services/backup_service.py) to extract database tables, serialize dates/datetimes, and pack all data sheets into a single download file.
        *   Also handles reading uploaded Excel sheets to restore backups and seed databases in [reset_db.py](file:///c:/Users/Script-Kid/Desktop/NiT-Student-Management/backend/scripts/reset_db.py).

### 4. Security & Authentication
*   **`bcrypt` (`4.2.0`) & `passlib` (`1.7.4`)**
    *   **Purpose:** Secure password hashing utilities.
*   **`python-jose` (`3.5.0`) & `cryptography` (`42.0.5`)**
    *   **Purpose:** JSON Web Token (JWT) encoding, decoding, validation, and signature verification.
*   **`email-validator` (`2.3.0`):** Syntactic and deliverability validation of email addresses during registration.

### 5. Utility Packages
*   **`slowapi` (`0.1.9`):** Rate limiter for API endpoint traffic control.
*   **`redis` (`5.0.1`):** Cache and background workers driver.
*   **`httpx` (`0.28.1`):** An asynchronous HTTP client for calling external API services.
*   **`python-dotenv` (`1.2.2`):** Automatically loads environment variables from `.env` files.
*   **`python-multipart` (`0.0.9`):** Enables parsing of multipart form requests (needed for file upload inputs like Excel sheets).
