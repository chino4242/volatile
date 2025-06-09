// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

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
      // Use Promise.all to fetch both datasets concurrently.
      const [freeAgentsData, valuesData] = await Promise.all([
        get(`/api/league/${currentLeagueId}/free-agents`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`) 
      ]);
      
      console.log("Processing and enriching free agent data...");

      // <<< NEW: Define the positions to keep and filter the raw data >>>
      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filteredFreeAgents = freeAgentsData.filter(player => 
        skillPositions.includes(player.position)
      );
      
      // Combine the two datasets into one enriched list, using the filtered list
      const enriched = filteredFreeAgents.map(player => {
        const cleansedName = cleanseName(player.full_name);
        const valueData = valuesData[cleansedName]; // Look up value by cleansed name
        
        return {
          ...player,
          trade_value: valueData ? valueData.value : 0, // Default to 0 if no value found
          overall_rank: valueData ? valueData.overallRank : null
        };
      });

      // Sort the final list by trade_value, highest to lowest
      enriched.sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedFreeAgents(enriched);

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
    return <div style={{ padding: '20px' }}>Loading and processing free agent values...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Top Free Agents by Value for League {leagueId}</h2>
      <p>Found {enrichedFreeAgents.length} available players (QB, WR, RB, TE), sorted by FantasyCalc Dynasty Superflex Value (0.5 PPR).</p>
      
      {enrichedFreeAgents.length > 0 ? (
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
            {enrichedFreeAgents.map((player) => (
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
        <p>No free agents found at the specified positions, or all players are rostered.</p>
      )}
    </div>
  );
}

export default FreeAgentsPage;
