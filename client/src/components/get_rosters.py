import sys
import os
import pandas as pd
import requests
import json

PLAYER_DATA_FILE = "nfl_players_data.json"
all_players_data = {}

try:
    with open(PLAYER_DATA_FILE, "r") as file:
        all_players_data = json.load(file)
    print(f"Successfully loaded NFL players data from {PLAYER_DATA_FILE}")
except FileNotFoundError:
    print(f"File {PLAYER_DATA_FILE} not found. Please ensure the file exists.")
    sys.exit(1)
except json.JSONDecodeError:
    print(f"Error decoding JSON from {PLAYER_DATA_FILE}. Please check the file format.")
    sys.exit(1)


roster_url = "https://api.sleeper.app/v1/league/1200992049558454272/rosters"
managers_url = "https://api.sleeper.app/v1/league/1200992049558454272/users"
user_url = "https://api.sleeper.app/v1/user/{user_id}"

rosters = requests.get(roster_url)
managers = requests.get(managers_url)

def create_manager_roster(manager_player_ids, all_players_data):
    roster_details_list = []
    for player_id_on_roster in manager_player_ids:
        player_id_str = str(player_id_on_roster)
        player_info = all_players_data.get(player_id_on_roster)
        
        if player_info:
            roster_details_list.append({
                'player_id': player_id_str,
                'full_name': player_info.get('full_name', 'N/A'),
                'position': player_info.get('position', 'N/A'),
                'team': player_info.get('team', 'FA')
            })
        else:
            if len(player_id_str) <= 3 and player_id_str.isalpha() and player_id_str.isupper():
                roster_details_list.append({
                'player_id': player_id_str,
                'full_name': f"{player_id_str} Defense",
                'position': 'DEF',
                'team': player_id_str
                })
            else:
                roster_details_list.append({
                    'player_id': player_id_str,
                    'full_name': 'Unknown Player/Entity',
                    'position': 'N/A',
                    'team': 'N/A'
                })
    manager_df = pd.DataFrame(roster_details_list)
    return manager_df

roster_data = rosters.json()
managers_data = managers.json()
if not roster_data or not managers_data:
    print("Failed to fetch roster or manager data.")
    sys.exit(1)

for roster in roster_data:
   players = roster['players']
   players_details = create_manager_roster(players, all_players_data)
   user = requests.get(user_url.format(user_id=roster['owner_id']))
   user_data = user.json()
   print(user_data['display_name'])
   print(players_details)
   print("-------------------")
   
for manager in managers_data:
    print(manager['display_name'])
    print(manager)
    print("-------------------")
    
