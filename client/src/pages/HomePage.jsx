// client/src/pages/HomePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get } from '../api/apiService';

function HomePage() {
  const { leagueId: urlLeagueId } = useParams();
  const navigate = useNavigate();

  // Use a default league ID if none is provided in the URL
  const defaultLeagueId = "1200992049558454272";
  const leagueId = urlLeagueId || defaultLeagueId;

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchManagers = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) return;

    setLoading(true);
    setError(null);
    try {
      // This calls the /api/league/:leagueId/managers endpoint
      const data = await get(`/api/sleeper/league/${currentLeagueId}/managers`);

      // <<< DEBUG LOG: Inspect the data received from the API >>>
      console.log("Data received from /api/league/.../managers:", data);

      // Sort managers alphabetically by display name
      data.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
      setManagers(data);
    } catch (e) {
      console.error("Failed to fetch managers:", e);
      setError(e.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers(leagueId);
  }, [leagueId, fetchManagers]);

  // Handles submitting the form to view a different league
  const handleLeagueSubmit = (event) => {
    event.preventDefault();
    const newLeagueId = event.target.elements.leagueIdInput.value;
    if (newLeagueId) {
        // Use navigate to change the URL, which will trigger a re-fetch
        navigate(`/league/${newLeagueId}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading league managers...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>League Overview</h1>
      <p>Displaying managers for league ID: <strong>{leagueId}</strong></p>

      <form onSubmit={handleLeagueSubmit} style={{ margin: '20px 0' }}>
        <label htmlFor="leagueIdInput">View a different league: </label>
        <input type="text" id="leagueIdInput" name="leagueIdInput" placeholder="Enter Sleeper League ID" />
        <button type="submit" style={{ marginLeft: '10px' }}>Go</button>
      </form>
      <Link to={`/league/${leagueId}/free-agents`} style={{display: 'inline-block', marginBottom: '20px'}}>View Free Agents</Link>

      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '600px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Manager</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Roster ID</th>
          </tr>
        </thead>
        <tbody>
          {managers.map((manager) => (
            <tr key={manager.roster_id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <Link to={`/league/${leagueId}/roster/${manager.roster_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={manager.avatar_url || 'https://sleepercdn.com/images/v2/avatars/avatar_default.png'} 
                    alt={`${manager.display_name || 'manager'} avatar`} 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }} 
                  />
                  {/* If display_name is missing, it will render nothing here, which matches the screenshot */}
                  <span>{manager.display_name}</span>
                </Link>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{manager.roster_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HomePage;
