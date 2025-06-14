// client/src/pages/FleaflickerHomePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get } from '../api/apiService';

function FleaflickerHomePage() {
  const { leagueId: urlLeagueId } = useParams();
  const navigate = useNavigate();

  // Use a default Fleaflicker league ID if none is provided in the URL
  const defaultLeagueId = "197269"; // A common example Fleaflicker ID
  const leagueId = urlLeagueId || defaultLeagueId;

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) return;

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching teams for Fleaflicker league:', currentLeagueId);
      
      // Use the endpoint that fetches all league data
      const data = await get(`/api/fleaflicker/league/${currentLeagueId}/data`);
      
      const rosters = data.rosters || [];
      console.log('Received Fleaflicker rosters:', rosters);

      if (!Array.isArray(rosters)) {
        throw new Error('Invalid response format from server');
      }

      // Sort teams by owner name
      rosters.sort((a, b) => (a.owner_name || '').localeCompare(b.owner_name || ''));
      setTeams(rosters);
    } catch (e) {
      console.error("Failed to fetch Fleaflicker teams:", e);
      setError(e.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams(leagueId);
  }, [leagueId, fetchTeams]);

  // Handles submitting the form to view a different league
  const handleLeagueSubmit = (event) => {
    event.preventDefault();
    const newLeagueId = event.target.elements.leagueIdInput.value;
    if (newLeagueId) {
      // Use navigate to change the URL to the new Fleaflicker league homepage
      navigate(`/fleaflicker/${newLeagueId}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading Fleaflicker league teams...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Fleaflicker League Overview</h1>
      <p>Displaying teams for league ID: <strong>{leagueId}</strong></p>

      <form onSubmit={handleLeagueSubmit} style={{ margin: '20px 0' }}>
        <label htmlFor="leagueIdInput">View a different league: </label>
        <input type="text" id="leagueIdInput" name="leagueIdInput" placeholder="Enter Fleaflicker League ID" />
        <button type="submit" style={{ marginLeft: '10px' }}>Go</button>
      </form>
      
      <Link to={`/fleaflicker/${leagueId}/free-agents`} style={{display: 'inline-block', marginBottom: '20px'}}>View Free Agents</Link>

      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '600px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team Owner</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Roster ID</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.roster_id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {/* --- THIS IS THE FIX: Link to the specific roster display page --- */}
                <Link to={`/fleaflicker/${leagueId}/roster/${team.roster_id}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                  {team.owner_name}
                </Link>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{team.roster_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FleaflickerHomePage;
