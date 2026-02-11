import os
import sys

# Set environment variables
os.environ['PLAYER_VALUES_TABLE'] = 'PlayerValue-ltn5ogs56nen3ohocnowzq2z5m-NONE'
os.environ['AWS_REGION'] = 'us-east-2'

# Import and run the handler
from amplify_processing_handler import lambda_handler

if __name__ == '__main__':
    print("Starting player data processing...")
    result = lambda_handler({}, {})
    print(f"\nResult: {result}")
