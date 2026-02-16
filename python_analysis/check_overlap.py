import boto3
import pandas as pd
from io import BytesIO
import requests

# Cleanse function
def cleanse_name(name):
    if pd.isna(name):
        return ''
    s = str(name).lower().strip()
    s = s.replace(' jr', '').replace(' sr', '').replace(' iii', '').replace(' ii', '').replace(' iv', '')
    s = s.replace('.', '').replace("'", '').replace('-', ' ')
    s = ' '.join(s.split())
    return s

# Get FantasyCalc names
print("=== FantasyCalc Sample (cleansed) ===")
resp = requests.get('https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12')
fc_data = resp.json()
fc_names = []
for p in fc_data[:10]:
    player_info = p.get('player', {})
    name = player_info.get('name')
    if name:
        cleansed = cleanse_name(name)
        fc_names.append(cleansed)
        print(f"{name} → {cleansed}")

# Get Excel names  
print("\n=== Excel Sample (cleansed) ===")
s3 = boto3.client('s3')
bucket = 'amplify-volatileworkspace-provinggrounddatabucket4-futv0ur6nryf'
obj = s3.get_object(Bucket=bucket, Key='uploads/1QB/dynasty/1771262887062_1QBRankings_February26.xlsx')
file_content = BytesIO(obj['Body'].read())
df = pd.read_excel(file_content, sheet_name='Rankings and Tiers', engine='openpyxl')
excel_names = []
for idx, row in df.head(10).iterrows():
    if 'Player' in df.columns:
        name = row['Player']
        cleansed = cleanse_name(name)
        excel_names.append(cleansed)
        print(f"{name} → {cleansed}")

# Check for any common names
print("\n=== Common Names ===")
common = set(fc_names).intersection(set(excel_names))
print(f"Found {len(common)} common names in first 10 of each:")
for name in list(common)[:5]:
    print(f"  - {name}")
