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
      // Step 1: Fetch the basic roster data from your Node.js API first.
      const rosterData = await get(`/api/sleeper/league/${currentLeagueId}/roster/${currentRosterId}`);
      console.log("--- STEP 1: Basic Roster Data from Node.js ---", rosterData);
      
      setManagerName(rosterData.manager_display_name || 'Unknown Owner');
      const playerIds = rosterData.players.map(p => p.player_id);

      // --- Step 2: Fetch both supplemental data sources concurrently ---
      let analysisDataMap = new Map();

      if (playerIds.length > 0) {
        const [calcValuesResponse, analysisPlayersResponse] = await Promise.all([
          // Source A: Trade values from FantasyCalc via your Node.js API
          get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`),
          
          // Source B: Deep analysis from your Python API
          fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sleeper_ids: playerIds })
          }).then(res => {
              if (!res.ok) throw new Error(`Python API responded with status: ${res.status}`);
              return res.json();
          })
        ]);
        
        console.log("--- STEP 2a: Raw FantasyCalc Response from Node.js API ---", calcValuesResponse);

        // Process Python API response
        console.log("--- STEP 2b: Raw Analysis from Python API ---", analysisPlayersResponse);
        analysisPlayersResponse.forEach(player => {
            if (player && player.sleeper_id && !player.error) {
                analysisDataMap.set(String(player.sleeper_id), player);
            }
        });
        console.log("--- STEP 2c: Constructed Analysis Map ---", analysisDataMap);

        // --- THIS IS THE FINAL FIX ---
        // Create a lookup map for FantasyCalc values.
        // The API returns an object, so we iterate over its [key, value] pairs.
        const fantasyCalcMap = new Map();
        if (calcValuesResponse && typeof calcValuesResponse === 'object') {
          // Object.entries() gives us an array of [key, value] pairs.
          // e.g., [ ["josh allen", { value: 7778, ... }], ["jayden daniels", { value: 6522, ... }] ]
          Object.entries(calcValuesResponse).forEach(([cleansedNameKey, playerData]) => {
              // The key is already the cleansed name, so we use it directly.
              // We just need to check that the player data object has a value.
              if (playerData && typeof playerData.value !== 'undefined') {
                fantasyCalcMap.set(cleansedNameKey, playerData.value);
              }
          });
        } else {
            console.warn("FantasyCalc response was not a valid object.");
        }
        console.log("--- STEP 3: Constructed FantasyCalc Map ---", fantasyCalcMap);
        // --- END OF FIX ---


        // Step 4: Enrich the player list with all data sources
        const finalRoster = rosterData.players.map(player => {
          const analysis = analysisDataMap.get(String(player.player_id));
          // Look up trade value using the cleansed player name
          const tradeValue = fantasyCalcMap.get(cleanseName(player.full_name)) || 0;
          
          return {
            ...player, // Basic info from Sleeper
            age: player.age || (analysis ? analysis.age : 'N/A'),
            overall_rank: analysis ? (analysis.overall_rank || 'N/A') : 'N/A',
            positional_rank: analysis ? (analysis.positional_rank || 'N/A') : 'N/A',
            tier: analysis ? (analysis.tier || 'N/A') : 'N/A',
            trade_value: tradeValue, // Add the trade value here
          };
        });

        // Step 5: Sort the final roster by trade value (descending)
        finalRoster.sort((a, b) => b.trade_value - a.trade_value);
        
        setEnrichedRoster(finalRoster);
      } else {
        // Handle case where roster has no players
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


  if (loading) {
    return <div style={{ padding: '20px' }}>Loading roster and analysis...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  // --- Rendering logic now includes the Trade Value column ---
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

export default RosterDisplay;
