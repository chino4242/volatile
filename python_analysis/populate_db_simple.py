#!/usr/bin/env python3
import boto3
import requests
import math
from decimal import Decimal

# Configuration
TABLE_NAME = 'PlayerValue-ltn5ogs56nen3ohocnowzq2z5m-NONE'
REGION = 'us-east-2'

def fetch_fantasy_calc():
    """Fetches player values from FantasyCalc API."""
    try:
        url = "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12"
        print(f"Fetching data from FantasyCalc...")
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()
        
        processed = []
        for p in data:
            player_info = p.get('player', {})
            sleeper_id = player_info.get('sleeperId')
            
            if sleeper_id:
                name = player_info.get('name', 'Unknown')
                
                processed.append({
                    'sleeper_id': str(sleeper_id),
                    'player_name_original': name,
                    'fantasy_calc_value': p.get('value'),
                    'fc_rank': p.get('overallRank'),
                    'trend_30_day': p.get('trend30Day'),
                    'redraft_value': p.get('redraftValue')
                })
        
        print(f"Fetched {len(processed)} players from FantasyCalc")
        return processed
    except Exception as e:
        print(f"Error fetching from FantasyCalc: {e}")
        return []

def clean_for_dynamodb(value):
    """Convert Python types to DynamoDB-compatible types."""
    if isinstance(value, float):
        if math.isnan(value):
            return None
        return Decimal(str(value))
    elif value is None:
        return None
    return value

def write_to_dynamodb(players):
    """Write player data to DynamoDB."""
    try:
        dynamodb = boto3.resource('dynamodb', region_name=REGION)
        table = dynamodb.Table(TABLE_NAME)
        
        print(f"Writing {len(players)} players to DynamoDB table: {TABLE_NAME}")
        
        with table.batch_writer() as batch:
            for player in players:
                # Clean the record
                item = {}
                for key, value in player.items():
                    cleaned = clean_for_dynamodb(value)
                    if cleaned is not None:
                        item[key] = cleaned
                
                if 'sleeper_id' in item:
                    batch.put_item(Item=item)
        
        print("✅ Successfully wrote all players to DynamoDB!")
        return True
    except Exception as e:
        print(f"❌ Error writing to DynamoDB: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Starting DynamoDB Population Script")
    print("=" * 60)
    
    # Fetch data
    players = fetch_fantasy_calc()
    
    if not players:
        print("❌ No player data fetched. Aborting.")
        exit(1)
    
    # Write to DynamoDB
    success = write_to_dynamodb(players)
    
    if success:
        print("=" * 60)
        print(f"✅ Complete! {len(players)} players added to DynamoDB")
        print("=" * 60)
        exit(0)
    else:
        print("❌ Failed to populate DynamoDB")
        exit(1)
