# To-Do List - Fix Income Summary Exports & Include Student Transactions

- [x] Create `./temporary` directory and prepare this to-do list
- [x] Modify `backend/app/services/admin_panel.py`
  - [x] Adjust `start_date` and `end_date` filters timezone to UTC
  - [x] Adjust grouping keys (`day_key`, `week_key`, `month_key`) to local timezone
- [x] Modify `frontend/utils/excelExport.ts` to support multiple sheets
- [x] Modify `frontend/utils/pdfIncomeReport.ts` to include detailed student transactions table
- [x] Modify `frontend/app/(portal)/admin/payments/page.tsx`
  - [x] Implement detailed mapping helper `getDetailedTransactionsForExport`
  - [x] Update Excel summary export buttons (multi-sheet)
  - [x] Update PDF summary export buttons
  - [x] Update the main Export Income Excel export
- [x] Verify functionality
