// client/src/pages/FleaflickerHomePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get } from '../api/apiService';
import { getFantasyCalcValues } from '../api/fantasyCalc';
import './RosterDisplay.css'; // Import shared CSS for table styling

function FleaflickerHomePage() {
  const { leagueId: urlLeagueId } = useParams();
  const navigate = useNavigate();

  // Use a default Fleaflicker league ID if none is provided in the URL
  const defaultLeagueId = "197269";
  const leagueId = urlLeagueId || defaultLeagueId;

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortColumn, setSortColumn] = useState('overall'); // 'overall', 'QB', 'WR', 'TE', 'RB', 'owner_name'
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

  const fetchTeams = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) return;

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching teams for Fleaflicker league:', currentLeagueId);

      // Fetch league data - rosters already include player arrays
      const data = await get(`/api/fleaflicker/league/${currentLeagueId}/data`);
      const rosters = data.rosters || [];

      if (!Array.isArray(rosters)) {
        throw new Error('Invalid response format from server');
      }

      // Fetch FantasyCalc values (using default dynasty 1QB settings)
      const calcValuesResponse = await getFantasyCalcValues({
        isDynasty: true,
        numQbs: 1,
        ppr: 1,
        numTeams: 12
      });

      // Create a name cleansing helper
      const cleanseName = (name) => {
        if (!name) return '';
        return name.toLowerCase().replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim();
      };

      // Build FantasyCalc value map
      const fantasyCalcMap = new Map();
      if (calcValuesResponse && typeof calcValuesResponse === 'object') {
        Object.entries(calcValuesResponse).forEach(([cleansedNameKey, playerData]) => {
          if (playerData && typeof playerData.value !== 'undefined') {
            fantasyCalcMap.set(cleansedNameKey, playerData.value);
          }
        });
      }

      // Enrich rosters with FantasyCalc values and calculate position totals
      const teamsWithValues = rosters.map(roster => {
        // Merge FantasyCalc values into players
        const enrichedPlayers = (roster.players || []).map(player => {
          const tradeValue = fantasyCalcMap.get(cleanseName(player.full_name)) || 0;
          return {
            ...player,
            fantasy_calc_value: tradeValue
          };
        });

        // Calculate position values
        const values = calculatePositionValues(enrichedPlayers);
        console.log(`[League Overview] ${roster.owner_name} values:`, values);

        return {
          ...roster,
          players: enrichedPlayers,
          values
        };
      });

      // Sort teams by owner name
      teamsWithValues.sort((a, b) => (a.owner_name || '').localeCompare(b.owner_name || ''));
      setTeams(teamsWithValues);
    } catch (e) {
      console.error("Failed to fetch Fleaflicker teams:", e);
      setError(e.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams(leagueId);
  }, [leagueId, fetchTeams]);

  // Handles submitting the form to view a different league
  const handleLeagueSubmit = (event) => {
    event.preventDefault();
    const newLeagueId = event.target.elements.leagueIdInput.value;
    if (newLeagueId) {
      navigate(`/fleaflicker/${newLeagueId}`);
    }
  };

  // Format numbers with commas
  const formatValue = (value) => {
    return Math.round(value).toLocaleString();
  };

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for values, ascending for names
      setSortColumn(column);
      setSortDirection(column === 'owner_name' ? 'asc' : 'desc');
    }
  };

  // Sort teams based on current sort settings
  const sortedTeams = [...teams].sort((a, b) => {
    let aVal, bVal;

    if (sortColumn === 'owner_name') {
      aVal = a.owner_name || '';
      bVal = b.owner_name || '';
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      // Sorting by value column
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
    return <div style={{ padding: '20px' }}>Loading Fleaflicker league teams and values...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Fleaflicker League Overview</h1>
      <p>Displaying teams for league ID: <strong>{leagueId}</strong></p>

      <form onSubmit={handleLeagueSubmit} style={{ margin: '20px 0' }}>
        <label htmlFor="leagueIdInput">View a different league: </label>
        <input type="text" id="leagueIdInput" name="leagueIdInput" placeholder="Enter Fleaflicker League ID" />
        <button type="submit" style={{ marginLeft: '10px' }}>Go</button>
      </form>

      <Link to={`/fleaflicker/${leagueId}/free-agents`} style={{ display: 'inline-block', marginBottom: '20px' }}>View Free Agents</Link>

      <table style={{ borderCollapse: 'collapse', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
            <th
              style={{ border: '1px solid #34495e', padding: '12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}
              onClick={() => handleSort('owner_name')}
            >
              Team Owner{renderSortIndicator('owner_name')}
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
          {sortedTeams.map((team, index) => {
            // Determine rank for color coding
            const overallRank = sortedTeams
              .slice()
              .sort((a, b) => (b.values?.overall || 0) - (a.values?.overall || 0))
              .findIndex(t => t.roster_id === team.roster_id) + 1;

            let bgColor = '#ffffff';
            if (index % 2 === 1) bgColor = '#f8f9fa'; // Zebra striping

            // Color code top 3 and bottom 3
            if (overallRank === 1) bgColor = '#d4edda'; // Light green
            else if (overallRank === 2) bgColor = '#e2f3e7';
            else if (overallRank === 3) bgColor = '#f0f9f2';
            else if (overallRank === sortedTeams.length) bgColor = '#f8d7da'; // Light red
            else if (overallRank === sortedTeams.length - 1) bgColor = '#fbe5e7';
            else if (overallRank === sortedTeams.length - 2) bgColor = '#fef0f1';

            return (
              <tr
                key={team.roster_id}
                style={{
                  backgroundColor: bgColor,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bgColor}
              >
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  <Link to={`/fleaflicker/${leagueId}/roster/${team.roster_id}`} style={{ textDecoration: 'none', color: '#007bff', fontWeight: '500' }}>
                    {overallRank <= 3 && (overallRank === 1 ? '🥇 ' : overallRank === 2 ? '🥈 ' : '🥉 ')}
                    {team.owner_name}
                  </Link>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right', fontWeight: '500' }}>{formatValue(team.values?.overall || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(team.values?.QB || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(team.values?.WR || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(team.values?.TE || 0)}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatValue(team.values?.RB || 0)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#ecf0f1', fontWeight: '600', borderTop: '2px solid #34495e' }}>
            <td style={{ border: '1px solid #ddd', padding: '12px' }}>League Average</td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(teams.reduce((sum, t) => sum + (t.values?.overall || 0), 0) / teams.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(teams.reduce((sum, t) => sum + (t.values?.QB || 0), 0) / teams.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(teams.reduce((sum, t) => sum + (t.values?.WR || 0), 0) / teams.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(teams.reduce((sum, t) => sum + (t.values?.TE || 0), 0) / teams.length || 0)}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
              {formatValue(teams.reduce((sum, t) => sum + (t.values?.RB || 0), 0) / teams.length || 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default FleaflickerHomePage;
