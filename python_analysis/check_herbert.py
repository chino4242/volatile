import boto3

# Check what ranking fields exist in DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE')

# Get Justin Herbert's record specifically
response = table.scan(
    FilterExpression='contains(player_name_original, :name)',
    ExpressionAttributeValues={':name': 'Justin Herbert'},
    Limit=1
)

if response['Items']:
    item = response['Items'][0]
    print("Justin Herbert's DynamoDB record:")
    print(f"Full keys: {sorted(item.keys())}")
    print("\nRanking-related fields:")
    for key in sorted(item.keys()):
        if 'rank' in key.lower() or 'tier' in key.lower() or 'qb' in key.lower():
            print(f"  {key}: {item[key]}")
else:
    print("Justin Herbert not found!")
