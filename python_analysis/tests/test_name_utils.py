"""
Tests for name_utils.cleanse_name function.
Ensures consistency with JavaScript implementation.
"""

import pytest
from name_utils import cleanse_name


def test_removes_suffixes():
    """Test that suffixes are properly removed."""
    assert cleanse_name('Patrick Mahomes II') == 'patrick mahomes'
    assert cleanse_name('Ken Griffey Jr.') == 'ken griffey'
    assert cleanse_name('John Smith Sr') == 'john smith'
    assert cleanse_name('King Henry III') == 'king henry'
    assert cleanse_name('Robert Griffin IV') == 'robert griffin'
    assert cleanse_name('King Louis V') == 'king louis'


def test_removes_apostrophes_and_periods():
    """Test that apostrophes, periods, and quotes are removed."""
    assert cleanse_name("D'Andre Swift") == 'dandre swift'
    assert cleanse_name('T.J. Hockenson') == 'tj hockenson'
    assert cleanse_name("De'Von Achane") == 'devon achane'
    assert cleanse_name('A.J. Brown') == 'aj brown'


def test_normalizes_whitespace():
    """Test that whitespace is normalized."""
    assert cleanse_name('  Patrick   Mahomes  ') == 'patrick mahomes'
    assert cleanse_name('Josh\tAllen') == 'josh allen'
    assert cleanse_name('Christian  McCaffrey') == 'christian mccaffrey'


def test_handles_edge_cases():
    """Test edge cases like empty strings and non-strings."""
    assert cleanse_name('') == ''
    assert cleanse_name(None) == ''
    assert cleanse_name(123) == ''
    assert cleanse_name([]) == ''
    assert cleanse_name({}) == ''


def test_case_insensitive():
    """Test that names are converted to lowercase."""
    assert cleanse_name('PATRICK MAHOMES') == 'patrick mahomes'
    assert cleanse_name('PaTrIcK mAhOmEs') == 'patrick mahomes'
    assert cleanse_name('justin jefferson') == 'justin jefferson'


def test_real_player_names():
    """Test with actual NFL player names."""
    assert cleanse_name('Odell Beckham Jr.') == 'odell beckham'
    assert cleanse_name("Gabe Davis") == 'gabe davis'
    assert cleanse_name('Travis Kelce') == 'travis kelce'
    assert cleanse_name('CeeDee Lamb') == 'ceedee lamb'
    assert cleanse_name("Ja'Marr Chase") == 'jamarr chase'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
