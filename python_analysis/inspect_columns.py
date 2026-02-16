import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_1QB = os.path.join(BASE_DIR, 'data', '1QB', 'Dynasty1QBRankings_September25.xlsx')

FILE_SF = os.path.join(BASE_DIR, 'data', 'superflex', 'SuperflexRankings_September25.xlsx')

files = [FILE_1QB, FILE_SF]

for f in files:
    print(f"--- Inspecting {os.path.basename(f)} ---")
    try:
        df = pd.read_excel(f, sheet_name='Rankings and Tiers', engine='openpyxl')
        print("Columns:", df.columns.tolist())
        print(f"Total Rows: {len(df)}")
        
        terms = ["Oronde", "Parker", "Gad", "Wash"]
        for term in terms:
            matches = df[df['Player'].astype(str).str.contains(term, case=False, na=False)]
            if not matches.empty:
                print(f"Matches for '{term}':")
                print(matches[['Player']].to_string())
            else:
                print(f"No matches for '{term}'")
    except Exception as e:
        print(f"Error: {e}")
