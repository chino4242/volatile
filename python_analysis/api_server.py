# python_analysis/api_server_flask.py
from flask import Flask, jsonify, request # Import 'request' for the POST route
from flask_cors import CORS
import json
import os

app = Flask(__name__)
# Enable CORS to allow requests from your React frontend
CORS(app) 

# --- Configuration ---
# Path to the enriched data, assuming this script is in python_analysis/
CURRENT_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENRICHED_DATA_PATH = os.path.join(CURRENT_SCRIPT_DIR, 'data_output', 'enriched_players_master.json')

def load_data():
    """Loads the enriched player data from the JSON file."""
    # This function will now be called on each request, ensuring fresh data.
    try:
        print(f"--- PYTHON API: Attempting to load fresh data from: {ENRICHED_DATA_PATH}")
        with open(ENRICHED_DATA_PATH, 'r', encoding='utf-8') as f:
            enriched_player_data_list = json.load(f)
        
        # Create a map for quick O(1) lookups by sleeper_player_id
        enriched_player_data_map_by_sleeper_id = {}
        for player in enriched_player_data_list:
            # Ensure the key exists and is not None before adding to map
            if 'sleeper_id' in player and player['sleeper_id'] is not None:
                enriched_player_data_map_by_sleeper_id[str(player['sleeper_id'])] = player
        
        print(f"--- PYTHON API: Successfully loaded and mapped {len(enriched_player_data_list)} players.")
        return enriched_player_data_list, enriched_player_data_map_by_sleeper_id

    except Exception as e:
        print(f"FATAL: Could not load enriched player data: {e}")
        return [], {}
            
# --- API Route Definitions ---

@app.route('/api/enriched-players', methods=['GET'])
def get_all_players():
    """Endpoint to get all enriched players."""
    all_players, _ = load_data() # Load fresh data on each call
    return jsonify(all_players)

@app.route('/api/enriched-players/sleeper/<sleeper_id>', methods=['GET'])
def get_player_by_sleeper_id(sleeper_id):
    """Endpoint to get a single player by their Sleeper ID."""
    print(f"--- PYTHON API DEBUG: Lookup for ID '{sleeper_id}' received.")
    _, player_map = load_data() # Load fresh data on each call
    player = player_map.get(str(sleeper_id)) # Ensure lookup key is a string
    
    if player:
        print(f"--- PYTHON API DEBUG: Lookup for ID '{sleeper_id}' returned: Data Found")
        return jsonify(player)
    else:
        print(f"--- PYTHON API DEBUG: Lookup for ID '{sleeper_id}' returned: 404 - Not Found")
        return jsonify({"error": "Player not found by Sleeper ID"}), 404

@app.route('/api/enriched-players/batch', methods=['POST'])
def get_players_by_sleeper_ids_batch():
    """Endpoint to get a batch of players from a list of Sleeper IDs."""
    print(f"--- PYTHON API DEBUG: Received request to look up a batch of IDs.")
    _, player_map = load_data() # Load fresh data on each call
    
    request_data = request.json
    if not request_data or 'sleeper_ids' not in request_data:
        return jsonify({"error": "Missing 'sleeper_ids' in request body"}), 400
        
    sleeper_ids = request_data.get('sleeper_ids', [])
    if not isinstance(sleeper_ids, list):
        return jsonify({"error": "'sleeper_ids' must be a list"}), 400
    
    print(f"--- PYTHON API DEBUG: Sample of IDs to look up: {sleeper_ids[:5]} ...")

    results = []
    for s_id in sleeper_ids:
        player_data = player_map.get(str(s_id))
        if player_data:
            results.append(player_data)
        else:
            results.append({"sleeper_id": str(s_id), "error": "Data not found"})
            
    return jsonify(results)

if __name__ == '__main__':
    # We no longer need to load data on startup, it will happen per-request.
    app.run(port=5002, debug=True)
