import json
import boto3
import os
import pandas as pd
import requests
import io
import math
from decimal import Decimal
from name_utils import cleanse_name

# Initialize AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Environment Variables
TABLE_NAME = os.environ.get('PLAYER_VALUES_TABLE', 'PlayerValues')
table = dynamodb.Table(TABLE_NAME)
BUCKET_NAME = os.environ.get('DATA_BUCKET_NAME')

def cleanse_df_names(df, name_column):
    """
    Applies name cleansing to a DataFrame column.
    """
    if name_column in df.columns:
        df['player_cleansed_name'] = df[name_column].apply(cleanse_name)
    return df

def get_latest_file_content(bucket, prefix):
    """
    Finds the latest Excel file in an S3 prefix and returns its content as BytesIO.
    """
    if not bucket:
        print("Bucket name not provided.")
        return None, None

    try:
        response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        objs = response.get('Contents', [])
        if not objs:
            print(f"No files found in {bucket}/{prefix}")
            return None, None
            
        # Filter for Excel files
        excel_objs = [o for o in objs if o['Key'].endswith('.xlsx') or o['Key'].endswith('.xls')]
        if not excel_objs:
             print(f"No Excel files found in {bucket}/{prefix}")
             return None, None
             
        latest = max(excel_objs, key=lambda x: x['LastModified'])
        print(f"Downloading latest file: {latest['Key']}")
        
        file_obj = s3.get_object(Bucket=bucket, Key=latest['Key'])
        return io.BytesIO(file_obj['Body'].read()), latest['Key']
    except Exception as e:
        print(f"Error fetching from S3: {e}")
        return None, None

def load_and_prep_excel_content(file_content, column_rename_map, original_name_col='Player'):
    """
    Loads Excel content from BytesIO, finds the correct header, and normalizes columns.
    """
    try:
        xls = pd.ExcelFile(file_content, engine='openpyxl')
        sheet_names = xls.sheet_names
        
        df = None
        target_sheet = None
        
        # Iterate through sheets to find the one with the data
        for sheet in sheet_names:
            print(f"   - Checking sheet: '{sheet}'...")
            try:
                temp_df = pd.read_excel(file_content, sheet_name=sheet, engine='openpyxl')
            except Exception as e:
                print(f"     - Error reading sheet '{sheet}': {e}")
                continue
            
            # Check 1: Is column in header?
            if original_name_col in temp_df.columns:
                df = temp_df
                target_sheet = sheet
                break
            
            # Check 2: Scan first 10 rows for header
            found_header = False
            for i, row in temp_df.head(10).iterrows():
                if row.astype(str).str.contains(original_name_col, case=False).any():
                    print(f"     - Found header row at index {i+1}.")
                    # Reload with correct header
                    file_content.seek(0)
                    df = pd.read_excel(file_content, sheet_name=sheet, engine='openpyxl', header=i+1)
                    target_sheet = sheet
                    found_header = True
                    break
            if found_header:
                break
                
            # Check 3: Fuzzy match column names (e.g. 'Player Name')
            for col in temp_df.columns:
                 if ('player' in col.lower() and 'name' in col.lower()) or (col.lower() == 'name'):
                     print(f"     - Found fuzzy match '{col}' in header.")
                     df = temp_df
                     target_sheet = sheet
                     break
            if df is not None:
                break

        if df is None:
             print(f"   - ERROR: Could not find '{original_name_col}' in any sheet.")
             return pd.DataFrame()

        # Normalize column names
        df.columns = df.columns.astype(str).str.strip()
        
        # Handle renaming again just in case
        if original_name_col not in df.columns:
             for col in df.columns:
                 if ('player' in col.lower() and 'name' in col.lower()) or (col.lower() == 'name'):
                     df.rename(columns={col: original_name_col}, inplace=True)
                     break
        
        if original_name_col not in df.columns:
             print(f"   - ERROR: Column '{original_name_col}' missing after processing.")
             return pd.DataFrame()

        df.rename(columns={original_name_col: 'player_name_original'}, inplace=True)
        df = cleanse_df_names(df, 'player_name_original')
        df.rename(columns=column_rename_map, inplace=True)
        
        # Remove duplicates
        df.drop_duplicates(subset=['player_cleansed_name'], keep='first', inplace=True)
        
        return df
    except Exception as e:
        print(f"Error processing Excel content: {e}")
        return pd.DataFrame()

def fetch_fantasy_calc():
    """
    Fetches player values and names from FantasyCalc API.
    """
    try:
        # Use simple scoring settings for base value
        url = "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12"
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()
        
        processed = []
        for p in data:
            player_info = p.get('player', {})
            sleeper_id = player_info.get('sleeperId')
            
            if sleeper_id:
                # Construct name if available
                name = player_info.get('name')
                
                processed.append({
                    'sleeper_id': str(sleeper_id),
                    'fantasy_calc_value': p.get('value'),
                    'fc_rank': p.get('overallRank'),
                    'trend_30_day': p.get('trend30Day'),
                    'redraft_value': p.get('redraftValue'),
                    'player_name_original': name
                })
        
        df = pd.DataFrame(processed)
        if not df.empty:
            df = cleanse_df_names(df, 'player_name_original')
            
        return df
    except Exception as e:
        print(f"FantasyCalc Fetch Error: {e}")
        return pd.DataFrame()

def lambda_handler(event, context):
    print("Processing Lambda Triggered")
    
    # 1. Fetch FantasyCalc Data (Base Source)
    df_fc = fetch_fantasy_calc()
    if df_fc.empty:
        print("Aborting: FantasyCalc data missing")
        return {'statusCode': 500, 'body': 'Failed to fetch FC data'}
    
    print(f"Loaded {len(df_fc)} players from FantasyCalc.")

    # 2. Fetch and Process Excel Files from S3
    
    # Superflex Dynasty
    # Mapping: Overall -> overall_rank, Positional Rank -> positional_rank, Tier -> tier
    sf_rename_map = {'Overall': 'overall_rank', 'Positional Rank': 'positional_rank', 'Tier': 'tier'}
    sf_content, _ = get_latest_file_content(BUCKET_NAME, 'uploads/superflex/')
    df_sf = load_and_prep_excel_content(sf_content, sf_rename_map) if sf_content else pd.DataFrame()
    
    # 1QB Dynasty
    # Mapping: Overall -> one_qb_rank, Tier -> one_qb_tier, Positional Rank -> one_qb_pos_rank
    one_qb_rename_map = {'Overall': 'one_qb_rank', 'Tier': 'one_qb_tier', 'Positional Rank': 'one_qb_pos_rank'}
    one_qb_content, _ = get_latest_file_content(BUCKET_NAME, 'uploads/1QB/dynasty/')
    df_one_qb = load_and_prep_excel_content(one_qb_content, one_qb_rename_map, 'Player') if one_qb_content else pd.DataFrame()

    # Redraft
    # Mapping needed based on create_player_data.py
    redraft_rename_map = {
        'Redraft_Overall': 'redraft_overall_rank',
        'Redraft_Pos_Rank': 'redraft_pos_rank',
        'Redraft_Tier': 'redraft_tier',
        'Auction (Out of $200)': 'redraft_auction_value'
    }
    redraft_content, _ = get_latest_file_content(BUCKET_NAME, 'uploads/1QB/redraft/')
    df_redraft = load_and_prep_excel_content(redraft_content, redraft_rename_map) if redraft_content else pd.DataFrame()

    # 3. Merge Data onto FantasyCalc Base
    df_enriched = df_fc
    
    analysis_dfs = {
        'Superflex': (df_sf, list(sf_rename_map.values())),
        '1QB Dynasty': (df_one_qb, list(one_qb_rename_map.values())),
        'Redraft': (df_redraft, list(redraft_rename_map.values()))
    }

    for name, (df_analysis, analysis_cols) in analysis_dfs.items():
        if not df_analysis.empty:
            cols_to_merge = ['player_cleansed_name'] + [col for col in analysis_cols if col in df_analysis.columns]
            # Left join to keep all FC players
            df_enriched = pd.merge(df_enriched, df_analysis[cols_to_merge], on='player_cleansed_name', how='left')
            
            key_col = analysis_cols[0]
            matches = df_enriched[key_col].notna().sum()
            print(f"Merged {name}: Found {matches} matches.")
        else:
            print(f"Skipping {name} merge (No data).")

    # 4. Write to DynamoDB
    # Convert NaNs to None (null in DynamoDB) or default values
    # DynamoDB doesn't like float inputs for Decimals sometimes, so we convert to Decimal or String.
    # Safe approach: Convert DataFrame to dicts, then sanitize floats to Decimals.
    
    print(f"Writing {len(df_enriched)} updated records to DynamoDB: {TABLE_NAME}")
    
    # helper to clean floats for DynamoDB
    def clean_record(record):
        cleaned = {}
        for k, v in record.items():
            if isinstance(v, float):
                if math.isnan(v):
                    continue # Skip NaNs
                cleaned[k] = Decimal(str(v))
            elif v is None:
                continue
            else:
                cleaned[k] = v
        return cleaned

    records = df_enriched.to_dict(orient='records')
    
    with table.batch_writer() as batch:
        for record in records:
            item = clean_record(record)
            if 'sleeper_id' in item:
                batch.put_item(Item=item)
            
    return {'statusCode': 200, 'body': f'Successfully updated {len(records)} players.'}
