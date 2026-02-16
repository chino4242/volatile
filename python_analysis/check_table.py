import boto3

# Check how many records are in the table
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE')

response = table.scan(Select='COUNT')
print(f"Records in table: {response['Count']}")

# Sample one record to see if rankings are populated
response2 = table.scan(Limit=1)
if response2['Items']:
    print("\nSample record:")
    print(response2['Items'][0])
