"""
Utility functions for standardizing player names across the application.

This module provides consistent name cleansing to ensure player names
match between different data sources (Sleeper, FantasyCalc, Fleaflicker, etc.)
"""

import re


def cleanse_name(name):
    """
    Standardizes player names for consistent matching across the application.
    
    Rules:
    - Converts to lowercase
    - Removes suffixes (Jr, Sr, II, III, IV, V)
    - Removes periods, quotes, apostrophes, and commas
    - Normalizes whitespace
    - Trims leading/trailing spaces
    
    Args:
        name: The player name to cleanse (string or any type)
        
    Returns:
        str: The cleansed name, or empty string if input is invalid
        
    Examples:
        >>> cleanse_name("Patrick Mahomes II")
        'patrick mahomes'
        >>> cleanse_name("D'Andre Swift")
        'dandre swift'
        >>> cleanse_name("T.J. Hockenson")
        'tj hockenson'
    """
    if not isinstance(name, str):
        return ""
    
    # Convert to lowercase
    cleaned = name.lower()
    
    # Remove suffixes (with optional period)
    cleaned = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b\.?', '', cleaned, flags=re.IGNORECASE)
    
    # Remove periods, apostrophes, quotes, and commas
    cleaned = re.sub(r"[.'\",]", '', cleaned)
    
    # Collapse multiple spaces to single space
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Trim leading/trailing spaces
    return cleaned.strip()
