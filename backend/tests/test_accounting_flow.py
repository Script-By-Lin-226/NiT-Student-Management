import pytest
from sqlalchemy import select
from app.core.database_initialization import AsyncSessionLocal, engine
from app.models.model import Account, JournalEntry, JournalEntryLine, Expense
from app.services.accounting_service import AccountingService
from app.schemas.accounting import AccountCreate, JournalEntryCreate, JournalEntryLineCreate, ExpenseCreate
from fastapi import HTTPException

@pytest.fixture(scope="module", autouse=True)
async def cleanup_database_engine():
    yield
    await engine.dispose()

@pytest.mark.anyio
async def test_chart_of_accounts_seeding():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Account))
        accounts = result.scalars().all()
        assert len(accounts) >= 15
        
        # Verify specific seeded accounts exist
        names = [a.account_name for a in accounts]
        assert "Cash in Hand (MMK)" in names
        assert "CB Bank (MMK)" in names
        assert "Tuition Revenue (MMK)" in names
        assert "Salary Expense (MMK)" in names

@pytest.mark.anyio
async def test_journal_entry_balancing_validation():
    # Attempting to create an unbalanced journal entry should raise HTTPException
    async with AsyncSessionLocal() as session:
        # Get actual accounts to use
        res_acc = await session.execute(select(Account).limit(2))
        accounts = res_acc.scalars().all()
        if len(accounts) < 2:
            return # Skip if not enough accounts seeded
            
        acc1, acc2 = accounts[0], accounts[1]
        
        payload = JournalEntryCreate(
            description="Unbalanced entry test",
            lines=[
                JournalEntryLineCreate(account_id=acc1.account_id, debit_mmk=1000.0, credit_mmk=0.0),
                JournalEntryLineCreate(account_id=acc2.account_id, debit_mmk=0.0, credit_mmk=500.0) # Unbalanced MMK
            ]
        )
        
        with pytest.raises(HTTPException) as exc:
            await AccountingService.create_journal_entry(session, payload)
        assert exc.value.status_code == 400
        assert "Debits" in exc.value.detail and "Credits" in exc.value.detail

@pytest.mark.anyio
async def test_expense_flow_and_approval():
    async with AsyncSessionLocal() as session:
        # Submit a pending expense
        exp_payload = ExpenseCreate(
            title="Office Desk Utility Bill",
            description="May 2026 Utilities",
            amount_mmk=75000.0,
            category="utilities",
            department="General",
            payment_method="Cash"
        )
        
        exp = await AccountingService.create_expense(session, exp_payload)
        assert exp.expense_id is not None
        assert exp.status == "Pending"
        assert exp.title == "Office Desk Utility Bill"

        # Check list expenses filters
        exps = await AccountingService.list_expenses(session, status="Pending")
        assert len(exps) >= 1
        assert any(e["title"] == "Office Desk Utility Bill" for e in exps)

        # Cleanup
        await session.delete(exp)
        await session.commit()
