from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.schemas.accounting import AccountCreate, JournalEntryCreate, ExpenseCreate
from app.services.accounting_service import AccountingService
from app.services.rbac_portal import validating_admin_role
from typing import Optional

router = APIRouter(prefix="/admin/accounting", tags=["Accounting"])

# Helper to get current authenticated user ID
def _user_id_from_request(request: Request) -> int:
    user = getattr(request.state, "user", None)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.get("user_id")

@router.get("/accounts")
async def list_accounts(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.list_accounts(session)
    return {"success": True, "data": data, "error": None}

@router.post("/accounts")
async def create_account(payload: AccountCreate, request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=False, allow_accountant=True)
    acc = await AccountingService.create_account(session, payload)
    return {"success": True, "data": {"account_id": acc.account_id, "account_name": acc.account_name}, "error": None}

@router.get("/journal-entries")
async def list_journal_entries(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.list_journal_entries(session, start_date, end_date)
    return {"success": True, "data": data, "error": None}

@router.post("/journal-entries")
async def create_journal_entry(payload: JournalEntryCreate, request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    entry = await AccountingService.create_journal_entry(session, payload)
    return {"success": True, "data": {"entry_id": entry.entry_id, "description": entry.description}, "error": None}

@router.get("/cash-book")
async def get_cash_book(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_book_logs(session, "Cash")
    return {"success": True, "data": data, "error": None}

@router.get("/bank-book")
async def get_bank_book(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_book_logs(session, "Bank")
    return {"success": True, "data": data, "error": None}

@router.get("/student-ledger/{student_id}")
async def get_student_ledger(student_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_student_ledger(session, student_id)
    return {"success": True, "data": data, "error": None}

@router.get("/trial-balance")
async def get_trial_balance(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_trial_balance(session)
    return {"success": True, "data": data, "error": None}

@router.get("/income-statement")
async def get_income_statement(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_income_statement(session)
    return {"success": True, "data": data, "error": None}

@router.get("/balance-sheet")
async def get_balance_sheet(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_balance_sheet(session)
    return {"success": True, "data": data, "error": None}

# --- Expenses ---

@router.get("/expenses")
async def list_expenses(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.list_expenses(session, start_date, end_date, category, status, department)
    return {"success": True, "data": data, "error": None}

@router.post("/expenses")
async def create_expense(payload: ExpenseCreate, request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    exp = await AccountingService.create_expense(session, payload)
    return {"success": True, "data": {"expense_id": exp.expense_id, "title": exp.title}, "error": None}

@router.post("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    user_id = _user_id_from_request(request)
    exp = await AccountingService.approve_expense(session, expense_id, user_id)
    return {"success": True, "data": {"expense_id": exp.expense_id, "status": exp.status}, "error": None}

@router.post("/expenses/{expense_id}/reject")
async def reject_expense(expense_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    user_id = _user_id_from_request(request)
    exp = await AccountingService.reject_expense(session, expense_id, user_id)
    return {"success": True, "data": {"expense_id": exp.expense_id, "status": exp.status}, "error": None}

@router.get("/budget-vs-actual")
async def get_budget_vs_actual(request: Request, session: AsyncSession = Depends(get_db)):
    await validating_admin_role(request, allow_sales=True, allow_accountant=True)
    data = await AccountingService.get_budget_vs_actual(session)
    return {"success": True, "data": data, "error": None}
