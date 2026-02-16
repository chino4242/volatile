#!/usr/bin/env python3
import boto3
import requests
import math
from decimal import Decimal

# Configuration
TABLE_NAME = 'PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE'
REGION = 'us-east-1'

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
                
                # --- NEW FIELDS ADDED HERE ---
                position = player_info.get('position')
                team = player_info.get('team')
                age = player_info.get('age')
                # -----------------------------

                record = {
                    'sleeper_id': str(sleeper_id),
                    'full_name': name,
                    'fantasy_calc_value': p.get('value'),
                    'fc_rank': p.get('overallRank'),
                    'trend_30_day': p.get('trend30Day'),
                    'redraft_value': p.get('redraftValue')
                }

                # Only add them if they exist (don't write None to DB if avoiding nulls)
                if position: record['position'] = position
                if team: record['team'] = team
                if age: record['age'] = age

                processed.append(record)
        
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
    
    players = fetch_fantasy_calc()
    
    if not players:
        print("❌ No player data fetched. Aborting.")
        exit(1)
    
    success = write_to_dynamodb(players)
    
    if success:
        print("=" * 60)
        print(f"✅ Complete! {len(players)} players added to DynamoDB")
        print("=" * 60)
        exit(0)
    else:
        print("❌ Failed to populate DynamoDB")
        exit(1)