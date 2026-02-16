import pandas as pd
import os

base_dir = r"c:\Users\ryanj\Documents\volatile\python_analysis\data"
files = [
    os.path.join(base_dir, "superflex", "SuperflexRankings_September25.xlsx")
]

for f in files:
    print(f"--- Checking {os.path.basename(f)} ---")
    try:
        df = pd.read_excel(f, engine='openpyxl')
        print("Columns:", df.columns.tolist())
        print("First 2 rows:")
        print(df.head(2))
    except Exception as e:
        print(f"Error: {e}")
    print("\n")
