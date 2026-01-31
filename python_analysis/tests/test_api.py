# python_analysis/tests/test_api.py
import pytest
import sys
import os

# Add parent dir to sys.path to import api_server
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api_server import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check_implied(client):
    """
    Since there is no explicit health check at root in api_server.py,
    we check if we can hit the 404 for root, implying server is up.
    Or we can hit /api/enriched-players/sleeper/invalid
    """
    rv = client.get('/')
    assert rv.status_code == 404 # Should be 404 as no root route

def test_get_player_404(client):
    """Test getting a non-existent player"""
    rv = client.get('/api/enriched-players/sleeper/invalid_id_99999')
    assert rv.status_code == 404
    assert b"Player not found" in rv.data or b"error" in rv.data
