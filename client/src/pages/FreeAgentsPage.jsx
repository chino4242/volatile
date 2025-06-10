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
      console.log("--- Fetching free agents list from Node.js API... ---");
      const freeAgentsData = await get(`/api/league/${currentLeagueId}/free-agents`);
      console.log("Raw Free Agents Data (from Node.js):", freeAgentsData);

      // Step 2: Now that we have the list, fetch supplemental data concurrently.
      const playerIds = freeAgentsData.map(p => p.player_id);
      let analysisDataMap = new Map();
      let fantasyCalcValues = {};

      if (playerIds.length > 0) {
        console.log("--- Fetching supplemental data (FantasyCalc and Python API)... ---");
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
        
        console.log("FantasyCalc values response:", calcValuesResponse);
        console.log("Python API analysis response:", analysisPlayersResponse);
        
        fantasyCalcValues = calcValuesResponse;
        analysisPlayersResponse.forEach(player => {
            if (player && player.sleeper_player_id && !player.error) {
                analysisDataMap.set(String(player.sleeper_player_id), player);
            }
        });
        console.log("Built Analysis Data Map:", analysisDataMap);
      }

      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));
      console.log("--- Processing and enriching data... ---");

      // Step 3: Enrich the free agent list with all data sources.
      const finalFreeAgents = freeAgentsData.map((player, index) => {
        const analysis = analysisDataMap.get(String(player.player_id));
        const cleansedName = cleanseName(player.full_name);
        const calcValueData = fantasyCalcValuesMap.get(cleansedName);
        
        if (index < 5) { 
            console.log(`--- Merging data for: ${player.full_name} (ID: ${player.player_id}) ---`);
            console.log("Analysis data found:", analysis);
            console.log("FantasyCalc data found:", calcValueData);
        }

        return {
          ...player,
          age: player.age || analysis?.age || 'N/A',
          trade_value: calcValueData?.value || 0,
          overall_rank: analysis?.overall_rank || 'N/A',
          positional_rank: analysis?.positional_rank || 'N/A',
          tier: analysis?.tier || 'N/A',
          zap_score: analysis?.zap_score || 'N/A',
          category: analysis?.category || 'N/A',
          comparables: analysis?.comparables || 'N/A',
          draft_capital_delta: analysis?.draft_capital_delta || 'N/A',
          notes: analysis?.notes_lrqb || '', // Notes from LRQB file
          rsp_pos_rank: analysis?.rsp_pos_rank || 'N/A',
          rsp_2023_2025_rank: analysis?.rsp_2023_2025_rank || 'N/A',
          rp_2021_2025_rank: analysis?.rp_2021_2025_rank || 'N/A',
          comparison_spectrum: analysis?.comparison_spectrum || 'N/A',
          depth_of_talent_score: analysis?.depth_of_talent_score || 'N/A',
          depth_of_talent_desc: analysis?.depth_of_talent_desc || 'N/A',
          notes_rsp: analysis?.notes_rsp || '', // Notes from RSP file
        };
      });

      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filteredAndSorted = finalFreeAgents
        .filter(p => skillPositions.includes(p.position) && (p.team || p.trade_value > 0))
        .sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedFreeAgents(filteredAndSorted);

    } catch (e) {
      console.error("Failed to fetch page data:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(leagueId);
  }, [leagueId, fetchData]);

  if (loading) return <div style={{ padding: '20px' }}>Loading free agents and analysis...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Top Free Agents by Value for League {leagueId}</h2>
      <p>Found {enrichedFreeAgents.length} relevant players, sorted by trade value.</p>
      
      {enrichedFreeAgents.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Full Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Pos</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Team</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Age</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Trade Value</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Overall Rk</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Pos Rk</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tier</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ZAP</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Depth Score</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Comp Spectrum</th>
                {/* <<< FIX: ADDED BACK THE NOTES (LRQB) COLUMN HEADER >>> */}
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', minWidth: '200px' }}>Notes (LRQB)</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', minWidth: '200px' }}>Notes (RSP)</th>
              </tr>
            </thead>
            <tbody>
              {enrichedFreeAgents.map((player) => (
                <tr key={player.player_id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.full_name || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.position}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.team}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.age}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>{player.trade_value}</strong></td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.overall_rank}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.positional_rank}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.tier}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.zap_score}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.depth_of_talent_score}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.comparison_spectrum}</td>
                  {/* <<< FIX: ADDED BACK THE NOTES (LRQB) DATA CELL >>> */}
                  <td style={{ border: '1px solid #ddd', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>{player.notes}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>{player.notes_rsp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No free agents found at the specified positions, or all players are rostered.</p>
      )}
    </div>
  );
}

export default FreeAgentsPage;
