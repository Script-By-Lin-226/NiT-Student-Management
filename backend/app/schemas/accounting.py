from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class AccountCreate(BaseModel):
    account_name: str
    account_type: str  # Asset | Liability | Equity | Revenue | Expense
    currency: Optional[str] = "MMK"

class JournalEntryLineCreate(BaseModel):
    account_id: int
    debit_mmk: Optional[float] = 0.0
    credit_mmk: Optional[float] = 0.0
    debit_gbp: Optional[float] = 0.0
    credit_gbp: Optional[float] = 0.0

class JournalEntryCreate(BaseModel):
    entry_date: Optional[date] = None
    description: str
    reference: Optional[str] = None
    entry_type: Optional[str] = "journal"
    student_id: Optional[int] = None
    lines: List[JournalEntryLineCreate]

class ExpenseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount_mmk: float
    category: str  # utilities | maintenance | salaries | petty_cash | others
    expense_date: Optional[date] = None
    department: Optional[str] = None
    budget_amount: Optional[float] = None
    payment_method: Optional[str] = "Cash"
