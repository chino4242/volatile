import boto3

# Sample a record to see exact field names
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE')

response = table.scan(Limit=3)
if response['Items']:
    print("Sample records from DynamoDB:\n")
    for i, item in enumerate(response['Items'][:3], 1):
        print(f"Record {i}:")
        print(f"  Keys: {list(item.keys())}")
        if 'player_name_original' in item:
            print(f"  player_name_original: {item['player_name_original']}")
        if 'full_name' in item:
            print(f"  full_name: {item['full_name']}")
        if 'sleeper_id' in item:
            print(f"  sleeper_id: {item['sleeper_id']}")
        if 'player_cleansed_name' in item:
            print(f"  player_cleansed_name: {item['player_cleansed_name']}")
        print()
