# python_analysis/create_player_data.py
import json
import pandas as pd
import os
import services

# --- Configuration ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SLEEPER_PLAYERS_JSON_PATH = os.path.join(CURRENT_DIR, '..', 'server', 'data', 'nfl_players_data.json')
ANALYSIS_DATA_DIR = os.path.join(CURRENT_DIR, 'data')
OUTPUT_DATA_DIR = os.path.join(CURRENT_DIR, 'data_output')
ENRICHED_PLAYERS_OUTPUT_PATH = os.path.join(OUTPUT_DATA_DIR, 'enriched_players_master.json')

if not os.path.exists(OUTPUT_DATA_DIR):
    os.makedirs(OUTPUT_DATA_DIR)

def load_and_prep_excel(file_path, column_rename_map, original_name_col='Player'):
    """Generic function to load, rename, cleanse, and de-duplicate an Excel file."""
    try:
        print(f"Loading data from: {file_path}")
        df = pd.read_excel(file_path, engine='openpyxl')
        df.rename(columns={original_name_col: 'player_name_original'}, inplace=True)
        df = services.cleanse_names(df, 'player_name_original')
        
        # Standardize column names to be code-friendly
        df.rename(columns=column_rename_map, inplace=True)
        
        # De-duplicate the analysis file BEFORE merging to ensure one record per player
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
        print(f"Halting process: Error loading Sleeper data: {e}")
        return pd.DataFrame()

def main():
    print("--- Starting Player Data Enrichment Process ---")

    df_sleeper_players = load_sleeper_player_data(SLEEPER_PLAYERS_JSON_PATH)
    if df_sleeper_players.empty:
        return

    # Define standardized column name mappings for each file
    sf_rename_map = {'Overall': 'overall_rank', 'Pos. Rank': 'positional_rank', 'Tier': 'tier'}
    sf_rankings_path = os.path.join(ANALYSIS_DATA_DIR, 'superflex', 'SuperflexRankings_June25.xlsx')
    df_superflex = load_and_prep_excel(sf_rankings_path, sf_rename_map, 'Player')

    lrqb_rename_map = {'ZAP Score': 'zap_score', 'Category': 'category', 'Comparables': 'comparables', 'Draft Capital Delta': 'draft_capital_delta', 'Notes': 'notes_lrqb'}
    lrqb_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'LRQB_Postdraft_Rookies.xlsx')
    df_lrqb = load_and_prep_excel(lrqb_path, lrqb_rename_map, 'Player')

    rsp_rename_map = {
        'RSP Pos. Ranking': 'rsp_pos_rank', 'RSP 2023-2025 Rank': 'rsp_2023_2025_rank', 'RP 2021-2025 Rank': 'rp_2021_2025_rank',
        'Comparison Spectrum': 'comparison_spectrum', 'Depth of Talent Score': 'depth_of_talent_score',
        'Depth of Talent Description': 'depth_of_talent_desc', 'RSP Notes': 'notes_rsp'
    }
    rsp_path = os.path.join(ANALYSIS_DATA_DIR, 'common', 'RSP_Rookies.xlsx')
    df_rsp = load_and_prep_excel(rsp_path, rsp_rename_map, 'Player')

    # Merge DataFrames one by one
    df_enriched = df_sleeper_players
    analysis_dfs = {
        'Superflex': (df_superflex, list(sf_rename_map.values())),
        'LRQB': (df_lrqb, list(lrqb_rename_map.values())),
        'RSP': (df_rsp, list(rsp_rename_map.values()))
    }

    for name, (df_analysis, analysis_cols) in analysis_dfs.items():
        if not df_analysis.empty:
            print(f"Merging {name} data...")
            cols_to_merge = ['player_cleansed_name'] + [col for col in analysis_cols if col in df_analysis.columns]
            df_enriched = pd.merge(df_enriched, df_analysis[cols_to_merge], on='player_cleansed_name', how='left', suffixes=('', f'_{name.lower()}'))
            # Verify the merge
            merged_col_check = analysis_cols[0]
            successful_merges = df_enriched[merged_col_check].notna().sum()
            print(f"  - Successfully merged '{merged_col_check}' for {successful_merges} players.")

    # Save the final consolidated data
    df_final = df_enriched.where(pd.notna(df_enriched), None)
    print(f"\nTotal players in master dataset: {len(df_final)}")
    records = df_final.to_dict(orient='records')
    with open(ENRICHED_PLAYERS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=4)
        
    print("--- Data Consolidation Complete! ---")

if __name__ == '__main__':
    main()
