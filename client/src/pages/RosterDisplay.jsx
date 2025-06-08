// client/src/pages/RosterDisplay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // === FOR DEBUGGING MOBILE ISSUE ===
  // State to hold the URL we are trying to fetch, so we can display it.
  const [debugApiUrl, setDebugApiUrl] = useState('');
  // ===================================

  const fetchRosterDetails = useCallback(async (currentLeagueId, currentRosterId) => {
    if (!currentLeagueId || !currentRosterId) {
      setLoading(false);
      setError("League ID and Roster ID are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Construct the endpoint path
      const endpointPath = `/api/league/${currentLeagueId}/roster/${currentRosterId}`;
      
      // === FOR DEBUGGING MOBILE ISSUE ===
      // Get the full URL from the apiService logic and store it for display
      const fullApiUrl = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000') + endpointPath;
      setDebugApiUrl(fullApiUrl);
      // ===================================

      // Use the imported 'get' function from your apiService, which uses the same logic
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


  // --- Rendering Logic ---

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <p>Loading roster details...</p>
        {/* Display the URL we are attempting to fetch */}
        <p style={{ color: 'grey', fontSize: '12px' }}>Attempting to fetch from: {debugApiUrl}</p>
      </div>
    );
  }

  // Display error and the URL that was attempted
  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <p style={{ color: 'red' }}>Error loading roster: {error}</p>
        <p style={{ color: 'grey', fontSize: '12px' }}>Failed URL: {debugApiUrl}</p>
      </div>
    );
  }

  if (!rosterData) {
    return <div style={{ padding: '20px' }}>No roster data found.</div>;
  }

  // Successful render
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
       {/* === FOR DEBUGGING MOBILE ISSUE === */}
      <p style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '5px', fontSize: '12px', fontFamily: 'monospace' }}>
        Debug Info: Fetched from {debugApiUrl}
      </p>
      {/* =================================== */}

      {rosterData.manager_display_name && (
        <h2>
          Manager: {rosterData.manager_display_name} (Roster ID: {rosterData.roster_id})
        </h2>
      )}
      {/* ... rest of your successful render JSX ... */}
      <h4>Players ({rosterData.players ? rosterData.players.length : 0}):</h4>
      {rosterData.players && rosterData.players.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '800px' }}>
          <thead>
            {/* ... table headers ... */}
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
