# python_analysis/create_player_data.py
import json
import pandas as pd
import os
import sys
import services # Assuming services.py is in the same directory

# --- Configuration ---
SLEEPER_PLAYERS_JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'nfl_players_data.json')
ANALYSIS_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
OUTPUT_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data_output')
ENRICHED_PLAYERS_OUTPUT_PATH = os.path.join(OUTPUT_DATA_DIR, 'enriched_players_master.json')

if not os.path.exists(OUTPUT_DATA_DIR):
    os.makedirs(OUTPUT_DATA_DIR)

def load_and_prep_excel(file_path, original_name_col):
    """Loads, cleanses, and de-duplicates an Excel file."""
    try:
        print(f"Loading data from: {file_path}")
        df = pd.read_excel(file_path, engine='openpyxl')
        # Rename the original name column for consistency
        df.rename(columns={original_name_col: 'player_name_original'}, inplace=True)
        # Cleanse names to create the merge key
        df = services.cleanse_names(df, 'player_name_original')
        
        # --- NEW: De-duplicate the analysis file BEFORE merging ---
        # This prevents issues where one player has multiple ranking entries.
        # We keep the first entry found for each unique cleansed name.
        original_rows = len(df)
        df.drop_duplicates(subset=['player_cleansed_name'], keep='first', inplace=True)
        if len(df) < original_rows:
            print(f"  - De-duplicated {original_rows - len(df)} rows from {os.path.basename(file_path)}.")

        print(f"Successfully loaded and prepped {len(df)} unique rows from {os.path.basename(file_path)}.")
        return df
    except Exception as e:
        print(f"WARNING: Could not load or process {os.path.basename(file_path)}. Error: {e}")
        return pd.DataFrame()

def load_sleeper_player_data(file_path):
    """Loads and prepares the base Sleeper player data."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        player_list = []
        for player_id, details in data.items():
            player_obj = details.copy()
            player_obj['sleeper_player_id'] = player_id
            name_to_cleanse = player_obj.get('full_name') or f"{player_obj.get('first_name','')} {player_obj.get('last_name','')}".strip()
            player_obj['player_name_original'] = name_to_cleanse
            player_list.append(player_obj)
        df_sleeper_players = pd.DataFrame(player_list)
        df_sleeper_players = services.cleanse_names(df_sleeper_players, 'player_name_original')
        print(f"Successfully loaded and prepped {len(df_sleeper_players)} players from Sleeper.")
        return df_sleeper_players
    except Exception as e:
        print(f"Halting process: Error loading Sleeper data from {SLEEPER_PLAYERS_JSON_PATH}: {e}")
        return pd.DataFrame()

def main():
    print("--- Starting Player Data Enrichment Process ---")

    df_sleeper_players = load_sleeper_player_data(SLEEPER_PLAYERS_JSON_PATH)
    if df_sleeper_players.empty:
        return

    sf_rankings_path = os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'SuperflexRankings_June25.xlsx')
    df_superflex_rankings = load_and_prep_excel(sf_rankings_path, 'Player')

    lrqb_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'LRQB_Postdraft_Rookies.xlsx')
    df_lrqb_rookies = load_and_prep_excel(lrqb_path, 'Player')

    # Merge DataFrames using the cleansed name as the key
    df_enriched = df_sleeper_players
    
    if not df_superflex_rankings.empty:
        print("\nMerging Superflex Rankings...")
        # Select only the columns you need from the rankings file to avoid conflicts
        cols_to_merge = [col for col in ['player_cleansed_name', 'Overall', 'Pos. Rank', 'Tier'] if col in df_superflex_rankings.columns]
        df_enriched = pd.merge(df_enriched, df_superflex_rankings[cols_to_merge], on='player_cleansed_name', how='left')
        # --- NEW: Verify the merge by checking for non-null values in a merged column ---
        successful_merges = df_enriched['Overall'].notna().sum()
        print(f"  - Successfully merged 'Overall' rank for {successful_merges} players.")

    if not df_lrqb_rookies.empty:
        print("Merging LRQB Rookie Rankings...")
        cols_to_merge = [col for col in ['player_cleansed_name', 'ZAP Score', 'Category', 'Comparables', 'Draft Capital Delta', 'Notes'] if col in df_lrqb_rookies.columns]
        df_enriched = pd.merge(df_enriched, df_lrqb_rookies[cols_to_merge], on='player_cleansed_name', how='left', suffixes=('', '_lrqb'))
        successful_merges_lrqb = df_enriched['ZAP Score'].notna().sum()
        print(f"  - Successfully merged 'ZAP Score' for {successful_merges_lrqb} players.")

    # Save the final consolidated data
    df_final = df_enriched.where(pd.notna(df_enriched), None)
    print(f"\nTotal players in master dataset: {len(df_final)}")
    print(f"Saving enriched master data to: {ENRICHED_PLAYERS_OUTPUT_PATH}")
    records = df_final.to_dict(orient='records')
    with open(ENRICHED_PLAYERS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=4)
        
    print("--- Data Consolidation Complete! ---")

if __name__ == '__main__':
    main()
