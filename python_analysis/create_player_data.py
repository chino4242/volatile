# python_analysis/create_player_data.py
import json
import pandas as pd
import os
import sys
import services # Assuming services.py is in the same directory

# --- Configuration ---
# Path to the Sleeper nfl_players_data.json
SLEEPER_PLAYERS_JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'nfl_players_data.json')

# Base directory for your analysis data files
ANALYSIS_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Output path for the new enriched data
OUTPUT_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data_output')
ENRICHED_PLAYERS_OUTPUT_PATH = os.path.join(OUTPUT_DATA_DIR, 'enriched_players_master.json')

if not os.path.exists(OUTPUT_DATA_DIR):
    os.makedirs(OUTPUT_DATA_DIR)

def load_sleeper_player_data(file_path):
    # ... (this function can remain the same as before)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        player_list = []
        for player_id, details in data.items():
            player_obj = details.copy()
            player_obj['sleeper_player_id'] = player_id
            name_to_cleanse = player_obj.get('full_name') or f"{player_obj.get('first_name','')} {player_obj.get('last_name','')}".strip()
            player_obj['player_name_original_sleeper'] = name_to_cleanse
            player_list.append(player_obj)
        df = pd.DataFrame(player_list)
        df = services.cleanse_names(df, 'player_name_original_sleeper')
        print(f"Successfully loaded and prepped {len(df)} players from Sleeper.")
        return df
    except Exception as e:
        print(f"Error loading Sleeper data from {file_path}: {e}")
        return pd.DataFrame()

def main():
    print("--- Starting Player Data Enrichment Process ---")

    # 1. Load Base Sleeper Player Data
    df_sleeper_players = load_sleeper_player_data(SLEEPER_PLAYERS_JSON_PATH)
    if df_sleeper_players.empty:
        print("Halting process: Sleeper player data is empty.")
        return

    # 2. Load Superflex Rankings from Excel
    df_superflex_rankings = pd.DataFrame()
    try:
        sf_rankings_path = os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'SuperflexRankings_June25.xlsx')
        print(f"Loading Excel data from: {sf_rankings_path}")
        df_superflex_rankings = pd.read_excel(sf_rankings_path)
        df_superflex_rankings = services.cleanse_names(df_superflex_rankings, 'Player')
        print(f"Successfully loaded {len(df_superflex_rankings)} rows from SuperflexRankings_June25.xlsx.")
    except Exception as e:
        print(f"WARNING: Could not load or process SuperflexRankings_June25.xlsx. Error: {e}")

    # 3. Load LRQB Post-Draft Rookie Rankings
    df_lrqb_rookies = pd.DataFrame()
    try:
        lrqb_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'LRQB_Postdraft_Rookies.xlsx')
        print(f"Loading Excel data from: {lrqb_path}")
        df_lrqb_rookies = pd.read_excel(lrqb_path)
        df_lrqb_rookies.rename(columns={'Player': 'player_name_original_lrqb'}, inplace=True)
        df_lrqb_rookies = services.cleanse_names(df_lrqb_rookies, 'player_name_original_lrqb')
        print(f"Successfully loaded {len(df_lrqb_rookies)} rows from LRQB_Postdraft_Rookies.xlsx.")
    except Exception as e:
        print(f"WARNING: Could not load or process LRQB_Postdraft_Rookies.xlsx. Error: {e}")

    # --- START DEBUGGING MERGE ---
    print("\n--- DEBUGGING DATA MERGE ---")
    if not df_superflex_rankings.empty:
        sleeper_names_set = set(df_sleeper_players['player_cleansed_name'])
        rankings_names_set = set(df_superflex_rankings['player_cleansed_name'])
        matching_names = sleeper_names_set.intersection(rankings_names_set)
        
        print(f"\nComparing Sleeper names with Superflex Rankings:")
        print(f"Found {len(matching_names)} matching names.")
        if matching_names:
            print("Example matches:", list(matching_names)[:5])
        else:
            print("CRITICAL: 0 matches found. Check cleansing logic and source data names.")
            print("Example Sleeper names:", sorted(list(sleeper_names_set))[:10])
            print("Example Excel names:  ", sorted(list(rankings_names_set))[:10])
    
    if not df_lrqb_rookies.empty:
        sleeper_names_set = set(df_sleeper_players['player_cleansed_name'])
        lrqb_names_set = set(df_lrqb_rookies['player_cleansed_name'])
        matching_names_lrqb = sleeper_names_set.intersection(lrqb_names_set)

        print(f"\nComparing Sleeper names with LRQB Rookie Rankings:")
        print(f"Found {len(matching_names_lrqb)} matching names.")
        if matching_names_lrqb:
            print("Example matches:", list(matching_names_lrqb)[:5])
    # --- END DEBUGGING MERGE ---

    
    # 4. Merge DataFrames
    df_enriched = df_sleeper_players
    if not df_superflex_rankings.empty:
        df_enriched = pd.merge(df_enriched, df_superflex_rankings, on='player_cleansed_name', how='left', suffixes=('', '_sf_rank'))
    if not df_lrqb_rookies.empty:
        df_enriched = pd.merge(df_enriched, df_lrqb_rookies, on='player_cleansed_name', how='left', suffixes=('', '_lrqb'))

    # 5. Save the final consolidated data
    df_final = df_enriched.where(pd.notna(df_enriched), None)
    print(f"\nTotal players in master dataset: {len(df_final)}")
    print(f"Saving enriched master data to: {ENRICHED_PLAYERS_OUTPUT_PATH}")
    records = df_final.to_dict(orient='records')
    with open(ENRICHED_PLAYERS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=4)
    print("--- Data Consolidation Complete! ---")

if __name__ == '__main__':
    main()
