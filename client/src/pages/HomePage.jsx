// client/src/pages/HomePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get, post } from '../api/apiService';
import './RosterDisplay.css'; // Import shared CSS for table styling

function HomePage() {
  const { leagueId: urlLeagueId } = useParams();
  const navigate = useNavigate();

  // Use a default league ID if none is provided in the URL
  const defaultLeagueId = "1200992049558454272";
  const leagueId = urlLeagueId || defaultLeagueId;

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortColumn, setSortColumn] = useState('overall'); // 'overall', 'QB', 'WR', 'TE', 'RB', 'display_name'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  // Helper function to calculate position values
  const calculatePositionValues = (players) => {
    const values = {
      overall: 0,
      QB: 0,
      WR: 0,
      TE: 0,
      RB: 0
    };

    if (!players || !Array.isArray(players)) return values;

    players.forEach(player => {
      const value = player.fantasy_calc_value || 0;
      values.overall += value;

      const position = player.position;
      if (position === 'QB') values.QB += value;
      else if (position === 'WR') values.WR += value;
      else if (position === 'TE') values.TE += value;
      else if (position === 'RB') values.RB += value;
    });

    return values;
  };

  const fetchManagers = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) return;

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching managers for league:', currentLeagueId);

      // Fetch managers list
      const managersData = await get(`/api/sleeper/league/${currentLeagueId}/managers`);

      if (!Array.isArray(managersData)) {
        throw new Error('Invalid response format from server');
      }

      // Fetch roster data for each manager first
      const managersWithRosters = await Promise.all(
        managersData.map(async (manager) => {
          try {
            const rosterData = await get(`/api/sleeper/league/${currentLeagueId}/roster/${manager.roster_id}`);
            return {
              ...manager,
              players: rosterData.players || []
            };
          } catch (err) {
            console.error(`Failed to fetch roster ${manager.roster_id}:`, err);
            return {
              ...manager,
              players: []
            };
          }
        })
      );

      // Collect all unique player IDs from all rosters
      const allPlayerIds = new Set();
      managersWithRosters.forEach(manager => {
        manager.players.forEach(player => {
          if (player.player_id) {
            allPlayerIds.add(player.player_id);
          }
        });
      });

      // Fetch player values from DynamoDB using sleeper_id
      let playerValuesMap = new Map();
      if (allPlayerIds.size > 0) {
        try {
          const valuesData = await post('/api/enriched-players/batch', {
            sleeper_ids: Array.from(allPlayerIds)
          });

          // Build a map indexed by sleeper_id
          if (Array.isArray(valuesData)) {
            valuesData.forEach(playerData => {
              if (playerData && playerData.sleeper_id) {
                playerValuesMap.set(playerData.sleeper_id, playerData);
              }
            });
          }
        } catch (err) {
          console.error('Failed to fetch player values from DynamoDB:', err);
        }
      }

      // Enrich players with values and calculate position totals
      const managersWithValues = managersWithRosters.map(manager => {
        const enrichedPlayers = manager.players.map(player => {
          const playerData = playerValuesMap.get(player.player_id) || {};
          return {
            ...player,
            fantasy_calc_value: playerData.fantasy_calc_value || 0,
            // Include any other fields from DynamoDB that might be useful
            ...playerData
          };
        });

        const values = calculatePositionValues(enrichedPlayers);

        return {
          ...manager,
          players: enrichedPlayers,
          values
        };
      });

      // Sort by display name initially
      managersWithValues.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
      setManagers(managersWithValues);
    } catch (e) {
      console.error("Failed to fetch managers:", e);
      setError(e.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers(leagueId);
  }, [leagueId, fetchManagers]);

  // Handles submitting the form to view a different league
  const handleLeagueSubmit = (event) => {
    event.preventDefault();
    const newLeagueId = event.target.elements.leagueIdInput.value;
    if (newLeagueId) {
      navigate(`/league/${newLeagueId}`);
    }
  };

  // Format numbers with commas
  const formatValue = (value) => {
    return Math.round(value).toLocaleString();
  };

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'display_name' ? 'asc' : 'desc');
    }
  };

  // Sort managers based on current sort settings
  const sortedManagers = [...managers].sort((a, b) => {
    let aVal, bVal;

    if (sortColumn === 'display_name') {
      aVal = a.display_name || '';
      bVal = b.display_name || '';
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      aVal = a.values?.[sortColumn] || 0;
      bVal = b.values?.[sortColumn] || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  // Render sort indicator
  const renderSortIndicator = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading league managers and values...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>League Overview</h1>
      <p>Displaying managers for league ID: <strong>{leagueId}</strong></p>

      <form onSubmit={handleLeagueSubmit} style={{ margin: '20px 0' }}>
        <label htmlFor="leagueIdInput">View a different league: </label>
        <input type="text" id="leagueIdInput" name="leagueIdInput" placeholder="Enter Sleeper League ID" />
        <button type="submit" style={{ marginLeft: '10px' }}>Go</button>
      </form>
      <Link to={`/league/${leagueId}/free-agents`} style={{ display: 'inline-block', marginBottom: '20px' }}>View Free Agents</Link>

      <table style={{ borderCollapse: 'collapse', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('display_name')}
            >
              Manager{renderSortIndicator('display_name')}
            </th>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('overall')}
            >
              Overall Value{renderSortIndicator('overall')}
            </th>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('QB')}
            >
              QB Value{renderSortIndicator('QB')}
            </th>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('WR')}
            >
              WR Value{renderSortIndicator('WR')}
            </th>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('TE')}
            >
              TE Value{renderSortIndicator('TE')}
            </th>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('RB')}
            >
              RB Value{renderSortIndicator('RB')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedManagers.map((manager, index) => {
            // Determine rank for color coding
            const overallRank = sortedManagers
              .slice()
              .sort((a, b) => (b.values?.overall || 0) - (a.values?.overall || 0))
              .findIndex(m => m.roster_id === manager.roster_id) + 1;

            let bgColor = '#ffffff';
            if (index % 2 === 1) bgColor = '#f8f9fa';

            // Color code top 3 and bottom 3
            if (overallRank === 1) bgColor = '#d4edda';
            else if (overallRank === 2) bgColor = '#e2f3e7';
            else if (overallRank === 3) bgColor = '#f0f9f2';
            else if (overallRank === sortedManagers.length) bgColor = '#f8d7da';
            else if (overallRank === sortedManagers.length - 1) bgColor = '#fbe5e7';
            else if (overallRank === sortedManagers.length - 2) bgColor = '#fef0f1';

            return (
              <tr
                key={manager.roster_id}
                style={{
                  backgroundColor: bgColor,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bgColor}
              >
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  <Link to={`/league/${leagueId}/roster/${manager.roster_id}`} style={{ textDecoration: 'none', color: '#007bff', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                    <img
                      src={manager.avatar_url || 'https://sleepercdn.com/images/v2/avatars/avatar_default.png'}
                      alt={`${manager.display_name || 'manager'} avatar`}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                    />
                    <span>
                      {overallRank <= 3 && (overallRank === 1 ? '🥇 ' : overallRank === 2 ? '🥈 ' : '🥉 ')}
                      {manager.display_name}
                    </span>
                  </Link>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right', fontWeight: '500' }}>{formatValue(manager.values?.overall || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(manager.values?.QB || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(manager.values?.WR || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(manager.values?.TE || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(manager.values?.RB || 0)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#ecf0f1', fontWeight: '600', borderTop: '2px solid #34495e' }}>
            <td style={{ border: '1px solid #ddd', padding: '12px' }}>League Average</td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(managers.reduce((sum, m) => sum + (m.values?.overall || 0), 0) / managers.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(managers.reduce((sum, m) => sum + (m.values?.QB || 0), 0) / managers.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(managers.reduce((sum, m) => sum + (m.values?.WR || 0), 0) / managers.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(managers.reduce((sum, m) => sum + (m.values?.TE || 0), 0) / managers.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(managers.reduce((sum, m) => sum + (m.values?.RB || 0), 0) / managers.length || 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default HomePage;
