// client/src/pages/RosterDisplay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

// Helper function to cleanse names for matching
function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();
  
  // This state will hold the final, sorted list of players with their values
  const [enrichedRoster, setEnrichedRoster] = useState([]);
  
  // We still need the raw manager name from the initial fetch
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
      // Use Promise.all to fetch the roster and the trade values concurrently
      const [rosterData, valuesData] = await Promise.all([
        get(`/api/league/${currentLeagueId}/roster/${currentRosterId}`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`)
      ]);
      
      console.log("Processing and enriching roster data...");

      // Set the manager name from the roster data
      setManagerName(rosterData.manager_display_name || 'Unknown Owner');

      // Enrich the player list from the roster data with trade values
      const enriched = rosterData.players.map(player => {
        const cleansedName = cleanseName(player.full_name);
        const valueData = valuesData[cleansedName]; // Look up value by cleansed name
        
        return {
          ...player,
          trade_value: valueData ? valueData.value : 0,
        };
      });

      // Sort the enriched list by trade_value, highest to lowest
      enriched.sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedRoster(enriched);

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
    return <div style={{ padding: '20px' }}>Loading roster and player values...</div>;
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
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '900px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Full Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Position</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Age</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Trade Value</th>
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
