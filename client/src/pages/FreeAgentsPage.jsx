// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

// Define the base URL for your Python Analysis API from environment variables
const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// Helper function to cleanse names for matching
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
      // Step 1: Fetch the basic list of free agents first.
      const freeAgentsData = await get(`/api/league/${currentLeagueId}/free-agents`);

      // Step 2: Now that we have the list, fetch supplemental data concurrently.
      const playerIds = freeAgentsData.map(p => p.player_id);
      let analysisDataMap = new Map();
      let fantasyCalcValues = {};

      if (playerIds.length > 0) {
        const [calcValuesResponse, analysisPlayersResponse] = await Promise.all([
          get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`),
          fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sleeper_ids: playerIds })
          }).then(res => {
              if (!res.ok) throw new Error(`Python API responded with status: ${res.status}`);
              return res.json();
          })
        ]);
        
        fantasyCalcValues = calcValuesResponse;
        analysisPlayersResponse.forEach(player => {
            if (player && player.sleeper_player_id && !player.error) {
                analysisDataMap.set(String(player.sleeper_player_id), player);
            }
        });
      }

      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

      // Step 3: Enrich the free agent list with all data sources.
      const finalFreeAgents = freeAgentsData.map(player => {
        const analysis = analysisDataMap.get(String(player.player_id));
        const cleansedName = cleanseName(player.full_name);
        const calcValueData = fantasyCalcValuesMap.get(cleansedName);
        
        return {
          ...player,
          age: player.age || (analysis ? analysis.age : 'N/A'),
          trade_value: calcValueData ? calcValueData.value : 0,
          // --- Re-adding all analysis fields with fallbacks ---
          overall_rank: analysis ? (analysis.Overall || analysis.Rk || 'N/A') : 'N/A',
          positional_rank: analysis ? (analysis['Pos. Rank'] || 'N/A') : 'N/A',
          tier: analysis ? (analysis.Tier || 'N/A') : 'N/A',
          zap_score: analysis ? (analysis.zap_score || 'N/A') : 'N/A',
          category: analysis ? (analysis.Category || 'N/A') : 'N/A',
          comparables: analysis ? (analysis.Comparables || 'N/A') : 'N/A',
          draft_capital_delta: analysis ? (analysis.draft_capital_delta || 'N/A') : 'N/A',
          notes: analysis ? (analysis.Notes || '') : '',
        };
      });

      // Filter to show only relevant players and sort by trade value
      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filteredAndSorted = finalFreeAgents
        .filter(player => {
            const isSkillPosition = skillPositions.includes(player.position);
            // <<< FIX: Keep player if they are a skill position AND (have a team OR have a trade value > 0) >>>
            const isRelevant = (player.team !== null) || (player.trade_value > 0);
            return isSkillPosition && isRelevant;
        })
        .sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedFreeAgents(filteredAndSorted);

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
    return <div style={{ padding: '20px' }}>Loading free agents and analysis...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Top Free Agents by Value for League {leagueId}</h2>
      <p>Found {enrichedFreeAgents.length} available players (QB, WR, RB, TE with a trade value or an NFL team), sorted by FantasyCalc Dynasty Superflex Value (0.5 PPR).</p>
      
      {enrichedFreeAgents.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '1600px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Full Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Position</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Age</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Trade Value</th>
              {/* --- ADDING HEADERS BACK IN --- */}
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Overall Rank</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Pos. Rank</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tier</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ZAP Score</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Comparables</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Draft Delta</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {enrichedFreeAgents.map((player) => (
              <tr key={player.player_id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.full_name || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.position || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.team || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.age}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>{player.trade_value}</strong></td>
                {/* --- ADDING DATA CELLS BACK IN --- */}
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.overall_rank}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.positional_rank}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.tier}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.zap_score}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.category}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.comparables}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.draft_capital_delta}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{player.notes}</td>
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
