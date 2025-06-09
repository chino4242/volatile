import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

function FreeAgentsPage() {
    // Get leagueId from the URL
    const { leagueId } = useParams();
    const [freeAgents, setFreeAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFreeAgents = useCallback(async (currentLeagueId) => {
        if(!currentLeagueId) {
            setError("A league ID is required to find free agents");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Call the express endpoint
            const data = await get(`/api/league/${currentLeagueId}/free-agents`);
            //Sort the data alphabetically by player name
            data.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
            setFreeAgents(data);
        } catch (e) {
            console.error("Failed to fetch free agents:", e);
            setError(e.message || "An unknown error occurred while fetching free agents");
         } finally {
                setLoading(false);
            }
        }, []);

        useEffect(() => {
            fetchFreeAgents(leagueId);

        }, [leagueId, fetchFreeAgents]);

        if (loading) {
            return <div style={{ padding: '20px' }}>Loading free agents...</div>;
  }
  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }
   return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Free Agents for League {leagueId}</h2>
      <p>Found {freeAgents.length} available players.</p>
      
      {freeAgents.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Full Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Position</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Age</th>
            </tr>
          </thead>
          <tbody>
            {freeAgents.map((player) => (
              <tr key={player.player_id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.full_name || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.position || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.team || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.age || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No free agents found, or all players are rostered.</p>
      )}
    </div>
  );
}

export default FreeAgentsPage;