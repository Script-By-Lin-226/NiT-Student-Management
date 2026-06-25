"""
NiT Student Management System - Excel Finance System Processor
This script loads the Chart of Accounts (COA) and transactions from the Excel monthly report,
performs validation on incoming transactions, and generates financial summaries.
"""

import os
import sys
import pandas as pd

# Reconfigure stdout for UTF-8 output formatting on Windows systems
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# In-memory storage for transaction records
income_records = []
expense_records = []
coa = {}

def clean_code(val):
    """
    Cleans account codes read from pandas. Converts float representations (e.g. 41010.0)
    to clean integer-like strings (e.g. "41010") and removes whitespace.
    """
    if pd.isna(val):
        return None
    if isinstance(val, float):
        if val.is_integer():
            val = int(val)
    return str(val).strip()

def load_coa(file_path):
    """
    Loads Chart of Accounts from the 'COA' sheet of the Excel file.
    Categorizes accounts under 'Income' or 'Expense' based on headers dynamically.
    Returns:
        dict: Chart of Accounts dictionary structure.
    """
    global coa
    coa.clear()
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel report file not found at: {file_path}")
        
    df = pd.read_excel(file_path, sheet_name="COA", header=None)
    active_type = None
    
    for idx, row in df.iterrows():
        val0 = row[0]
        val1 = row[1]
        
        code = clean_code(val0)
        name = str(val1).strip() if pd.notna(val1) else None
        
        # Determine section markers
        if code is None and name is not None:
            if name.lower() == "received":
                active_type = "Income"
            elif name.lower() in ["payment", "expense"]:
                active_type = "Expense"
            continue
            
        if code is None and name is None:
            continue
            
        if code.lower() == "code":
            continue
            
        # Skip empty names or placeholders (like NaN / '0')
        if not name or name == "nan" or name == "0":
            continue
            
        if active_type is not None:
            coa[code] = {
                "name": name,
                "type": active_type
            }
            
    return coa

def load_initial_transactions(file_path):
    """
    Reads existing transactions from the 'Received' (Income) and 'Payment' (Expense) sheets
    in the Excel file to pre-populate the in-memory lists.
    """
    global income_records, expense_records
    income_records.clear()
    expense_records.clear()
    
    # 1. Load Received (Income)
    try:
        df_rec = pd.read_excel(file_path, sheet_name="Received")
        # Row 0 contains the headers
        if not df_rec.empty:
            # Re-read using row 0 as header
            df_rec.columns = df_rec.iloc[0]
            df_rec = df_rec.iloc[1:] # Drop the header row from values
            
            for idx, row in df_rec.iterrows():
                code = clean_code(row.get("Code"))
                date_val = str(row.get("Date")).strip() if pd.notna(row.get("Date")) else None
                amount_val = row.get("Amount")
                pay_method = str(row.get("Payment")).strip() if pd.notna(row.get("Payment")) else None
                comment = str(row.get("Comment")).strip() if pd.notna(row.get("Comment")) else ""
                
                if code and date_val and amount_val is not None:
                    try:
                        add_income(
                            date=date_val,
                            code=code,
                            amount=float(amount_val),
                            payment_type=pay_method,
                            comment=comment
                        )
                    except ValueError as e:
                        print(f"Skipping invalid initial income row {idx}: {e}")
    except Exception as e:
        print(f"Notice: Could not load initial income transactions: {e}")

    # 2. Load Payment (Expense)
    try:
        df_pay = pd.read_excel(file_path, sheet_name="Payment")
        if not df_pay.empty:
            df_pay.columns = df_pay.iloc[0]
            df_pay = df_pay.iloc[1:] # Drop the header row
            
            for idx, row in df_pay.iterrows():
                code = clean_code(row.get("Code"))
                date_val = str(row.get("Date")).strip() if pd.notna(row.get("Date")) else None
                amount_val = row.get("Total") if pd.notna(row.get("Total")) else row.get("Price")
                pay_method = str(row.get("Payment")).strip() if pd.notna(row.get("Payment")) else None
                comment = str(row.get("Comment")).strip() if pd.notna(row.get("Comment")) else ""
                
                if code and date_val and amount_val is not None:
                    try:
                        add_expense(
                            date=date_val,
                            code=code,
                            amount=float(amount_val),
                            payment_method=pay_method,
                            comment=comment
                        )
                    except ValueError as e:
                        print(f"Skipping invalid initial expense row {idx}: {e}")
    except Exception as e:
        print(f"Notice: Could not load initial expense transactions: {e}")

def add_income(date, code, amount, payment_type, comment):
    """
    Adds a validated income record to the system.
    """
    # 1. Reject missing fields
    if not date or not code or amount is None or not payment_type:
        raise ValueError("Validation Error: Missing required fields (date, code, amount, payment_type)")
        
    # 2. Reject if code not in COA
    if code not in coa:
        raise ValueError(f"Validation Error: Account code '{code}' does not exist in Chart of Accounts")
        
    # 3. Reject negative amount
    if amount < 0:
        raise ValueError("Validation Error: Amount cannot be negative")
        
    # 4. Reject if account is not of type Income
    if coa[code]["type"] != "Income":
        raise ValueError(f"Validation Error: Account '{code}' ({coa[code]['name']}) is of type '{coa[code]['type']}', not Income")
        
    income_records.append({
        "date": date,
        "code": code,
        "amount": amount,
        "payment_type": payment_type,
        "comment": comment
    })

def add_expense(date, code, amount, payment_method, comment):
    """
    Adds a validated expense record to the system.
    """
    # 1. Reject missing fields
    if not date or not code or amount is None or not payment_method:
        raise ValueError("Validation Error: Missing required fields (date, code, amount, payment_method)")
        
    # 2. Reject if code not in COA
    if code not in coa:
        raise ValueError(f"Validation Error: Account code '{code}' does not exist in Chart of Accounts")
        
    # 3. Reject negative amount
    if amount < 0:
        raise ValueError("Validation Error: Amount cannot be negative")
        
    # 4. Reject if account is not of type Expense
    if coa[code]["type"] != "Expense":
        raise ValueError(f"Validation Error: Account '{code}' ({coa[code]['name']}) is of type '{coa[code]['type']}', not Expense")
        
    expense_records.append({
        "date": date,
        "code": code,
        "amount": amount,
        "payment_method": payment_method,
        "comment": comment
    })

def calculate_totals():
    """
    Calculates total income, total expense, and net cash.
    Returns:
        tuple: (total_income, total_expense, net_cash)
    """
    total_income = sum(rec["amount"] for rec in income_records)
    total_expense = sum(rec["amount"] for rec in expense_records)
    net_cash = total_income - total_expense
    return total_income, total_expense, net_cash

def generate_report():
    """
    Generates a structured summary report of income and expense grouped by account.
    Prints to stdout.
    """
    total_income, total_expense, net_cash = calculate_totals()
    
    # Aggregate by account code
    income_by_code = {}
    expense_by_code = {}
    
    for rec in income_records:
        code = rec["code"]
        income_by_code[code] = income_by_code.get(code, 0.0) + rec["amount"]
        
    for rec in expense_records:
        code = rec["code"]
        expense_by_code[code] = expense_by_code.get(code, 0.0) + rec["amount"]
        
    print("\n" + "="*50)
    print("           FINANCIAL SUMMARY REPORT")
    print("="*50)
    
    print("\n--- INCOME ACCOUNTS ---")
    print(f"{'CODE':<10} | {'ACCOUNT NAME':<35} | {'TOTAL (MMK)':>15}")
    print("-"*66)
    
    # Iterate through all income accounts in COA to show structured report
    for code, info in sorted(coa.items()):
        if info["type"] == "Income":
            amount = income_by_code.get(code, 0.0)
            print(f"{code:<10} | {info['name']:<35} | {amount:>15,.2f}")
            
    print("-"*66)
    print(f"{'TOTAL INCOME':<48} | {total_income:>15,.2f}")
    
    print("\n--- EXPENSE ACCOUNTS ---")
    print(f"{'CODE':<10} | {'ACCOUNT NAME':<35} | {'TOTAL (MMK)':>15}")
    print("-"*66)
    
    # Iterate through all expense accounts in COA
    for code, info in sorted(coa.items()):
        if info["type"] == "Expense":
            amount = expense_by_code.get(code, 0.0)
            print(f"{code:<10} | {info['name']:<35} | {amount:>15,.2f}")
            
    print("-"*66)
    print(f"{'TOTAL EXPENSE':<48} | {total_expense:>15,.2f}")
    
    print("\n" + "="*50)
    print(f"{'NET CASH FLOW':<33} | {net_cash:>14,.2f}")
    print("="*50 + "\n")

if __name__ == "__main__":
    # Locate target Excel file
    default_excel = r"C:\Users\Script-Kid\Downloads\NiT .... 2026 Monthly Report-.xlsx"
    
    print(f"Loading Chart of Accounts from: {default_excel}")
    try:
        # Load COA
        load_coa(default_excel)
        print(f"Successfully loaded {len(coa)} accounts from COA sheet.")
        
        # Load initial transactions
        load_initial_transactions(default_excel)
        print(f"Loaded initial database transactions.")
        print(f"Current state: Income records = {len(income_records)}, Expense records = {len(expense_records)}")
        
        # Display initial report
        print("\n>>> INITIAL REPORT FROM EXCEL DATA:")
        generate_report()
        
        # --- Sample Usage ---
        print("\n>>> RUNNING SAMPLE USAGE TRANSACTIONS...")
        
        # 1. Add valid income
        print("Recording payment for NCC Level 3 (code 41010)...")
        add_income(
            date="2026-06-25",
            code="41010",
            amount=50000.0,
            payment_type="KBZPay",
            comment="Mid-term Installment"
        )
        
        # 2. Add valid expense
        print("Recording rental fee expense (code 6-1010)...")
        add_expense(
            date="2026-06-25",
            code="6-1010",
            amount=15000.0,
            payment_method="Cash",
            comment="Classroom 6 fan repairs"
        )
        
        # 3. Validation demonstration: Negative amount
        try:
            print("\nAttempting to add income with negative amount...")
            add_income(
                date="2026-06-25",
                code="41010",
                amount=-1000.0,
                payment_type="Kpay",
                comment="Negative validation test"
            )
        except ValueError as e:
            print(f"Blocked successfully: {e}")
            
        # 4. Validation demonstration: Non-existent account code
        try:
            print("\nAttempting to add expense with invalid account code '99-9999'...")
            add_expense(
                date="2026-06-25",
                code="99-9999",
                amount=500.0,
                payment_method="Cash",
                comment="Invalid code validation test"
            )
        except ValueError as e:
            print(f"Blocked successfully: {e}")
            
        # 5. Validation demonstration: Adding expense to income account type
        try:
            print("\nAttempting to record an expense under an Income account code (41010)...")
            add_expense(
                date="2026-06-25",
                code="41010",
                amount=2000.0,
                payment_method="Cash",
                comment="Incorrect type validation test"
            )
        except ValueError as e:
            print(f"Blocked successfully: {e}")
            
        # Regenerate report with new records
        print("\n>>> FINAL REPORT AFTER SAMPLE ADDITIONS:")
        generate_report()
        
    except Exception as err:
        print(f"An error occurred: {err}")
