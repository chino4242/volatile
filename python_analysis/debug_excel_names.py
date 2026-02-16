import pandas as pd
import os
from name_utils import cleanse_name

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_1QB = os.path.join(BASE_DIR, 'data', '1QB', 'Dynasty1QBRankings_September25.xlsx')
FILE_SF = os.path.join(BASE_DIR, 'data', 'superflex', 'SuperflexRankings_September25.xlsx')

def search_file(filepath, search_terms):
    print(f"--- Searching {os.path.basename(filepath)} ---")
    try:
        xls = pd.ExcelFile(filepath, engine='openpyxl')
        print(f"Sheets found: {xls.sheet_names}")
        
        for sheet in xls.sheet_names:
            print(f"  Scanning sheet: '{sheet}'")
            df = pd.read_excel(filepath, sheet_name=sheet, engine='openpyxl')
            
            # Check for 'Player' column or similar
            target_col = 'Player'
            if target_col not in df.columns:
                # Try finding a column that looks like player name
                for col in df.columns:
                    if 'player' in str(col).lower():
                        target_col = col
                        break
            
            if target_col not in df.columns:
                print(f"    - Column 'Player' not found in '{sheet}'. Skipping.")
                continue

            for term in search_terms:
                # Case insensitive search
                matches = df[df[target_col].astype(str).str.contains(term, case=False, na=False)]
                if not matches.empty:
                    print(f"    - FOUND matches for '{term}' in '{sheet}':")
                    for _, row in matches.iterrows():
                        raw_name = row[target_col]
                        cleansed = cleanse_name(raw_name)
                        print(f"      * Raw: '{raw_name}' | Cleansed: '{cleansed}'")
                else:
                    pass
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    terms = ["Gadsden", "Washington"]
    search_file(FILE_1QB, terms)
    search_file(FILE_SF, terms)
