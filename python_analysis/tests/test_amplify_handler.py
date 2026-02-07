import unittest
from unittest.mock import MagicMock, patch
import pandas as pd
import io
import sys
import os

# Add python_analysis directory to path
# Add parent directory to path so we can import modules from the project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock boto3 before importing the handler
sys.modules['boto3'] = MagicMock()

import amplify_processing_handler

class TestAmplifyProcessing(unittest.TestCase):
    
    @patch('amplify_processing_handler.s3')
    @patch('amplify_processing_handler.table') # Patch the module-level 'table' variable
    @patch('amplify_processing_handler.requests.get')
    def test_lambda_handler(self, mock_get, mock_table, mock_s3):
        # 1. Mock FantasyCalc API
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {
                'player': {'sleeperId': '123', 'name': 'Test Player'},
                'value': 5000,
                'overallRank': 10,
                'trend30Day': 50,
                'redraftValue': 4000
            },
            {
                'player': {'sleeperId': '456', 'name': 'Another Guy'},
                'value': 2000,
                'overallRank': 100
            }
        ]
        mock_get.return_value = mock_response
        
        # 2. Mock S3 List Objects
        mock_s3.list_objects_v2.return_value = {}
        
        # 3. Mock Table behavior for batch_writer
        # Ensure batch_writer returns a context manager
        mock_batch = MagicMock()
        mock_table.batch_writer.return_value = mock_batch
        mock_batch.__enter__.return_value = mock_batch
        mock_batch.__exit__.return_value = None
        
        # Run Handler
        result = amplify_processing_handler.lambda_handler({}, {})
        
        # Verify
        self.assertEqual(result['statusCode'], 200)
        self.assertIn('Successfully updated 2 players', result['body'])
        
        # Check that batch_writer was called
        mock_table.batch_writer.assert_called()
        # check put_item was called
        self.assertTrue(mock_batch.put_item.called)
        
    def test_cleanse_name(self):
        self.assertEqual(amplify_processing_handler.cleanse_name("Patrick Mahomes II"), "patrick mahomes")
        self.assertEqual(amplify_processing_handler.cleanse_name("Calkins, Ryan"), "calkins ryan") 
        
if __name__ == '__main__':
    unittest.main()
