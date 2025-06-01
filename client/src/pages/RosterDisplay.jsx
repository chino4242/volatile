import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams(); // Get leagueId and rosterId from URL
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leagueId || !rosterId) {
      setLoading(false);
      setError("League ID and Roster ID are required to fetch data.");
      return;
    }

    const fetchRosterDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure your backend is running and accessible at this URL
        const response = await fetch(`http://localhost:5000/api/league/${leagueId}/roster/${rosterId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ // Try to parse error, fallback if not JSON
            message: `HTTP error! Status: ${response.status}`
          }));
          throw new Error(errorData.error || errorData.message || `HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setRosterData(data);
      } catch (e) {
        console.error("Failed to fetch roster details:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRosterDetails();
  }, [leagueId, rosterId]); // Re-fetch if leagueId or rosterId changes

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading roster details...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error loading roster: {error}</div>;
  }

  if (!rosterData) {
    return <div style={{ padding: '20px' }}>No roster data found.</div>;
  }

  // --- Render the roster data ---
  // This structure matches the JSON response we designed for the backend
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {rosterData.manager_display_name && (
        <h2>
          Manager: {rosterData.manager_display_name} (Roster ID: {rosterData.roster_id})
        </h2>
      )}
      {rosterData.owner_id && <p style={{fontSize: '0.9em', color: '#555'}}>Owner ID: {rosterData.owner_id}</p>}

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
                    'Bench' /* You might have other categories like Reserve, Taxi */
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No players found on this roster.</p>
      )}
       {/* You could also display starters, reserves, taxi separately if you enrich rosterData with that */}
    </div>
  );
}

export default RosterDisplay;