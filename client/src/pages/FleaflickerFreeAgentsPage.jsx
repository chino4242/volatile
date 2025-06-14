// client/src/pages/FleaflickerFreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function FleaflickerFreeAgentsPage() {
  const { leagueId } = useParams();
  
  const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) {
      setError("A Fleaflicker League ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`--- Fetching Fleaflicker league data for league: ${currentLeagueId} ---`);
      
      const [fleaflickerData, fantasyCalcValues] = await Promise.all([
        get(`/api/fleaflicker/league/${currentLeagueId}/data`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`)
      ]);

      const freeAgentsFromApi = fleaflickerData.free_agents || [];
      console.log(`Found ${freeAgentsFromApi.length} free agents from the API.`);

      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

      const finalFreeAgents = freeAgentsFromApi.map(player => {
        const calcValueData = fantasyCalcValuesMap.get(cleanseName(player.full_name));
        return {
          ...player,
          trade_value: calcValueData?.value || 0,
        };
      });

      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filteredAndSorted = finalFreeAgents
        .filter(p => skillPositions.includes(p.position) && p.trade_value > 0)
        .sort((a, b) => b.trade_value - a.trade_value);
      
      setEnrichedFreeAgents(filteredAndSorted);

    } catch (e) {
      console.error("Failed to fetch Fleaflicker page data:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(leagueId);
  }, [leagueId, fetchData]);

  if (loading) return <div style={{ padding: '20px' }}>Loading Fleaflicker free agents...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Top Fleaflicker Free Agents by Value for League {leagueId}</h2>
      <p>Found {enrichedFreeAgents.length} relevant players, sorted by trade value.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={styles.th}>Full Name</th>
              <th style={styles.th}>Pos</th>
              <th style={styles.th}>Team</th>
              <th style={styles.th}>Age</th>
              <th style={styles.th}>Trade Value</th>
            </tr>
          </thead>
          <tbody>
            {enrichedFreeAgents.map((player) => (
              <tr key={player.sleeper_id}>
                <td style={styles.td}>{player.full_name || 'N/A'}</td>
                <td style={styles.td}>{player.position}</td>
                <td style={styles.td}>{player.team || 'FA'}</td>
                <td style={styles.td}>{player.age || 'N/A'}</td>
                <td style={styles.td}><strong>{player.trade_value}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
    th: { border: '1px solid #ddd', padding: '8px', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px' },
};

export default FleaflickerFreeAgentsPage;
