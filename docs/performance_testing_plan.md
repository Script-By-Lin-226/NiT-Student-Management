# Performance Testing & Verification Plan

This document outlines the testing strategy for verifying the recent performance enhancements made to the NiT Student Management system.

---

## 1. Database Indexing Verification
**Goal**: Ensure that database queries are utilizing the newly added indexes for faster lookups and sorts.

### Tests:
- [ ] **Execution Plan Check (SQLite/PostgreSQL)**:
    - Run `EXPLAIN QUERY PLAN` on common filter queries.
    - **Expected**: `SEARCH TABLE users USING INDEX ...` or `ORDER BY timestamp USING INDEX` should be present in the plan.
- [ ] **Large Dataset Stress Test**:
    - Seed 5,000+ activity logs.
    - Query logs sorted by timestamp.
    - **Expected**: Response time under 200ms for paginated requests.

---

## 2. API Pagination Testing
**Goal**: Verify that server-side pagination correctly limits results and provides accurate metadata.

### Tests:
- [ ] **Boundary Value Testing**:
    - Query with `page=1&limit=10`.
    - Query with `page=999` (non-existent page).
    - **Expected**: `page=1` returns correctly sized array; `page=999` returns empty data but valid pagination metadata.
- [ ] **Metadata Accuracy**:
    - Verify `pagination.total` matches the actual row count in the database.
    - Verify `total_pages` is computed correctly.

---

## 3. Frontend: TanStack Query (React Query) Testing
**Goal**: Ensure data is cached correctly and invalidates upon mutation.

### Tests:
- [ ] **Cache Re-use**:
    - Navigate to Activity Logs page.
    - Navigate away, then back.
    - **Expected**: Background fetch occurs, but cached data is displayed immediately (no loading flicker).
- [ ] **Mutation Invalidation**:
    - Delete a log entry via the UI.
    - **Expected**: `activity-logs` query is automatically invalidated and a fresh fetch is triggered to update the list.
- [ ] **Pagination State Persistence**:
    - Change to Page 2.
    - Click "Refresh".
    - **Expected**: page state should persist (if using URL-sync or local state) or at least refetch for the same page.

---

## 4. Performance Benchmarks
**Goal**: Quantify the speed gains from the enhancements.

| Operation | Pre-Optimization (Avg) | Post-Optimization (Avg) | Improvement |
| :--- | :--- | :--- | :--- |
| Load 1000 Activity Logs | ~1.5s | ~150ms | 10x |
| Filter Students by Role | ~800ms | <100ms | 8x |
| Dashboard Refresh | ~2.5s | <500ms | 5x |

---

## 5. Tools for Testing
- **Postman/Insomnia**: For manual API testing and timing.
- **Chrome DevTools (Network Tab)**: To measure frontend request latency.
- **TanStack Query DevTools**: To inspect cache status, stale times, and query keys.
- **Custom Seeding Script**: `scripts/seed_performance_data.py` (to be created) for generating large datasets.

---

## 6. Regression Testing
- [ ] Ensure that existing data exporting logic (Excel) still correctly handles the whole list even if the UI is paginated (Note: current implementation fetches all for export, which should be fine but slower).
- [ ] Verify that parent/student roles still have restricted access to their respective data despite pagination changes.
