# python_analysis/api_server.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

# --- Flask App Setup ---
app = Flask(__name__)
# Enable CORS to allow your React frontend (on a different port) to call this API.
CORS(app)

# --- CONFIGURATION & DATA LOADING ---
# Path to the enriched data, assuming this script is in python_analysis/
CURRENT_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENRICHED_DATA_PATH = os.path.join(CURRENT_SCRIPT_DIR, 'data_output', 'enriched_players_master.json')

# These will hold our data in memory after loading it once.
_enriched_player_data_list = []
_enriched_player_data_map_by_sleeper_id = {}

def load_data():
    """Loads the enriched player data from the JSON file into memory."""
    global _enriched_player_data_list, _enriched_player_data_map_by_sleeper_id
    try:
        print(f"Loading enriched player data from: {ENRICHED_DATA_PATH}")
        with open(ENRICHED_DATA_PATH, 'r', encoding='utf-8') as f:
            # Load the list of player objects
            _enriched_player_data_list = json.load(f)
        
        # Create a dictionary (hash map) for fast O(1) lookups by sleeper_player_id
        temp_map = {}
        for player in _enriched_player_data_list:
            # Ensure the sleeper_player_id exists and is not null before adding to map
            if 'sleeper_player_id' in player and player['sleeper_player_id'] is not None:
                temp_map[str(player['sleeper_player_id'])] = player
        
        _enriched_player_data_map_by_sleeper_id = temp_map
        print(f"Successfully loaded and mapped {len(_enriched_player_data_list)} players.")
    except FileNotFoundError:
        print(f"FATAL ERROR: Enriched data file not found at {ENRICHED_DATA_PATH}. Please run create_master_data.py first.")
    except Exception as e:
        print(f"FATAL ERROR: Could not load or process enriched player data: {e}")

# --- API ENDPOINTS ---

@app.route('/api/enriched-players', methods=['GET'])
def get_all_players():
    """Returns the entire list of enriched players."""
    # Note: This could be a very large response.
    return jsonify(_enriched_player_data_list)

@app.route('/api/enriched-players/sleeper/<sleeper_id>', methods=['GET'])
def get_player_by_sleeper_id(sleeper_id):
    """Returns the enriched profile for a single player by their Sleeper ID."""
    player = _enriched_player_data_map_by_sleeper_id.get(str(sleeper_id))
    if player:
        return jsonify(player)
    else:
        return jsonify({"error": "Player not found by Sleeper ID"}), 404
        
@app.route('/api/enriched-players/batch', methods=['POST'])
def get_players_by_sleeper_ids_batch():
    """
    Accepts a POST request with a JSON body like {"sleeper_ids": ["123", "456"]}
    and returns a list of enriched profiles for those players.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be a JSON"}), 400

    sleeper_ids = request.json.get('sleeper_ids', [])
    
    if not isinstance(sleeper_ids, list):
        return jsonify({"error": "sleeper_ids must be a list"}), 400
    
    results = []
    for s_id in sleeper_ids:
        player_data = _enriched_player_data_map_by_sleeper_id.get(str(s_id))
        if player_data:
            results.append(player_data)
        else:
            # Include a note for IDs that were not found in our master data
            results.append({"sleeper_player_id": str(s_id), "error": "Analysis data not found"})
            
    return jsonify(results)

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    # Load the data into memory once on startup.
    load_data()
    # Run the Flask app on a different port than your Node.js server.
    app.run(port=5002, debug=True)
