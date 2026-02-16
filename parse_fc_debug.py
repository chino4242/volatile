import json

with open('fc_debug.json', 'r') as f:
    data = json.load(f)

# Sort by value just in case, though API usually sorts
data.sort(key=lambda x: x.get('value', 0), reverse=True)

print(f"Total items: {len(data)}")
print("Top 20 items:")
for i, item in enumerate(data[:20]):
    player = item.get('player', {})
    name = player.get('name')
    s_id = player.get('sleeperId')
    pos = player.get('position')
    val = item.get('value')
    rank = item.get('overallRank')
    print(f"{i+1}. {name} ({pos}, ID: {s_id}) - Value: {val}, API Rank: {rank}")
