import os
import xlsxwriter

def create_payment_receipt_summary(filename="Payment_Receipt_Summary.xlsx"):
    print(f"Generating {filename}...")
    workbook = xlsxwriter.Workbook(filename)
    
    # Formats
    currency_format = workbook.add_format({'num_format': '$#,##0.00'})
    currency_total_format = workbook.add_format({'bold': True, 'num_format': '$#,##0.00', 'bg_color': '#DCE6F1', 'top': 1})
    bold_format = workbook.add_format({'bold': True})
    total_label_format = workbook.add_format({'bold': True, 'bg_color': '#DCE6F1', 'top': 1})
    
    # 1. Payment Summary Sheet
    ws1 = workbook.add_worksheet("Payment Summary")
    
    columns = ["Receipt ID", "Month", "Student Name", "Payment Method", "Description", "Amount"]
    
    # Set column widths
    ws1.set_column('A:A', 15)
    ws1.set_column('B:B', 15)
    ws1.set_column('C:C', 20)
    ws1.set_column('D:D', 18)
    ws1.set_column('E:E', 25)
    ws1.set_column('F:F', 15, currency_format)
    
    # Sample Data (Adding at least one row to make the table valid)
    data = [
        ["RCT-001", "January", "Alice Smith", "Card", "Tuition Fee", 1500.00],
        ["RCT-002", "January", "Bob Johnson", "Bank Transfer", "Tuition Fee", 1500.00],
        ["RCT-003", "February", "Alice Smith", "Cash", "Book Fee", 200.00],
        ["RCT-004", "February", "Charlie Brown", "Card", "Tuition Fee", 1600.00],
        ["RCT-005", "March", "Bob Johnson", "Bank Transfer", "Workshop", 300.00],
    ]
    
    # Write data so that table includes it
    for row_num, row_data in enumerate(data, start=1):
        ws1.write_row(row_num, 0, row_data)
        
    num_rows = len(data)
    
    # Add Table style
    ws1.add_table(0, 0, num_rows, len(columns) - 1, {
        'columns': [{'header': c} for c in columns],
        'style': 'Table Style Medium 9'
    })
    
    # Overall Total at the bottom
    ws1.write(num_rows + 2, 4, "Overall Total:", total_label_format)
    ws1.write_formula(num_rows + 2, 5, f"=SUM(F2:F{num_rows+1})", currency_total_format)
    
    # 2. Monthly Summary Sheet
    ws2 = workbook.add_worksheet("Monthly Summary")
    ws2.set_column('A:B', 15)
    ws2.set_column('B:B', 15, currency_format)
    
    months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ]
    
    for sum_row, m in enumerate(months, start=1):
        ws2.write(sum_row, 0, m)
        ws2.write_formula(sum_row, 1, f'=SUMIF(\'Payment Summary\'!$B:$B, A{sum_row+1}, \'Payment Summary\'!$F:$F)')
        
    num_months = len(months)
    ws2.add_table(0, 0, num_months, 1, {
        'columns': [{'header': 'Month'}, {'header': 'Total Amount'}],
        'style': 'Table Style Medium 14'
    })
    
    ws2.write(num_months + 2, 0, "Grand Total:", total_label_format)
    ws2.write_formula(num_months + 2, 1, f"=SUM(B2:B{num_months+1})", currency_total_format)
    
    # Add a Chart (Bar or Line)
    chart = workbook.add_chart({'type': 'column'})
    
    chart.add_series({
        'name':       'Monthly Payments',
        'categories': f"='Monthly Summary'!$A$2:$A$13",
        'values':     f"='Monthly Summary'!$B$2:$B$13",
        'fill':       {'color': '#4F81BD'},
    })
    
    # Formatting chart
    chart.set_title({'name': 'Monthly Payment Summary'})
    chart.set_x_axis({'name': 'Month'})
    chart.set_y_axis({'name': 'Total Amount'})
    chart.set_legend({'none': True})
    
    ws2.insert_chart('D2', chart)
    
    workbook.close()
    print(f"Done! Created '{filename}'.")

if __name__ == "__main__":
    create_payment_receipt_summary()
