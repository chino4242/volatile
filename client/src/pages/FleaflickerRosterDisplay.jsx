// client/src/pages/FleaflickerRosterDisplay.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function FleaflickerRosterDisplay() {
  const { leagueId, rosterId } = useParams();
  
  const [enrichedRoster, setEnrichedRoster] = useState([]);
  const [ownerName, setOwnerName] = useState('');
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
      // Step 1: Fetch the league data, which now includes the complete master player list.
      const leagueData = await get(`/api/fleaflicker/league/${currentLeagueId}/data`);
      
      const specificRosterFromServer = leagueData.rosters?.find(r => r.roster_id === currentRosterId);

      if (!specificRosterFromServer) {
        throw new Error("Roster not found in this league.");
      }
      
      setOwnerName(specificRosterFromServer.owner_name || 'Unknown Owner');
      const playersOnRoster = specificRosterFromServer.players || [];

      // Step 2: Create a reliable lookup map from the complete master list.
      const masterPlayerMapByName = new Map();
      if (leagueData.master_player_list) {
          leagueData.master_player_list.forEach(player => {
              masterPlayerMapByName.set(cleanseName(player.full_name), player);
          });
      }

      // Step 3: Get the correct sleeper_ids for the players on THIS roster.
      const sleeperIdsForAnalysis = playersOnRoster.map(p => {
          const masterPlayer = masterPlayerMapByName.get(cleanseName(p.full_name));
          return masterPlayer ? masterPlayer.sleeper_id : null;
      }).filter(id => id); // Filter out any nulls

      
      let analysisDataMap = new Map();
      let fantasyCalcValues = {};

      // Step 4: Fetch supplemental data from FantasyCalc and the Python API.
      if (sleeperIdsForAnalysis.length > 0) {
        const [calcValuesResponse, analysisPlayersResponse] = await Promise.all([
          get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`), // Using 1QB setting
          fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sleeper_ids: sleeperIdsForAnalysis })
          }).then(res => {
            if (!res.ok) throw new Error(`Python API responded with status: ${res.status}`);
            return res.json();
          })
        ]);
        
        fantasyCalcValues = calcValuesResponse;
        analysisPlayersResponse.forEach(player => {
            if (player && player.sleeper_id && !player.error) {
                analysisDataMap.set(String(player.sleeper_id), player);
            }
        });
      }
      
      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

      // Step 5: Enrich the player list with all data sources
      const finalRoster = playersOnRoster.map(player => {
        const masterPlayer = masterPlayerMapByName.get(cleanseName(player.full_name));
        const analysis = masterPlayer ? analysisDataMap.get(String(masterPlayer.sleeper_id)) : null;
        const calcValueData = fantasyCalcValuesMap.get(cleanseName(player.full_name));
        
        return {
          ...player,
          age: player.age || analysis?.age || 'N/A',
          trade_value: calcValueData ? calcValueData.value : 0,
          overall_rank: analysis ? (analysis.overall_rank || 'N/A') : 'N/A',
          positional_rank: analysis ? (analysis.positional_rank || 'N/A') : 'N/A',
          tier: analysis ? (analysis.tier || 'N/A') : 'N/A',
        };
      });

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
        Team: {ownerName} (Roster ID: {rosterId})
      </h2>
      <p>Players sorted by FantasyCalc Dynasty 1-QB Value (0.5 PPR).</p>
      
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
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Pos. Rank</th>
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

export default FleaflickerRosterDisplay;

