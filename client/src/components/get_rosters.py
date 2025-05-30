import sys
import os
import pandas
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


roster_data = rosters.json()
managers_data = managers.json()
if not roster_data or not managers_data:
    print("Failed to fetch roster or manager data.")
    sys.exit(1)

for roster in roster_data:
   print(roster['owner_id'])
   user = requests.get(user_url.format(user_id=roster['owner_id']))
   user_data = user.json()
   print(user_data)
   print(roster['players'])
   print("-------------------")
   
for manager in managers_data:
    print(manager['display_name'])
    print(manager)
    print("-------------------")
    
