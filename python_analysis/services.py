import requests
import pandas as pd
import os
import re


nnf_team_ids = {
    "The One Who Knocks": {"name": "The One Who Knocks", "id": 1323356},
    "Bomb Atomically 🏆🏆🏆": {"name": "Bomb Atomically 🏆🏆🏆", "id": 1323234},
    "AB CeeDee": {"name": "AB CeeDee", "id": 1323386},
    "Bills Mafia": {"name": "Bills Mafia", "id": 1325548},
    "El blanco lobo": {"name": "El blanco lobo", "id": 1324038},
    "BO CORREXT": {"name": "BO CORREXT", "id": 1323593},
    "IYKYK": {"name": "IYKYK", "id": 1323091},
    "The Kittle Mermaid": {"name": "The Kittle Mermaid", "id": 1323238},
    "Bounce Back BoJack": {"name": "Bounce Back BoJack", "id": 1325249},
    "Jobu’s Redemption": {"name": "Jobu's Redemption", "id": 1323264}
}

nnf_teams = list(nnf_team_ids.keys())

skill_positions = ["WR", "RB", "TE"]
columns = ['full_name', 'Team', 'position', 'Age', 'Value']


def cleanse_names(df, column):
    """
    Cleanses player names in a DataFrame column to match the frontend JavaScript logic.
    - Converts to lowercase.
    - Removes all characters except letters, numbers, whitespace, and apostrophes.
    - Normalizes multiple whitespace characters into a single space.
    - Trims leading/trailing whitespace.
    """
    # Ensure the column is treated as a string, filling any non-string data with empty strings
    cleansed_series = df[column].astype(str).fillna('')
    
    # 1. Convert to lowercase
    cleansed_series = cleansed_series.str.lower()
    
    # 2. Remove special characters (keeping apostrophes)
    # The regex [^\w\s'] matches any character that is NOT a word character, 
    # whitespace, or an apostrophe. We replace it with nothing.
    cleansed_series = cleansed_series.str.replace(r'[^\w\s\']', '', regex=True)
    
    # 3. Normalize multiple whitespace characters into a single space
    cleansed_series = cleansed_series.str.replace(r'\s+', ' ', regex=True)
    
    # 4. Trim leading/trailing whitespace from the result
    cleansed_series = cleansed_series.str.strip()
    
    df['player_cleansed_name'] = cleansed_series
    return df


def get_league_rosters(league_id=197269, season=2024, scoring_period=18):
    url = 'https://www.fleaflicker.com/api/FetchLeagueRosters'
    response = requests.get(url, params={"sport": "NFL", "league_id": league_id, "season": season,
                                         "scoring_period": scoring_period})
    j_response = response.json()
    league_roster_dict = {}
    rosters = j_response['rosters']
    for team in rosters:
        team_name = team['team']['name']
        roster_list = []
        team_roster_dict = {}
        for player in team['players']:
            name = player['proPlayer']['nameFull']
            position = player['proPlayer']['position']
            player = {"name": name, "position": position}
            roster_list.append(player)
        team_roster_dict = {team_name: roster_list}
        league_roster_dict.update(team_roster_dict)
        player_list = []
        for key, value in league_roster_dict.items():
            for player in value:
                player_name = player['name']
                player_position = player['position']
                nnf_team = key
                loop_player_list = [player_name, player_position, nnf_team]
                player_list.append(loop_player_list)
    df_rosters = pd.DataFrame(player_list, columns=['Name', 'Pos', 'NNF_Team'])
    df_rosters = cleanse_names(df_rosters, 'Name')
    return df_rosters

def create_dynasty_dfs():
    current_dir = os.path.dirname(__file__)
    relative_path = os.path.join(current_dir, 'data', '1QBRankings_March25.xlsx')
    late_round = pd.read_excel(relative_path)
    late_round = cleanse_names(late_round, 'Player')
    relative_path = os.path.join(current_dir, 'data', 'fantasycalc_dynasty_rankings.csv')
    fantasy_calc = pd.read_csv(relative_path)
    fantasy_calc = cleanse_names(fantasy_calc, 'name')
    merged_dynasty = pd.merge(late_round, fantasy_calc,on='player_cleansed_name')
    relative_path = os.path.join(current_dir, 'data', 'Reception_Perception_Dynasty.xlsx')
    reception_perception = pd.read_excel(relative_path)
    reception_perception = cleanse_names(reception_perception, 'Player_Harmon')
    merged_dynasty = pd.merge(merged_dynasty, reception_perception, on='player_cleansed_name', how='outer')
    return merged_dynasty

def create_rookie_rankings(format):
    
    if format == "superflex":
        dir = "superflex"
    else:
        dir = "1QB"
    common = "common"
    
    try:
        # Get the directory where the script is located
        base_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        # Fallback if __file__ is not defined (e.g., running interactively)
        base_dir = os.getcwd()
        print(f"Warning: __file__ not defined. Using current working directory: {base_dir}")

    target_dir = os.path.join(base_dir, 'data')
    # *** Corrected output directory path to be inside 'data' ***
    output_dir = os.path.join(target_dir, 'output')
    """Gets postdraft data from LRQB"""

    relative_path = os.path.join(target_dir, common, 'Postdraft_Rookies.xlsx')
    postdraft_rookies = pd.read_excel(relative_path)
    postdraft_rookies = cleanse_names(postdraft_rookies, 'Player')
    """Adds rankings dependent on scoring format"""
    relative_path = os.path.join(target_dir, dir, 'Postdraft_Rookies.xlsx')
    postdraft_rookies_rank = pd.read_excel(relative_path)
    postdraft_rookies_rank = cleanse_names(postdraft_rookies_rank, 'Player')
    """Gets fantasycalc data"""    
    relative_path = os.path.join(target_dir, dir, 'fantasycalc_dynasty_rookie_rankings.csv')
    fantasy_calc = pd.read_csv(relative_path, delimiter=';')
    fantasy_calc = cleanse_names(fantasy_calc, 'name')
    """Gets reception perception data"""
    relative_path = os.path.join(target_dir, common, 'Reception_Perception_Rookies.xlsx')
    reception_perception = pd.read_excel(relative_path)
    reception_perception = cleanse_names(reception_perception, 'Player')
    """Merge dataframes"""
    merged_rookies = pd.merge(postdraft_rookies, postdraft_rookies_rank, on='player_cleansed_name', how='outer')
    merged_rookies = pd.merge(merged_rookies, reception_perception, on='player_cleansed_name', how='outer')
    relative_path = os.path.join(target_dir, common, 'RSP_Rookies.xlsx')
    rsp_rookies = pd.read_excel(relative_path)
    rsp_rookies = cleanse_names(rsp_rookies, 'Player')
    merged_rookies = pd.merge(merged_rookies, rsp_rookies, on='player_cleansed_name', how='outer')
    merged_rookies = pd.merge(merged_rookies, fantasy_calc, on='player_cleansed_name', how='outer')
    columns = ['Rk',
               'player_cleansed_name',
               'position',
               'NFL Team',
               'Pos. Rank',
               'RSP Pos. Ranking',
               'RSP 2023-2025 Rank',
               'RP 2021-2025 Rank',
               'Tier',
               'ZAP Score',
               'Depth of Talent Score',
               'Category',
               'Depth of Talent Description',
               'Draft Capital Delta',
               'RP Definition',
               'RP Quick Note',
               'Comparables',
               'Comparison Spectrum',
               'Stylistic Comp',
               'positionRank',
               'value',
               'Height',
               'Weight',
               'School',
               'Notes',
               'Summarized Notes',
               'RSP Notes',
                '% of Man Routes',
                'Man Success Rate',
                'Man Percentile',
                '% of Zone Routes',
                'Zone Success Rate',
                'Zone Percentile',
                '% of Press Routes',
                'Press Success Rate',
                'Press Percentile',
                '% of Double Routes',
                'overallRank',
                'trend30day',
    ]
    merged_rookies = merged_rookies[columns]
    merged_rookies = merged_rookies.sort_values(by='Rk', ascending=True)
    merged_rookies.to_excel(os.path.join(output_dir, f'{dir}_rookies.xlsx'), index=False)
    return merged_rookies

def print_by_team(teams, frame):
    for nnf_team in teams:
        team = frame.loc[frame["NNF_Team"] == nnf_team]
        print(team)
        columns = ['player_cleansed_name', 'Team_x', 'Pos_x', 'Age', 'Value', 'value', 'Buy/Sell/Hold', 'Harmon Tier', 'Harmon Rank','Seasonal Overall', 'Target']
        team.sort_values(by=['value'], inplace=True, ascending=False)
        players = team.player_cleansed_name.tolist()
        print(nnf_team)
        print("Likely Kept:")
        print("-------------")
        print(team[columns].head(10))
        keeper_value = team['Value'].head(10).sum()
        print(f"Value of Keepers: {keeper_value}")
        print("Likely Dropped:")
        print("----------------")
        roster_count = team['player_cleansed_name'].count()
        roster_max = 10
        if roster_count > roster_max:
            need_to_cut = roster_count - roster_max
            print(team[columns].tail(need_to_cut))
            dropped_value = team['Value'].tail(need_to_cut).sum()
            print(f"Value of dropped: {dropped_value}")
            team_value = team['Value'].sum()
            print(f"Total Team Value for {nnf_team}: {team_value}")
            
            
def get_sleeper_roster(league_id):
    url = f"https://api.sleeper.app/v1/league/{league_id}/rosters"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        print("API data fetched successfully!")
        print(data)
    else:
        data = None
        print("Failed to fetch data. Status code: {response.status_code}")

    return data

def create_button(cell_value):
    return f'<button class="showDataBtn" data-cell-data="{cell_value}">Show Analysis</button>'