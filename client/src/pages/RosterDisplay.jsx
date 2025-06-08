// client/src/pages/RosterDisplay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the environment variable's value to display it for debugging.
  const apiUrlFromEnv = process.env.REACT_APP_API_BASE_URL;

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

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      {/* === ENVIRONMENT VARIABLE DEBUG PANEL === */}
      <div style={{ border: '2px solid blue', padding: '10px', marginBottom: '20px', background: '#f0f8ff' }}>
        <h3 style={{ marginTop: '0' }}>Environment Debug Info</h3>
        <p style={{ margin: '5px 0' }}>
          <strong>Value of process.env.REACT_APP_API_BASE_URL:</strong>
        </p>
        <p style={{ background: '#e0e0e0', padding: '5px', wordBreak: 'break-all' }}>
          {apiUrlFromEnv ? `"${apiUrlFromEnv}"` : "Not Set (undefined or null)"}
        </p>
        <p style={{ fontSize: '12px', color: 'grey', marginTop: '10px' }}>
          (If this shows "Not Set", the environment variable is not configured correctly for this build on Render.)
        </p>
      </div>
      {/* ======================================= */}

      {loading && <p>Loading roster details...</p>}
      
      {error && (
        <div style={{ color: 'red' }}>
          <h4>Error loading roster:</h4>
          <p>{error}</p>
        </div>
      )}

      {rosterData && (
        <div>
          {rosterData.manager_display_name && (
            <h2>
              Manager: {rosterData.manager_display_name} (Roster ID: {rosterData.roster_id})
            </h2>
          )}
          {/* ... rest of your successful roster display JSX ... */}
          <h4>Players ({rosterData.players ? rosterData.players.length : 0}):</h4>
          {rosterData.players && rosterData.players.length > 0 ? (
            <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '800px' }}>
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
      )}
    </div>
  );
}

export default RosterDisplay;
