import pandas as pd
import json
import os
import re

# --- CONFIGURATION ---
# This script assumes it is located in the 'python_analysis' directory.
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(CURRENT_DIR, '..', 'server')

# --- INPUT FILE PATHS ---
SLEEPER_PLAYERS_PATH = os.path.join(SERVER_DIR, 'data', 'nfl_players_data.json')
SUPERFLEX_RANKINGS_PATH = os.path.join(CURRENT_DIR, 'data', 'superflex', 'SuperflexRankings_June25.xlsx')
# Add other analysis file paths here as needed...

# --- OUTPUT FILE PATH ---
OUTPUT_DIR = os.path.join(CURRENT_DIR, 'data_output')
ENRICHED_PLAYERS_OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'enriched_players_master.json')

# --- HELPER FUNCTIONS ---

def cleanse_name(name):
    """A consistent function to cleanse player names for matching."""
    if not isinstance(name, str):
        return ''
    return re.sub(r"[^\w\s']+", '', name).strip().lower()

def load_and_prep_sleeper_data(filepath):
    """Loads Sleeper data and prepares it as a DataFrame."""
    print(f"Loading Sleeper data from: {filepath}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        player_list = [details for player_id, details in data.items()]
        df = pd.DataFrame(player_list)
        df['player_cleansed_name'] = df['full_name'].apply(cleanse_name)
        # Ensure sleeper_player_id is a string for consistent merging
        df['sleeper_player_id'] = df['player_id'].astype(str)
        print(f"Successfully loaded and prepped {len(df)} players from Sleeper.")
        return df
    except Exception as e:
        print(f"ERROR loading Sleeper data: {e}")
        return pd.DataFrame()

def load_and_prep_excel_data(filepath, player_name_column):
    """Generic function to load an Excel file and cleanse player names."""
    print(f"Loading Excel data from: {filepath}")
    try:
        df = pd.read_excel(filepath)
        df['player_cleansed_name'] = df[player_name_column].apply(cleanse_name)
        print(f"Successfully loaded {len(df)} rows from {os.path.basename(filepath)}.")
        return df
    except Exception as e:
        print(f"ERROR loading Excel file {os.path.basename(filepath)}: {e}")
        return pd.DataFrame()

# --- MAIN EXECUTION ---

def main():
    """Main function to orchestrate the data consolidation process."""
    print("--- Starting Player Data Consolidation ---")
    
    # 1. Load the base Sleeper player data
    df_sleeper = load_and_prep_sleeper_data(SLEEPER_PLAYERS_PATH)
    if df_sleeper.empty:
        print("Halting process: Base Sleeper data could not be loaded.")
        return
        
    # 2. Load your custom analysis from SuperflexRankings_June25.xlsx
    df_superflex_ranks = load_and_prep_excel_data(
        SUPERFLEX_RANKINGS_PATH, 
        player_name_column='Player' 
    )

    # Add more data loading here for other files as you expand...

    # 3. Merge the data
    print("\n--- Merging DataFrames ---")
    
    master_df = df_sleeper.copy()
    
    # Merge Superflex Rankings
    if not df_superflex_ranks.empty:
        # Define the columns we want to add from the rankings file
        # Make sure these column names exactly match your Excel file headers
        sf_columns_to_merge = [
            'player_cleansed_name', 
            'Overall', 
            'Pos. Rank', 
            'Tier'
        ]
        
        # Check if all required columns exist in the DataFrame
        missing_cols = [col for col in sf_columns_to_merge if col not in df_superflex_ranks.columns]
        if missing_cols:
            print(f"WARNING: The following columns were not found in {os.path.basename(SUPERFLEX_RANKINGS_PATH)} and will be skipped: {missing_cols}")
            # Remove missing columns from the list to avoid an error
            sf_columns_to_merge = [col for col in sf_columns_to_merge if col not in missing_cols]

        if 'player_cleansed_name' in sf_columns_to_merge:
             master_df = pd.merge(
                master_df, 
                df_superflex_ranks[sf_columns_to_merge], 
                on='player_cleansed_name', 
                how='left' # 'left' merge keeps all players from the base Sleeper list
            )
             print("Merged Superflex Rankings.")

    # (You would add more pd.merge calls here for each new DataFrame)

    # 4. Save the final enriched dataset
    print(f"\nTotal players in master dataset: {len(master_df)}")
    
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    print(f"Saving enriched master data to: {ENRICHED_PLAYERS_OUTPUT_PATH}")
    
    # Convert any NaN values from the merge to None (which becomes 'null' in JSON)
    # This is better than sending 'NaN' to the frontend.
    master_df_cleaned = master_df.where(pd.notna(master_df), None)
    
    master_df_cleaned.to_json(ENRICHED_PLAYERS_OUTPUT_PATH, orient='records', indent=4)
    
    print("--- Data Consolidation Complete! ---")


if __name__ == '__main__':
    main()
