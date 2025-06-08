// client/src/pages/RosterDisplay.jsx
// one more comment
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRosterDetails = useCallback(async (currentLeagueId, currentRosterId) => {
    if (!currentLeagueId || !currentRosterId) {
      setLoading(false);
      setError("League ID and Roster ID are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpointPath = `/api/league/${currentLeagueId}/roster/${currentRosterId}`;
      const data = await get(endpointPath);
      setRosterData(data);
    } catch (e) {
      console.error("Failed to fetch roster details:", e);
      setError(e.message || "An unknown error occurred while fetching roster details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRosterDetails(leagueId, rosterId);
  }, [leagueId, rosterId, fetchRosterDetails]);


  if (loading) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading roster details...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red', fontFamily: 'sans-serif' }}>Error loading roster: {error}</div>;
  }

  if (!rosterData) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>No roster data found.</div>;
  }

  // Render the roster data
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {rosterData.manager_display_name && (
        <h2>
          Manager: {rosterData.manager_display_name} (Roster ID: {rosterData.roster_id})
        </h2>
      )}
      <h4>Players ({rosterData.players ? rosterData.players.length : 0}):</h4>
      {rosterData.players && rosterData.players.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '800px', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Player ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Full Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Position</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rosterData.players.map((player) => (
              <tr key={player.player_id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.player_id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.full_name || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.position || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.team || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {rosterData.starters && rosterData.starters.includes(player.player_id) ? 
                    <strong>Starter</strong> : 
                    'Bench'
                  }
                </td>
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
