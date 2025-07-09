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
DATA_DIR = os.path.join(CURRENT_SCRIPT_DIR, '..', 'server', 'data')
_cached_data = {}
#ENRICHED_DATA_PATH = os.path.join(CURRENT_SCRIPT_DIR, 'data_output', 'enriched_players_master.json')

def load_data_for_format(format_type):
    """Loads the enriched player data from the JSON file."""
    # This function will now be called on each request, ensuring fresh data.
    global _cached_data
    
    file_name = f'enriched_players_{format_type}.json'
    file_path = os.path.join(DATA_DIR, file_name)
    
    try:
        print(f"--- PYTHON API: Attempting to load data for: {format_type} from {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            enriched_player_data_list = json.load(f)
        
        # Create a map for quick O(1) lookups by sleeper_player_id
        enriched_player_data_map_by_sleeper_id = {}
        for player in enriched_player_data_list:
            # Ensure the key exists and is not None before adding to map
            if 'sleeper_id' in player and player['sleeper_id'] is not None:
                enriched_player_data_map_by_sleeper_id[str(player['sleeper_id'])] = player
        
        print(f"--- PYTHON API: Successfully loaded and mapped {len(enriched_player_data_list)} players for {format_type}.")
        _cached_data[format_type] = {
            'list': enriched_player_data_list,
            'map': enriched_player_data_map_by_sleeper_id
        }
        return enriched_player_data_list, enriched_player_data_map_by_sleeper_id

    except Exception as e:
        print(f"FATAL: Could not load enriched player data: {e}")
        return [], {}

def get_data_by_format(format_type='superflex'):
    if format_type not in ['1qb', 'superflex']:
        format_type = 'superflex'
    if format_type not in _cached_data:
        load_data_for_format(format_type)
    return _cached_data.get(format_type, {'list': [], 'map':{}})

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
    """Endpoint to get a batch of players. If list is empty, returns all players."""
    format_type = request.args.get('format', 'superflex', type=str)
    print(f"--- PYTHON API DEBUG: Batch request received for {format_type}")
    
    # Get both the list and the map for the requested format
    data_for_format = get_data_by_format(format_type)
    player_list = data_for_format.get('list', [])
    player_map = data_for_format.get('map', {})
    
    request_data = request.json
    if not request_data or 'sleeper_ids' not in request_data:
        return jsonify({"error": "Missing 'sleeper_ids' in request body"}), 400
        
    sleeper_ids = request_data.get('sleeper_ids', [])
    if not isinstance(sleeper_ids, list):
        return jsonify({"error": "'sleeper_ids' must be a list"}), 400
    
    ### --- FIX 2: Handle the empty list case --- ###
    if not sleeper_ids:
        # If the client sends an empty list, interpret it as "send me all players".
        print(f"--- PYTHON API: Empty ID list received. Returning all {len(player_list)} players for {format_type}.")
        return jsonify(player_list)
    else:
        # If the client sends a list of IDs, filter for them.
        print(f"--- PYTHON API DEBUG: Sample of IDs to look up: {sleeper_ids[:5]} ...")

        results = []
        for s_id in sleeper_ids:
            player_data = player_map.get(str(s_id))
            if player_data:
                results.append(player_data)
            else:
                # This part is optional: you can decide to report on IDs that were not found.
                results.append({"sleeper_id": str(s_id), "error": "Data not found"})
                
        return jsonify(results)
    ### ------------------------------------------- ###

if __name__ == '__main__':
    # Pre-warm the cache on startup for both formats.
    print("--- PYTHON API: Pre-warming cache on startup...")
    load_data_for_format('1qb')
    load_data_for_format('superflex')
    print("--- PYTHON API: Cache is ready.")
    app.run(port=5002, debug=True)
