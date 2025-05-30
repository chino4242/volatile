import pandas
import requests
import json

output_filename = "nfl_players_data.json"
player_api_url = "https://api.sleeper.app/v1/players/nfl"

try:
    response = requests.get(player_api_url)
    response.raise_for_status()
    players_data = response.json()
    with open(output_filename, "w") as output_file:
        json.dump(players_data, output_file, indent=4)
    print(f"Successfully fetched and saved NFL players data to {output_filename}")
except requests.exceptions.HTTPError as http_err:
    print(f"HTTP error occurred: {http_err}")  # e.g., 404, 500
except requests.exceptions.ConnectionError as conn_err:
    print(f"Connection error occurred: {conn_err}") # e.g., DNS failure, refused connection
except requests.exceptions.Timeout as timeout_err:
    print(f"Timeout error occurred: {timeout_err}")
except requests.exceptions.RequestException as req_err:
    print(f"An error occurred during the request: {req_err}")
except json.JSONDecodeError:
    print(f"Error decoding JSON from the API response. Response text: {response.text[:200]}...") # Print first 200 chars
except IOError:
    print(f"Error writing to file {output_filename}")