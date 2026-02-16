import boto3
from boto3.dynamodb.conditions import Attr

TABLE_NAME = 'PlayerValue-5krgd6zxqjdsjbtbwatcxxpd2a-NONE'
REGION = 'us-east-1'

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

response = table.scan(
    FilterExpression=Attr('full_name').eq('Jared Goff')
)

print(f"Items found: {response['Count']}")
for item in response['Items']:
    print(item)
