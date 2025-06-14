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

# --- Path to the consolidated AI analysis file ---
CONSOLIDATED_ANALYSIS_PATH = os.path.join(CURRENT_DIR, 'analysis_results', 'consolidated_analysis.json')


if not os.path.exists(SERVER_DATA_DIR):
    os.makedirs(SERVER_DATA_DIR)


# --- Define a consistent name cleansing function locally ---
def cleanse_name(name):
    """
    Cleanses player names for consistent matching, handling common suffixes.
    """
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
    """Applies the local cleanse_name function to a DataFrame column."""
    if name_column in df.columns:
        df['player_cleansed_name'] = df[name_column].apply(cleanse_name)
    return df


def load_consolidated_analysis(file_path):
    """Loads the consolidated analysis lookup file."""
    print(f"--- Loading consolidated AI analysis from: {file_path} ---")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            analysis_lookup = json.load(f)
        print(f"--- Successfully loaded {len(analysis_lookup)} AI analyses. ---")
        return analysis_lookup
    except FileNotFoundError:
        print(f"--- WARNING: Consolidated analysis file not found at {file_path}. Skipping AI analysis merge. ---")
        return {}
    except json.JSONDecodeError:
        print(f"--- WARNING: Consolidated analysis file is not valid JSON. Skipping AI analysis merge. ---")
        return {}


def fetch_fantasy_calc_data(is_dynasty=True, num_qbs=2, ppr=1):
    """Fetches player values directly from the FantasyCalc API."""
    url = f"https://api.fantasycalc.com/values/current?isDynasty={is_dynasty}&numQbs={num_qbs}&ppr={ppr}&numTeams=12"
    print(f"Fetching player values from FantasyCalc: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status() 
        players = response.json()

        if not isinstance(players, list):
            print("WARNING: FantasyCalc API did not return a valid list of players.")
            return pd.DataFrame()

        player_list = []
        for player_data in players:
            player_info = player_data.get('player', {})
            if player_info.get('sleeperId'):
                player_list.append({
                    'sleeper_id': str(player_info['sleeperId']),
                    'fantasy_calc_value': player_data.get('value'),
                })
        
        df = pd.DataFrame(player_list)
        print(f"Successfully loaded {len(df)} players with Sleeper IDs from FantasyCalc.")
        return df

    except requests.exceptions.RequestException as e:
        print(f"WARNING: Could not fetch FantasyCalc data. Error: {e}")
        return pd.DataFrame()

def load_and_prep_excel(file_path, column_rename_map, original_name_col='Player'):
    """Generic function to load, rename, cleanse, and de-duplicate an Excel file."""
    try:
        print(f"Loading data from: {file_path}")
        df = pd.read_excel(file_path, engine='openpyxl')
        df.rename(columns={original_name_col: 'player_name_original'}, inplace=True)
        # Use the local cleansing function
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
        # Use the local cleansing function
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

    sf_rankings_path = os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'SuperflexRankings_June25.xlsx')
    df_superflex = load_and_prep_excel(sf_rankings_path, sf_rename_map)

    lrqb_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'LRQB_Postdraft_Rookies.xlsx')
    df_lrqb = load_and_prep_excel(lrqb_path, lrqb_rename_map)

    rsp_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'RSP_Rookies.xlsx')
    df_rsp = load_and_prep_excel(rsp_path, rsp_rename_map)
    
    # Step 2: Enrich the complete Sleeper list with Excel data
    print("Enriching full Sleeper list with analysis data by name...")
    df_enriched = df_sleeper_players
    analysis_dfs = {
        'Superflex': (df_superflex, list(sf_rename_map.values())),
        'LRQB': (df_lrqb, list(lrqb_rename_map.values())),
        'RSP': (df_rsp, list(rsp_rename_map.values()))
    }
    for name, (df_analysis, analysis_cols) in analysis_dfs.items():
        if not df_analysis.empty:
            cols_to_merge = ['player_cleansed_name'] + [col for col in analysis_cols if col in df_analysis.columns]
            df_enriched = pd.merge(df_enriched, df_analysis[cols_to_merge], on='player_cleansed_name', how='left')
            
            key_col = analysis_cols[0] 
            matches = df_enriched[key_col].notna().sum()
            print(f"   - Merged {name}: Found {matches} players with data for column '{key_col}'.")
    
    print("Initial Excel enrichment complete.")

    # Step 3: Add the consolidated AI analysis
    if ai_analysis_lookup:
        print("--- Adding AI analysis to the master list... ---")
        df_enriched['gemini_analysis'] = df_enriched['player_cleansed_name'].map(ai_analysis_lookup)
        
        ai_matches = df_enriched['gemini_analysis'].notna().sum()
        print(f"   - Successfully added AI analysis for {ai_matches} players.")
        
        matched_names = set(df_enriched[df_enriched['gemini_analysis'].notna()]['player_cleansed_name'])
        all_ai_names = set(ai_analysis_lookup.keys())
        unmatched_ai_names = all_ai_names - matched_names
        
        if unmatched_ai_names:
            print("\n--- DIAGNOSTIC: AI Analysis names that did not find a match in any source ---")
            for name in sorted(list(unmatched_ai_names)):
                print(f"  - {name}")
            print("--------------------------------------------------------------------")

    # Step 4: Filter the final, fully-enriched list with FantasyCalc data
    print("Filtering final list with FantasyCalc data by Sleeper ID...")
    df_final_enriched = pd.merge(
        df_enriched,
        df_fantasy_calc,
        on='sleeper_id',
        how='inner'
    )
    print(f"Final filtering complete. Master list contains {len(df_final_enriched)} players.")

    # --- FINAL DATAFRAME DIAGNOSTICS --- (can be removed after confirming fix)
    print("\n--- FINAL DATAFRAME DIAGNOSTICS ---")
    player_to_check = 'emeka egbuka' 
    player_row = df_final_enriched[df_final_enriched['player_cleansed_name'] == player_to_check]
    
    if not player_row.empty:
        print(f"--- Data for '{player_to_check}' before saving: ---")
        print(player_row.fillna('N/A').to_dict(orient='records')[0])
    else:
        print(f"--- Could not find '{player_to_check}' in the final filtered DataFrame. ---")
    print("------------------------------------")


    # Step 5: Final cleanup and save
    # --- THIS IS THE FIX ---
    # First, convert the object types to ensure proper NaN handling.
    # Then, replace all remaining NaN values with None for JSON compatibility.
    df_final_enriched = df_final_enriched.astype(object)
    df_final = df_final_enriched.replace({np.nan: None})
    
    records = df_final.to_dict(orient='records')
    
    with open(ENRICHED_PLAYERS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=4)
        
    print(f"--- Data Consolidation Complete! Enriched data saved to: {ENRICHED_PLAYERS_OUTPUT_PATH} ---")

if __name__ == '__main__':
    main()
