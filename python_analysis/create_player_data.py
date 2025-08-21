import json
import pandas as pd
import os
import numpy as np
import requests
import re

# --- Configuration ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DATA_DIR = os.path.join(CURRENT_DIR, '..', 'server', 'data')
SLEEPER_PLAYERS_JSON_PATH = os.path.join(SERVER_DATA_DIR, 'nfl_players_data.json')
ANALYSIS_DATA_DIR = os.path.join(CURRENT_DIR, 'data')
ENRICHED_PLAYERS_OUTPUT_PATH = os.path.join(SERVER_DATA_DIR, 'enriched_players_master.json')
CONSOLIDATED_ANALYSIS_PATH = os.path.join(CURRENT_DIR, 'analysis_results', 'consolidated_analysis.json')

if not os.path.exists(SERVER_DATA_DIR):
    os.makedirs(SERVER_DATA_DIR)

def cleanse_name(name):
    if not isinstance(name, str):
        return ""
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
            analysis_lookup = json.load(f)
        print(f"--- Successfully loaded {len(analysis_lookup)} AI analyses. ---")
        return analysis_lookup
    except Exception:
        print(f"--- WARNING: Consolidated analysis file not found or invalid. Skipping. ---")
        return {}

def fetch_fantasy_calc_data(is_dynasty=True, num_qbs=2, ppr=1):
    url = f"https://api.fantasycalc.com/values/current?isDynasty={is_dynasty}&numQbs={num_qbs}&ppr={ppr}&numTeams=12"
    print(f"Fetching player values from FantasyCalc: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        players = response.json()
        if not isinstance(players, list):
            print("WARNING: FantasyCalc API did not return a valid list.")
            return pd.DataFrame()
        player_list = [{'sleeper_id': str(p['player']['sleeperId']), 'fantasy_calc_value': p.get('value')} for p in players if p.get('player', {}).get('sleeperId')]
        df = pd.DataFrame(player_list)
        print(f"Successfully loaded {len(df)} players with Sleeper IDs from FantasyCalc.")
        return df
    except requests.exceptions.RequestException as e:
        print(f"WARNING: Could not fetch FantasyCalc data. Error: {e}")
        return pd.DataFrame()

def load_and_prep_excel(file_path, column_rename_map, original_name_col='Player'):
    try:
        print(f"Loading data from: {file_path}")
        df = pd.read_excel(file_path, engine='openpyxl')
        
        print(f"   - Original columns found: {list(df.columns)}")

        df.rename(columns={original_name_col: 'player_name_original'}, inplace=True)
        df = cleanse_df_names(df, 'player_name_original')
        df.rename(columns=column_rename_map, inplace=True)
        original_rows = len(df)
        df.drop_duplicates(subset=['player_cleansed_name'], keep='first', inplace=True)
        if len(df) < original_rows:
            print(f"   - De-duplicated {original_rows - len(df)} rows from {os.path.basename(file_path)}.")
        print(f"Successfully loaded and prepped {len(df)} unique rows from {os.path.basename(file_path)}.")
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
    
    df_sleeper_players = load_sleeper_player_data(SLEEPER_PLAYERS_JSON_PATH)
    if df_sleeper_players.empty: return

    df_fantasy_calc = fetch_fantasy_calc_data()
    if df_fantasy_calc.empty:
        print("Halting process: Cannot proceed without FantasyCalc value data.")
        return

    ai_analysis_lookup = load_consolidated_analysis(CONSOLIDATED_ANALYSIS_PATH)

    sf_rename_map = {'Overall': 'overall_rank', 'Pos. Rank': 'positional_rank', 'Tier': 'tier'}
    lrqb_rename_map = {'ZAP Score': 'zap_score', 'Category': 'category', 'Comparables': 'comparables', 'Draft Capital Delta': 'draft_capital_delta', 'Notes': 'notes_lrqb'}
    rsp_rename_map = {
        'RSP Pos. Ranking': 'rsp_pos_rank', 'RSP 2023-2025 Rank': 'rsp_2023_2025_rank', 'RP 2021-2025 Rank': 'rp_2021_2025_rank',
        'Comparison Spectrum': 'comparison_spectrum', 'Depth of Talent Score': 'depth_of_talent_score',
        'Depth of Talent Description': 'depth_of_talent_desc', 'RSP Notes': 'notes_rsp'
    }
    # --- THIS IS THE FIX ---
    # Corrected the key to match the actual column name in the Excel file.
    redraft_rename_map = {
        'Redraft_Overall': 'redraft_overall_rank',
        'Redraft_Pos_Rank': 'redraft_pos_rank',
        'Redraft_Tier': 'redraft_tier',
        'Auction (Out of $200)': 'redraft_auction_value'
    }

    sf_rankings_path = os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'SuperflexRankings_June25.xlsx')
    df_superflex = load_and_prep_excel(sf_rankings_path, sf_rename_map)
    lrqb_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'LRQB_Postdraft_Rookies.xlsx')
    df_lrqb = load_and_prep_excel(lrqb_path, lrqb_rename_map)
    rsp_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'RSP_Rookies.xlsx')
    df_rsp = load_and_prep_excel(rsp_path, rsp_rename_map)
    redraft_path = os.path.join(ANALYSIS_DATA_DIR, '1QB', 'Redraft1QB_August15_25.xlsx')
    df_redraft = load_and_prep_excel(redraft_path, redraft_rename_map)
    
    print("\nEnriching full Sleeper list with analysis data by name...")
    df_enriched = df_sleeper_players
    
    analysis_dfs = {
        'Superflex': (df_superflex, list(sf_rename_map.values())),
        'LRQB': (df_lrqb, list(lrqb_rename_map.values())),
        'RSP': (df_rsp, list(rsp_rename_map.values())),
        'Redraft': (df_redraft, list(redraft_rename_map.values()))
    }

    for name, (df_analysis, analysis_cols) in analysis_dfs.items():
        if not df_analysis.empty:
            cols_to_merge = ['player_cleansed_name'] + [col for col in analysis_cols if col in df_analysis.columns]
            df_enriched = pd.merge(df_enriched, df_analysis[cols_to_merge], on='player_cleansed_name', how='left')
            
            key_col = analysis_cols[0] 
            
            if key_col in df_enriched.columns:
                matches = df_enriched[key_col].notna().sum()
                print(f"   - Merged {name}: Found {matches} players with data for column '{key_col}'.")
            else:
                print(f"   - WARNING: Merged {name}, but key column '{key_col}' was not found after merge. Check column names.")

    print("Initial Excel enrichment complete.")

    if ai_analysis_lookup:
        df_enriched['gemini_analysis'] = df_enriched['player_cleansed_name'].map(ai_analysis_lookup)
        print(f"   - Successfully added AI analysis for {df_enriched['gemini_analysis'].notna().sum()} players.")

    print("\nFiltering final list with FantasyCalc data by Sleeper ID...")
    df_enriched['sleeper_id'] = df_enriched['sleeper_id'].astype(str)
    df_fantasy_calc['sleeper_id'] = df_fantasy_calc['sleeper_id'].astype(str)
    df_final_enriched = pd.merge(df_enriched, df_fantasy_calc, on='sleeper_id', how='inner')
    print(f"Final filtering complete. Master list contains {len(df_final_enriched)} players.")

    print("\nFinal cleanup and save...")
    df_final_enriched = df_final_enriched.astype(object)
    df_final = df_final_enriched.replace({np.nan: None})
    records = df_final.to_dict(orient='records')
    with open(ENRICHED_PLAYERS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=4)
    print(f"--- Data Consolidation Complete! Enriched data saved to: {ENRICHED_PLAYERS_OUTPUT_PATH} ---")

if __name__ == '__main__':
    main()