// client/src/pages/RosterDisplay.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService'; // Using your service for the Node.js API

// Define the base URL for your Python Analysis API from environment variables
const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();
  
  const [enrichedRoster, setEnrichedRoster] = useState([]);
  const [managerName, setManagerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
    if (!currentLeagueId || !currentRosterId) {
      setError("League ID and Roster ID are required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch the basic roster and FantasyCalc values concurrently.
      const [rosterData, fantasyCalcValues] = await Promise.all([
        get(`/api/league/${currentLeagueId}/roster/${currentRosterId}`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`),
      ]);
      
      setManagerName(rosterData.manager_display_name || 'Unknown Owner');

      // Step 2: Now that we have the roster, fetch the deep analysis data for its players.
      const playerIds = rosterData.players.map(p => p.player_id);
      let analysisDataMap = new Map();

      if (playerIds.length > 0) {
          const analysisResponse = await fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sleeper_ids: playerIds })
          });
          if (!analysisResponse.ok) {
            throw new Error(`Python API responded with status: ${analysisResponse.status}`);
          }
          const analysisPlayers = await analysisResponse.json();

          // <<< DEBUG LOG 1: See what the Python API is actually sending back >>>
          console.log("Raw analysis data from Python API:", analysisPlayers);
          
          analysisPlayers.forEach(player => {
              if (player && player.sleeper_player_id) {
                  analysisDataMap.set(String(player.sleeper_player_id), player);
              }
          });

          // <<< DEBUG LOG 2: See what the lookup map looks like >>>
          console.log("Built analysisDataMap:", analysisDataMap);
      }

      // Step 3: Create lookup map and enrich the player list with all data sources
      const cleanseName = (name) => (typeof name === 'string' ? name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : '');
      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

      const finalRoster = rosterData.players.map(player => {
        const analysis = analysisDataMap.get(String(player.player_id));
        const cleansedName = cleanseName(player.full_name);
        const calcValueData = fantasyCalcValuesMap.get(cleansedName);
        
        // <<< DEBUG LOG 3: See if the lookup is working for the first player >>>
        if (player === rosterData.players[0]) {
            console.log(`Lookup for first player (ID: ${player.player_id}):`, analysis);
        }

        return {
          ...player, // Basic info from Sleeper
          age: player.age || (analysis ? analysis.age : 'N/A'),
          overall_rank: analysis?.overall_rank || 'N/A',
          positional_rank: analysis ? (analysis['Positional Rank'] || 'N/A') : 'N/A',
          tier: analysis?.tier || 'N/A',
          trade_value: calcValueData ? calcValueData.value : 0,
        };
      });

      // Step 4: Sort the final roster by trade value
      finalRoster.sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedRoster(finalRoster);

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

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading roster and analysis...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>
        Manager: {managerName} (Roster ID: {rosterId})
      </h2>
      <p>Players sorted by FantasyCalc Dynasty Superflex Value (0.5 PPR).</p>
      
      {enrichedRoster.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '1200px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Full Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Position</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Age</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Trade Value</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Overall Rank</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Positional Rank</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tier</th>
            </tr>
          </thead>
          <tbody>
            {enrichedRoster.map((player) => (
              <tr key={player.player_id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.full_name || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.position || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.team || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.age || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>{player.trade_value}</strong></td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.overall_rank}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.positional_rank}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.tier}</td>
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
