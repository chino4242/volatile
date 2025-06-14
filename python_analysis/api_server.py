# python_analysis/api_server.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import sys

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Data Loading with Enhanced Logging ---
# This is the most robust way to load data for a Flask app.
# It happens once when the Python interpreter first imports this file.
try:
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    enriched_data_path = os.path.join(current_script_dir, '..', 'server', 'data', 'enriched_players_master.json')
    
    print(f"--- PYTHON API: Attempting to load data from: {enriched_data_path} ---")
    
    with open(enriched_data_path, 'r', encoding='utf-8') as f:
        _loaded_list = json.load(f)
        if not isinstance(_loaded_list, list):
            raise TypeError("Loaded JSON is not a list")
            
        # Create the lookup map directly from the loaded list
        _player_map_for_lookup = {str(p['sleeper_id']): p for p in _loaded_list if 'sleeper_id' in p}

    print(f"--- PYTHON API: Successfully loaded and mapped {len(_player_map_for_lookup)} players. ---")
    
    # Diagnostic log
    map_keys_sample = list(_player_map_for_lookup.keys())[:5]
    print(f"--- PYTHON API DEBUG: First 5 keys in map look like this: {map_keys_sample} ---")

except Exception as e:
    print(f"--- PYTHON API CRITICAL ERROR: Could not load data on startup. Server cannot run. Error: {e}", file=sys.stderr)
    sys.exit(1) # Exit if critical data is missing


# --- API Endpoints ---
@app.route('/api/enriched-players/batch', methods=['POST'])
def get_players_by_sleeper_ids_batch():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    sleeper_ids = request.json.get('sleeper_ids', [])
    if not isinstance(sleeper_ids, list):
        return jsonify({"error": "sleeper_ids must be a list"}), 400
    
    print(f"--- PYTHON API DEBUG: Received request to look up {len(sleeper_ids)} IDs. Sample: {sleeper_ids[:5]} ... ---")
    
    results = []
    # --- FINAL DIAGNOSTIC STEP ---
    # We will log the result of the lookup for the first 5 IDs to see what's happening.
    for i, s_id in enumerate(sleeper_ids):
        player_data = _player_map_for_lookup.get(str(s_id))
        
        if i < 5: # Log the first 5 lookups
             print(f"--- PYTHON API DEBUG: Lookup for ID '{str(s_id)}' returned: {'Data Found' if player_data else 'Not Found'}")

        if player_data:
            results.append(player_data)
        else:
            results.append({"error": "Analysis data not found", "sleeper_id": str(s_id)})
    
    return jsonify(results)

# Optional: Add an endpoint to see all data for debugging
@app.route('/api/all-players-debug', methods=['GET'])
def get_all_players_debug():
    # To return the list, we can get it from the map's values
    return jsonify(list(_player_map_for_lookup.values()))

# Guard the app.run() call so it doesn't run when Gunicorn is used on Render
if __name__ == '__main__':
    app.run(port=5002, debug=True)

