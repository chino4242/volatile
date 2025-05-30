import requests
import pandas as pd

trade_values = requests.get("https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=1&numTeams=12&ppr=1").json()
adp = requests.get("https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=12&year=2023").json()

adp_map = {}
for player in adp['players']:
    adp_map[player['name']] = player['adp']

trade_values_map = {}
for player in trade_values:
    trade_values_map[player['player']['name']] = player['overallRank']

diffs = []
for name, player_trade_value in trade_values_map.items():
    player_adp = adp_map.get(name)
    
    #Skip players without ADP data
    if player_adp is None:
        continue
    
    diff = player_trade_value - player_adp
    diffs.append([name, player_trade_value, player_adp, diff])

sorted_diffs = sorted(diffs, key=lambda d: d[3])
    
df = pd.DataFrame(sorted_diffs, columns=['name', 'trade_value_rank', 'adp', 'tv - adp'])
with pd.option_context('display.max_rows', None):
    print(df[:10])