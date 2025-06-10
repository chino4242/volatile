# python_analysis/api_server.py
from flask import Flask, jsonify, request # Added 'request' for the batch endpoint
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Data Loading with Enhanced Logging ---
_enriched_player_data_list = None
_enriched_player_data_map_by_sleeper_id = None

def load_data():
    global _enriched_player_data_list, _enriched_player_data_map_by_sleeper_id
    
    # Path to the enriched data, assuming this script is in python_analysis/
    # This path construction is robust.
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    enriched_data_path = os.path.join(current_script_dir, 'data_output', 'enriched_players_master.json')
    
    # This function will only run once per server start.
    if _enriched_player_data_list is None:
        print(f"--- PYTHON API: Attempting to load data from: {enriched_data_path} ---")
        try:
            with open(enriched_data_path, 'r', encoding='utf-8') as f:
                _enriched_player_data_list = json.load(f)
            
            _enriched_player_data_map_by_sleeper_id = {}
            for player in _enriched_player_data_list:
                # Use 'sleeper_player_id' as the key, which is consistent with what your consolidation script creates.
                if 'sleeper_player_id' in player and player['sleeper_player_id'] is not None:
                    _enriched_player_data_map_by_sleeper_id[str(player['sleeper_player_id'])] = player

            print(f"--- PYTHON API: Successfully loaded and mapped {len(_enriched_player_data_map_by_sleeper_id)} players. ---")
        
        except FileNotFoundError:
            # <<< THIS IS THE MOST LIKELY ERROR ON RENDER >>>
            print(f"--- PYTHON API CRITICAL ERROR: FileNotFoundError! Could not find the data file at {enriched_data_path}. Make sure the file was committed and pushed to Git. ---")
            _enriched_player_data_list = []
            _enriched_player_data_map_by_sleeper_id = {}
        except json.JSONDecodeError as e:
            print(f"--- PYTHON API CRITICAL ERROR: JSONDecodeError! The file at {enriched_data_path} is not valid JSON. Error: {e} ---")
            _enriched_player_data_list = []
            _enriched_player_data_map_by_sleeper_id = {}
        except Exception as e:
            print(f"--- PYTHON API CRITICAL ERROR: An unexpected error occurred in load_data: {e} ---")
            _enriched_player_data_list = []
            _enriched_player_data_map_by_sleeper_id = {}
            
    return _enriched_player_data_list, _enriched_player_data_map_by_sleeper_id

# --- API Endpoints ---

@app.route('/api/enriched-players/batch', methods=['POST'])
def get_players_by_sleeper_ids_batch():
    # Load data on first request if it hasn't been loaded yet
    _, player_map = load_data()
    
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    sleeper_ids = request.json.get('sleeper_ids', [])
    if not isinstance(sleeper_ids, list):
        return jsonify({"error": "sleeper_ids must be a list"}), 400
    
    results = []
    for s_id in sleeper_ids:
        player_data = player_map.get(str(s_id))
        if player_data:
            results.append(player_data)
        else:
            # This is the response being sent, indicating the player_map lookup failed.
            results.append({"error": "Analysis data not found", "sleeper_player_id": str(s_id)}) 
    return jsonify(results)

# Optional: Add an endpoint to see all data for debugging
@app.route('/api/all-players-debug', methods=['GET'])
def get_all_players_debug():
    all_players, _ = load_data()
    return jsonify(all_players)

# Guard the app.run() call so it doesn't run when Gunicorn is used on Render
if __name__ == '__main__':
    load_data() # Load data on local startup
    app.run(port=5002, debug=True)
