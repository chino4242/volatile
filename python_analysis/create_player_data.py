# python_analysis/create_player_data.py
import json
import pandas as pd
import os
import numpy as np
import requests # Make sure to install this: pip install requests
import re # Import the regular expressions module

# --- Configuration ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DATA_DIR = os.path.join(CURRENT_DIR, '..', 'server', 'data')
SLEEPER_PLAYERS_JSON_PATH = os.path.join(SERVER_DATA_DIR, 'nfl_players_data.json')
ANALYSIS_DATA_DIR = os.path.join(CURRENT_DIR, 'data')
ENRICHED_PLAYERS_OUTPUT_PATH = os.path.join(SERVER_DATA_DIR, 'enriched_players_master.json')
CONSOLIDATED_ANALYSIS_PATH = os.path.join(CURRENT_DIR, 'analysis_results', 'consolidated_analysis.json')

if not os.path.exists(SERVER_DATA_DIR):
    os.makedirs(SERVER_DATA_DIR)

# --- Helper Functions ---
def cleanse_name(name):
    if not isinstance(name, str): return ""
    cleaned_name = name.lower()
    suffixes_to_remove = [' iii', ' iv', ' ii', ' jr', ' sr', ' v']
    for suffix in suffixes_to_remove:
        if cleaned_name.endswith(suffix):
            cleaned_name = cleaned_name[:-len(suffix)].strip()
            break
    cleaned_name = re.sub(r"[^\w\s']", '', cleaned_name)
    cleaned_name = re.sub(r'\s+', ' ', cleaned_name).strip()
    return cleaned_name

def cleanse_df_names(df, name_column):
    if name_column in df.columns:
        df['player_cleansed_name'] = df[name_column].apply(cleanse_name)
    return df

def load_consolidated_analysis(file_path):
    print(f"--- Loading consolidated AI analysis from: {file_path} ---")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        print(f"--- WARNING: Consolidated analysis file not found or invalid at {file_path}. ---")
        return {}

def fetch_fantasy_calc_data(is_dynasty=True, num_qbs=2, ppr=1):
    url = f"https://api.fantasycalc.com/values/current?isDynasty={is_dynasty}&numQbs={num_qbs}&ppr={ppr}&numTeams=12"
    print(f"Fetching player values from FantasyCalc: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        players = response.json()
        if not isinstance(players, list): return pd.DataFrame()
        player_list = [
            {'sleeper_id': str(p.get('player', {}).get('sleeperId')), 'fantasy_calc_value': p.get('value')}
            for p in players if p.get('player', {}).get('sleeperId')
        ]
        print(f"Successfully loaded {len(player_list)} players with Sleeper IDs from FantasyCalc.")
        return pd.DataFrame(player_list)
    except requests.exceptions.RequestException as e:
        print(f"WARNING: Could not fetch FantasyCalc data. Error: {e}")
        return pd.DataFrame()

def load_and_prep_excel(file_path, column_rename_map, original_name_col='Player'):
    try:
        print(f"Loading data from: {os.path.basename(file_path)}")
        df = pd.read_excel(file_path, engine='openpyxl')
        df.rename(columns={original_name_col: 'player_name_original'}, inplace=True)
        df = cleanse_df_names(df, 'player_name_original')
        df.rename(columns=column_rename_map, inplace=True)
        df.drop_duplicates(subset=['player_cleansed_name'], keep='first', inplace=True)
        return df
    except Exception as e:
        print(f"WARNING: Could not load or process {os.path.basename(file_path)}. Error: {e}")
        return pd.DataFrame()

def load_sleeper_player_data(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        player_list = []
        for player_id, details in data.items():
            player_obj = details.copy()
            player_obj['sleeper_id'] = str(player_id)
            name_to_cleanse = player_obj.get('full_name') or f"{player_obj.get('first_name','')} {player_obj.get('last_name','')}".strip()
            player_obj['player_name_original'] = name_to_cleanse
            player_list.append(player_obj)
        df = pd.DataFrame(player_list)
        df = cleanse_df_names(df, 'player_name_original')
        print(f"Successfully loaded and prepped {len(df)} players from Sleeper.")
        return df
    except Exception as e:
        print(f"Halting process: Error loading Sleeper data: {e}")
        return pd.DataFrame()

def main():
    print("--- Starting Player Data Enrichment Process ---")
    
    # Step 1: Load all source data
    df_sleeper_players = load_sleeper_player_data(SLEEPER_PLAYERS_JSON_PATH)
    if df_sleeper_players.empty: return

    df_fantasy_calc = fetch_fantasy_calc_data()
    ai_analysis_lookup = load_consolidated_analysis(CONSOLIDATED_ANALYSIS_PATH)

    # --- Create specific rename maps for each data source to avoid column name collisions ---
    sf_dynasty_rename_map = {'Overall': 'sf_dynasty_overall_rank', 'Pos. Rank': 'sf_dynasty_pos_rank', 'Tier': 'sf_dynasty_tier'}
    qb_dynasty_rename_map = {'Overall': 'qb_dynasty_overall_rank', 'Pos. Rank': 'qb_dynasty_pos_rank', 'Tier': 'qb_dynasty_tier'}
    sf_redraft_rename_map = {'Overall': 'sf_redraft_overall_rank', 'Pos. Rank': 'sf_redraft_pos_rank', 'Tier': 'sf_redraft_tier'}
    qb_redraft_rename_map = {'Overall': 'qb_redraft_overall_rank', 'Pos. Rank': 'qb_redraft_pos_rank', 'Tier': 'qb_redraft_tier'}
    
    lrqb_rename_map = {'ZAP Score': 'zap_score', 'Category': 'category', 'Comparables': 'comparables', 'Draft Capital Delta': 'draft_capital_delta', 'Notes': 'notes_lrqb'}
    rsp_rename_map = {
        'RSP Pos. Ranking': 'rsp_pos_rank', 'RSP 2023-2025 Rank': 'rsp_2023_2025_rank', 'RP 2021-2025 Rank': 'rp_2021_2025_rank',
        'Comparison Spectrum': 'comparison_spectrum', 'Depth of Talent Score': 'depth_of_talent_score',
        'Depth of Talent Description': 'depth_of_talent_desc', 'RSP Notes': 'notes_rsp'
    }

    # Load all the Excel files using their specific rename maps
    df_dynasty_superflex = load_and_prep_excel(os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'SuperflexRankings_August25.xlsx'), sf_dynasty_rename_map)
    df_lrqb = load_and_prep_excel(os.path.join(ANALYSIS_DATA_DIR, 'common', 'LRQB_Postdraft_Rookies.xlsx'), lrqb_rename_map)
    df_rsp = load_and_prep_excel(os.path.join(ANALYSIS_DATA_DIR, 'common', 'RSP_Rookies.xlsx'), rsp_rename_map)
    df_1qb_redraft = load_and_prep_excel(os.path.join(ANALYSIS_DATA_DIR, '1QB', 'Redraft1QB_August1_25.xlsx'), qb_redraft_rename_map)
    df_dynasty_1qb = load_and_prep_excel(os.path.join(ANALYSIS_DATA_DIR, '1QB', '1QBRankings_August25.xlsx'), qb_dynasty_rename_map)
    df_sf_redraft = load_and_prep_excel(os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'RedraftSFlex_August1_25.xlsx'), sf_redraft_rename_map)
    
    # Step 2: Enrich the complete Sleeper list with Excel data
    print("\nEnriching full Sleeper list with analysis data by name...")
    df_enriched = df_sleeper_players.copy()
    
    analysis_dfs_to_merge = [
        df_dynasty_superflex, df_dynasty_1qb, df_sf_redraft, 
        df_1qb_redraft, df_lrqb, df_rsp
    ]
    
    # --- THIS IS THE CORRECTED MERGE LOGIC ---
    # It merges each analysis DataFrame one by one. Because we pre-renamed the columns,
    # there will be no conflicts, and no data will be lost.
    for df_analysis in analysis_dfs_to_merge:
        if not df_analysis.empty:
            # We only need to bring in the new columns, as player_name_original is already there
            cols_to_merge = [col for col in df_analysis.columns if col != 'player_name_original']
            df_enriched = pd.merge(df_enriched, df_analysis[cols_to_merge], on='player_cleansed_name', how='left')

    print("Initial Excel enrichment complete.")

    # Step 3: Add the consolidated AI analysis
    if ai_analysis_lookup:
        print("--- Adding AI analysis to the master list... ---")
        df_enriched['gemini_analysis'] = df_enriched['player_cleansed_name'].map(ai_analysis_lookup)
        
    # Step 4: Final merge with FantasyCalc data
    print("Merging final list with FantasyCalc data by Sleeper ID...")
    df_enriched['sleeper_id'] = df_enriched['sleeper_id'].astype(str)
    if not df_fantasy_calc.empty:
        df_fantasy_calc['sleeper_id'] = df_fantasy_calc['sleeper_id'].astype(str)
        df_final_enriched = pd.merge(df_enriched, df_fantasy_calc, on='sleeper_id', how='left')
    else:
        df_final_enriched = df_enriched
        df_final_enriched['fantasy_calc_value'] = None # Add column if it doesn't exist
    
    print(f"Final merge complete. Master list contains {len(df_final_enriched)} players.")

    # Step 5: Final cleanup and save
    df_final_enriched = df_final_enriched.astype(object).replace({np.nan: None})
    records = df_final_enriched.to_dict(orient='records')
    
    with open(ENRICHED_PLAYERS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=4)
        
    print(f"--- Data Consolidation Complete! Enriched data saved to: {ENRICHED_PLAYERS_OUTPUT_PATH} ---")

if __name__ == '__main__':
    main()
