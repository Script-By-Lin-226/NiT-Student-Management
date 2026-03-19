# ERP Payment System Upgrade - To-Do List

## 1. Application Architecture & Setup
- [ ] Define Payment models and update the database schema (receipt ID, amount, payment method, description, month/date).
- [ ] Create API routes in `backend/api/routes` for managing payments (CRUD operations).
- [ ] Set up Payment controllers and Business Logic services.
- [ ] Implement database migrations for the new `Payment` table/entity.

## 2. Generate Payment Summaries (Excel Integration)
- [x] Create a Python script (`scripts/generate_payment_receipt_summary.py`) using `xlsxwriter` to format the Excel summary.
- [ ] Create a Backend service using `xlsxwriter` to dynamically generate the Payment Summary Excel file from real PostgreSQL data.
- [ ] Set up a REST endpoint (e.g., `GET /api/payments/export/excel`) to download the generated file.

## 3. Frontend Web Interface
- [ ] Create a new UI section dedicated to "Payments" in the Dashboard.
- [ ] Build a summary dashboard showing total payments grouped by month.
- [ ] Include an "Export" button in the frontend (calls backend Excel generator).

## 4. MCP & External APIs Integration (Optional, as per GEMINI.md)
- [ ] Connect a dummy Payment Gateway Service (Stripe / PayPal) if requested, located in `backend/integrations/`.
- [ ] Configure `MCP_SERVER_URL` explicitly for dynamic tool execution via the generic interface.

## 5. Security & Testing
- [ ] Secure payment routes using JWT Auth.
- [ ] Perform Unit/Integration tests on Excel generation endpoints.
- [ ] Validate User Input effectively when creating a payment receipt.
