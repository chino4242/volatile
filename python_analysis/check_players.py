import boto3
from decimal import Decimal

# Check what names are in the DynamoDB table
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE')

# Search for specific players the user is testing
test_names = ['justin herbert', 'jared goff', 'parker washington', 'oronde gadsden']

for name in test_names:
    response = table.get_item(Key={'player_cleansed_name': name})
    if 'Item' in response:
        item = response['Item']
        print(f"\n✅ Found: {name}")
        print(f"   Original name: {item.get('player_name_original', 'N/A')}")
        print(f"   FC Rank: {item.get('fc_rank', 'N/A')}")
        print(f"   1QB Rank: {item.get('one_qb_rank', 'N/A')}")
        print(f"   Has keys: {list(item.keys())[:10]}")
    else:
        print(f"\n❌ NOT FOUND: {name}")
