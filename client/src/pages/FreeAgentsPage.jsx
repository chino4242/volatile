// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

// Define the base URL for your Python Analysis API from environment variables
const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// Helper function to cleanse names for matching, should be consistent with the backend version
function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function FreeAgentsPage() {
  const { leagueId } = useParams();
  
  const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) {
      setError("A League ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch the basic free agent list and FantasyCalc values concurrently.
      const [freeAgentsData, fantasyCalcValues] = await Promise.all([
        get(`/api/league/${currentLeagueId}/free-agents`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`) 
      ]);

      // <<< DEBUG LOG 1: See the initial list of free agents from your Node API >>>
      console.log("Raw Free Agents Data (from Node.js):", freeAgentsData);

      // Step 2: Fetch the deep analysis data for the retrieved free agents.
      const playerIds = freeAgentsData.map(p => p.player_id);
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
        
        // <<< DEBUG LOG 2: See exactly what the Python API returns for this list of players >>>
        console.log("Raw Analysis Data (from Python API):", analysisPlayers);

        analysisPlayers.forEach(player => {
            if (player && player.sleeper_player_id) {
                analysisDataMap.set(String(player.sleeper_player_id), player);
            }
        });

        // <<< DEBUG LOG 3: See the map that was built from the Python data >>>
        console.log("Built Analysis Data Map:", analysisDataMap);
      }

      // Create a lookup map for FantasyCalc values
      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

      // Step 3: Enrich the free agent list with all data sources.
      const finalFreeAgents = freeAgentsData.map((player, index) => {
        const analysis = analysisDataMap.get(String(player.player_id));
        const cleansedName = cleanseName(player.full_name);
        const calcValueData = fantasyCalcValuesMap.get(cleansedName);
        
        // <<< DEBUG LOG 4: Check the lookup result for the first player in the list >>>
        if (index === 0) {
          console.log(`--- Debugging first free agent: ${player.full_name} (ID: ${player.player_id}) ---`);
          console.log("Analysis data found:", analysis);
          console.log("FantasyCalc data found:", calcValueData);
        }

        return {
          ...player,
          age: player.age || (analysis ? analysis.age : 'N/A'),
          overall_rank: analysis ? (analysis.Overall || analysis.Rk || 'N/A') : 'N/A',
          positional_rank: analysis ? (analysis['Pos. Rank'] || 'N/A') : 'N/A',
          tier: analysis ? (analysis.Tier || 'N/A') : 'N/A',
          trade_value: calcValueData ? calcValueData.value : 0,
        };
      });

      // Filter to show only skill positions and sort by trade value
      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filteredAndSorted = finalFreeAgents
        .filter(player => skillPositions.includes(player.position))
        .sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedFreeAgents(filteredAndSorted);

    } catch (e) {
      console.error("Failed to fetch page data:", e);
      setError(e.message || "An unknown error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(leagueId);
  }, [leagueId, fetchData]);


  if (loading) {
    return <div style={{ padding: '20px' }}>Loading free agents and analysis...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Top Free Agents by Value for League {leagueId}</h2>
      <p>Found {enrichedFreeAgents.length} available players (QB, WR, RB, TE), sorted by FantasyCalc Dynasty Superflex Value (0.5 PPR).</p>
      
      {enrichedFreeAgents.length > 0 ? (
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
            {enrichedFreeAgents.map((player) => (
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
        <p>No free agents found at the specified positions, or all players are rostered.</p>
      )}
    </div>
  );
}

export default FreeAgentsPage;
