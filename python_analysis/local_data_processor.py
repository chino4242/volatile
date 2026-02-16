import pandas as pd
import requests
import boto3
import os
import math
from decimal import Decimal
from name_utils import cleanse_name

# Configuration
# Hardcode correct table and region
TABLE_NAME = 'PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE' 
REGION = 'us-east-1'

# Paths to local files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_1QB = os.path.join(BASE_DIR, 'data', '1QB', 'Dynasty1QBRankings_September25.xlsx')
FILE_SF = os.path.join(BASE_DIR, 'data', 'superflex', 'SuperflexRankings_September25.xlsx')

def fetch_fantasy_calc():
    """
    Fetches player values and names from FantasyCalc API.
    """
    try:
        url = "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12"
        print(f"Fetching FantasyCalc data from {url}...")
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
            df['player_cleansed_name'] = df['player_name_original'].apply(cleanse_name)
            
        return df
    except Exception as e:
        print(f"FantasyCalc Fetch Error: {e}")
        return pd.DataFrame()

import io

# ... (imports remain)

# Add BUCKET_NAME constant
BUCKET_NAME = 'amplify-volatileworkspace-provinggrounddatabucket4-futv0ur6nryf'

def get_latest_file_content(bucket, prefix):
    """
    Finds the latest Excel file in an S3 prefix and returns its content as BytesIO.
    """
    s3 = boto3.client('s3', region_name=REGION)
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

def load_excel_from_bytes(file_content, rename_map):
    """
    Loads Excel file from BytesIO and renames columns.
    """
    if not file_content:
        return pd.DataFrame()

    print(f"Loading Excel content...")
    try:
        xls = pd.ExcelFile(file_content, engine='openpyxl')
        sheet_names = xls.sheet_names
        
        df = None
        target_sheet = None
        
        # Iterate through sheets to find the one with player data
        for sheet in sheet_names:
            print(f"   - Checking sheet: '{sheet}'...")
            try:
                temp_df = pd.read_excel(file_content, sheet_name=sheet, engine='openpyxl')
            except Exception as e:
                print(f"     - Error reading sheet '{sheet}': {e}")
                continue
            
            # Check if 'Player' column exists
            target_col = 'Player'
            if target_col in temp_df.columns:
                df = temp_df
                target_sheet = sheet
                print(f"     - Found 'Player' column in sheet '{sheet}'!")
                break
            
            # Try fuzzy matching for player column
            for col in temp_df.columns:
                if 'player' in str(col).lower() and 'name' in str(col).lower():
                    df = temp_df
                    target_sheet = sheet
                    target_col = col
                    print(f"     - Found player column '{col}' in sheet '{sheet}'!")
                    break
            
            if df is not None:
                break
        
        if df is None:
            print(f"Column 'Player' not found in any sheet.")
            return pd.DataFrame()
        
        # Cleanse names
        df['player_cleansed_name'] = df[target_col].apply(cleanse_name)
        
        # Rename columns
        df.rename(columns=rename_map, inplace=True)
        
        # Keep only relevant columns
        cols_to_keep = ['player_cleansed_name'] + [col for col in rename_map.values() if col in df.columns]
        return df[cols_to_keep]
    except Exception as e:
        print(f"Error loading Excel content: {e}")
        return pd.DataFrame()

def main():
    # 1. Fetch Base Data
    df_base = fetch_fantasy_calc()
    if df_base.empty:
        print("Failed to fetch base data. Exiting.")
        return

    print(f"Base data loaded: {len(df_base)} players.")

    # 2. Load S3 Ranks
    # 1QB Mapping (column names from actual Excel file)
    map_1qb = {
        'Overall': 'one_qb_rank',
        'Positional Rank': 'one_qb_pos_rank',
        'Tier': 'one_qb_tier'
    }
    # Fetch 1QB from S3
    print("Fetching 1QB Rankings from S3...")
    content_1qb, key_1qb = get_latest_file_content(BUCKET_NAME, 'uploads/1QB/dynasty/')
    df_1qb = load_excel_from_bytes(content_1qb, map_1qb)

    # SF Mapping (column names from actual Excel file)
    map_sf = {
        'Overall': 'overall_rank',
        'Positional Rank': 'positional_rank',
        'Tier': 'tier'
    }
    # Fetch SF from S3
    print("Fetching Superflex Rankings from S3...")
    content_sf, key_sf = get_latest_file_content(BUCKET_NAME, 'uploads/superflex/')
    df_sf = load_excel_from_bytes(content_sf, map_sf)

    # 3. Merge
    df_enriched = df_base
    
    
    if not df_1qb.empty:
        df_enriched = pd.merge(df_enriched, df_1qb, on='player_cleansed_name', how='left')
        matches = df_enriched['one_qb_rank'].notna().sum() if 'one_qb_rank' in df_enriched.columns else 0
        print(f"Merged 1QB data. Matches: {matches}")
    else:
        print("Warning: 1QB DataFrame is empty.")

    if not df_sf.empty:
        df_enriched = pd.merge(df_enriched, df_sf, on='player_cleansed_name', how='left')
        matches = df_enriched['overall_rank'].notna().sum() if 'overall_rank' in df_enriched.columns else 0
        print(f"Merged SF data. Matches: {matches}")
    else:
        print("Warning: SF DataFrame is empty.")

    # 4. Write to DynamoDB
    print("Writing to DynamoDB...")
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    
    # List of tables to update (Dev and Potential Prod)
    TABLE_NAMES = [
        'PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE',      # Dev / Current
        'PlayerValue-qpmu4cj3pfauzkvpbsojson7nq-NONE'       # Potential Prod
    ]

    # Helper for float/NaN handling
    def clean_record(record):
        cleaned = {}
        for k, v in record.items():
            if isinstance(v, float):
                if math.isnan(v):
                    continue
                cleaned[k] = Decimal(str(v))
            elif v is None:
                continue
            else:
                cleaned[k] = v
        return cleaned

    records = df_enriched.to_dict(orient='records')
    
    for table_name in TABLE_NAMES:
        print(f"Updating table: {table_name}...")
        try:
            table = dynamodb.Table(table_name)
            with table.batch_writer() as batch:
                for record in records:
                    item = clean_record(record)
                    batch.put_item(Item=item)
            print(f"Successfully updated {len(records)} records in {table_name}.")
        except Exception as e:
            print(f"Failed to update {table_name}: {e}")

if __name__ == "__main__":
    main()
