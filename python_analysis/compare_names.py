import boto3
import pandas as pd
from io import BytesIO
import requests

# Function to cleanse names (same as in processor)
def cleanse_name(name):
    if pd.isna(name):
        return ''
    s = str(name).lower().strip()
    # Remove suffixes and punctuation
    s = s.replace(' jr', '').replace(' sr', '').replace(' iii', '').replace(' ii', '').replace(' iv', '')
    s = s.replace('.', '').replace("'", '').replace('-', ' ')
    # Remove extra whitespace
    s = ' '.join(s.split())
    return s

# Get sample names from FantasyCalc
print("=== FantasyCalc Sample Names ===")
resp = requests.get('https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12')
fc_data = resp.json()
fc_sample = [p for p in fc_data if 'player_name' in p][:5]
for p in fc_sample:
    print(f"Original: {p['player_name']}")
    print(f"Cleansed: {cleanse_name(p['player_name'])}\n")

# Get sample names from Excel
print("\n=== Excel File Sample Names ===")
s3 = boto3.client('s3')
bucket = 'amplify-volatileworkspace-provinggrounddatabucket4-futv0ur6nryf'
obj = s3.get_object(Bucket=bucket, Key='uploads/1QB/dynasty/1771262887062_1QBRankings_February26.xlsx')
file_content = BytesIO(obj['Body'].read())
df = pd.read_excel(file_content, sheet_name='Rankings and Tiers', engine='openpyxl')
print(f"Columns in Excel: {list(df.columns)[:10]}")
print("\nFirst 5 players:")
for idx, row in df.head(5).iterrows():
    if 'Player' in df.columns:
        print(f"Original: {row['Player']}")
        print(f"Cleansed: {cleanse_name(row['Player'])}\n")
