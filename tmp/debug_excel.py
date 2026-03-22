import pandas as pd
import sys

def check_excel(path):
    try:
        df_dict = pd.read_excel(path, sheet_name=None)
        for sheet, df in df_dict.items():
            print(f"Sheet: {sheet}")
            print(f"Columns: {list(df.columns)}")
            print(f"First row: {df.iloc[0].to_dict() if not df.empty else 'Empty'}")
            print("-" * 20)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # The user might have a backup file saved. Let's look for it in the current dir.
    # But usually it's uploaded.
    print("Select a file manually if needed, or I'll look for one.")
