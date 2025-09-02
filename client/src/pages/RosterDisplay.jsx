// client/src/pages/RosterDisplay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import './RosterDisplay.css';

// Define the base URL for your Python Analysis API from environment variables
const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();
  
  const [enrichedRoster, setEnrichedRoster] = useState([]);
  const [managerName, setManagerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to cleanse names for matching with FantasyCalc data
  const cleanseName = (name) => (typeof name === 'string' ? name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : '');

  const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
    if (!currentLeagueId || !currentRosterId) {
      setError("League ID and Roster ID are required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rosterData = await get(`/api/sleeper/league/${currentLeagueId}/roster/${currentRosterId}`);
      
      setManagerName(rosterData.manager_display_name || 'Unknown Owner');
      const playerIds = rosterData.players.map(p => p.player_id);

      let analysisDataMap = new Map();

      if (playerIds.length > 0) {
        const [calcValuesResponse, analysisPlayersResponse] = await Promise.all([
          get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`),
          fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sleeper_ids: playerIds })
          }).then(res => {
              if (!res.ok) throw new Error(`Python API responded with status: ${res.status}`);
              return res.json();
          })
        ]);
        
        analysisPlayersResponse.forEach(player => {
            if (player && player.sleeper_id && !player.error) {
                analysisDataMap.set(String(player.sleeper_id), player);
            }
        });

        const fantasyCalcMap = new Map();
        if (calcValuesResponse && typeof calcValuesResponse === 'object') {
          Object.entries(calcValuesResponse).forEach(([cleansedNameKey, playerData]) => {
              if (playerData && typeof playerData.value !== 'undefined') {
                fantasyCalcMap.set(cleansedNameKey, playerData.value);
              }
          });
        } else {
            console.warn("FantasyCalc response was not a valid object.");
        }
        
        const finalRoster = rosterData.players.map(player => {
          const analysis = analysisDataMap.get(String(player.player_id));
          const tradeValue = fantasyCalcMap.get(cleanseName(player.full_name)) || 0;
          
          return {
            ...player,
            age: player.age || (analysis ? analysis.age : 'N/A'),
            overall_rank: analysis ? (analysis.overall_rank || 'N/A') : 'N/A',
            positional_rank: analysis ? (analysis.positional_rank || 'N/A') : 'N/A',
            tier: analysis ? (analysis.tier || 'N/A') : 'N/A',
            trade_value: tradeValue,
          };
        });

        finalRoster.sort((a, b) => b.trade_value - a.trade_value);
        
        setEnrichedRoster(finalRoster);
      } else {
        setEnrichedRoster([]);
      }

    } catch (e) {
      console.error("Failed to fetch page data:", e);
      setError(e.message || "An unknown error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(leagueId, rosterId);
  }, [leagueId, rosterId, fetchData]);

  // --- START: CELL-SPECIFIC STYLING LOGIC ---

  /**
   * Returns a CSS class based on the player's position.
   */
  const getPositionClass = (player) => {
    if (!player.position) return '';
    return player.position.toLowerCase(); // e.g., 'QB' becomes 'qb'
  };

  /**
   * Returns a CSS class for the Trade Value cell.
   * Highlights players with significant value.
   */
  const getTradeValueClass = (player) => {
    if (player.trade_value > 5000) return 'super-elite';
    if (player.trade_value > 2000) return 'elite';
    if (player.trade_value > 1000) return 'positive';
    return ''; // No special class
  };

  /**
   * Returns a CSS class based on a player's overall rank.
   */
  const getOverallRankClass = (player) => {
    const rank = player.overall_rank;
    if (rank === 'N/A') return '';
    
    if (rank <= 24) return 'category-starter';
    if (rank <= 75) return 'category-flex';
    return 'category-bench';
  };

  /**
   * Returns a CSS class based on a player's tier.
   */
  const getTierClass = (player) => {
    const tier = player.tier;
    if (tier === 'N/A' || tier === null) return '';
    
    if (tier <= 1) return 'super-elite';
    if (tier <= 5) return 'top-five';
    if (tier <= 10) return 'top-ten';
    return '';
  };

  // --- END: CELL-SPECIFIC STYLING LOGIC ---


  if (loading) {
    return <div className="roster-container">Loading roster and analysis...</div>;
  }

  if (error) {
    return <div className="roster-container" style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="roster-container">
      <h2>
        Manager: {managerName} (Roster ID: {rosterId})
      </h2>
      <p>Players sorted by FantasyCalc Dynasty Superflex Value (0.5 PPR).</p>
      
      {enrichedRoster.length > 0 ? (
        <table className="roster-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Position</th>
              <th>Team</th>
              <th>Age</th>
              <th>Trade Value</th>
              <th>Overall Rank</th>
              <th>Pos. Rank</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {enrichedRoster.map((player) => (
              <tr key={player.player_id}>
                <td>{player.full_name || 'N/A'}</td>
                <td className={getPositionClass(player)}>{player.position || 'N/A'}</td>
                <td>{player.team || 'N/A'}</td>
                <td>{player.age || 'N/A'}</td>
                <td className={getTradeValueClass(player)}>{player.trade_value}</td>
                <td className={getOverallRankClass(player)}>{player.overall_rank}</td>
                <td>{player.positional_rank}</td>
                <td className={getTierClass(player)}>{player.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No players found on this roster.</p>
      )}
    </div>
  );
}

export default RosterDisplay;