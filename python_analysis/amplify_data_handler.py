import json
import boto3
import os
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB resource
# Note: In Lambda, AWS_REGION is set automatically
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('PLAYER_VALUES_TABLE', 'PlayerValues')
table = dynamodb.Table(TABLE_NAME)

def decimal_default(obj):
    """Helper to convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    """
    AWS Lambda Handler for Data API
    Routes:
    - GET /api/enriched-players: Returns all players (Scan)
    - GET /api/enriched-players/sleeper/{id}: Returns single player
    - POST /api/enriched-players/batch: Returns multiple players
    """
    print("Received event:", json.dumps(event))
    
    # Handle different event formats (API Gateway v1 vs v2)
    path = event.get('rawPath') or event.get('path')
    http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }

    if http_method == 'OPTIONS':
        return { 'statusCode': 200, 'headers': headers, 'body': '' }

    try:
        # Route: Get Single Player by ID
        # Path pattern: /api/enriched-players/sleeper/123
        if path and '/api/enriched-players/sleeper/' in path and http_method == 'GET':
            sleeper_id = path.split('/')[-1]
            response = table.get_item(Key={'sleeper_id': sleeper_id})
            item = response.get('Item')
            
            if item:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(item, default=decimal_default)
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Player not found'})
                }

        # Route: Batch Lookup
        if path == '/api/enriched-players/batch' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            sleeper_ids = body.get('sleeper_ids', [])
            
            # BatchGetItem is more efficient but requires properly formatted keys
            # For simplicity in this draft, we'll loop get_item or use BatchGet if list is small.
            # DynamoDB batch_get_item supports up to 100 items/16MB.
            
            results = []
            # Splitting into chunks of 100 if necessary, but simple loop for prototype
            # Better approach: Use Keys list
            
            if not sleeper_ids:
                 return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No IDs provided'})}

            # Loop approach (naive but safe for small batches)
            # Optimization: Use dynamodb.batch_get_item
            keys_to_get = [{'sleeper_id': str(sid)} for sid in sleeper_ids]
            
            # Use Client for batch_get_item (Resource batch_get is also available)
            # We'll stick to a simple implementation for now:
            request_items = {
                TABLE_NAME: {
                    'Keys': keys_to_get,
                    'ConsistentRead': False
                }
            }
            
            # Note: UnprocessedKeys handling omitted for brevity in V1
            batch_response = dynamodb.batch_get_item(RequestItems=request_items)
            results = batch_response.get('Responses', {}).get(TABLE_NAME, [])
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(results, default=decimal_default)
            }

        # Route: Get All Enriched Players
        if path == '/api/enriched-players' and http_method == 'GET':
            # Scan with pagination
            response = table.scan()
            items = response.get('Items', [])
            
            while 'LastEvaluatedKey' in response:
                response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                items.extend(response.get('Items', []))
                
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(items, default=decimal_default)
            }

        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Route not found'})
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
