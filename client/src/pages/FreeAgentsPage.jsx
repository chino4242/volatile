// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// --- A reusable Modal component for popups ---
const Modal = ({ content, onClose }) => {
    // Stop the click from bubbling up and closing the modal when the content is clicked
    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={handleContentClick}>
                <button style={styles.closeButton} onClick={onClose}>&times;</button>
                <div style={styles.modalBody}>
                    {content}
                </div>
            </div>
        </div>
    );
};


function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function FreeAgentsPage() {
  const { leagueId } = useParams();
  
  const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalContent, setModalContent] = useState(null);


  const fetchData = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) {
      setError("A League ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("--- Fetching free agents list and FantasyCalc values... ---");
      const [freeAgentsData, fantasyCalcValues] = await Promise.all([
        get(`/api/sleeper/league/${currentLeagueId}/free-agents`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`)
      ]);

      const playerIds = freeAgentsData.map(p => p.player_id);
      let analysisDataMap = new Map();

      if (playerIds.length > 0) {
        console.log("--- Fetching deep analysis from Python API... ---");
        const analysisResponse = await fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sleeper_ids: playerIds })
        });
        if (!analysisResponse.ok) throw new Error(`Python API error: ${analysisResponse.status}`);
        
        const analysisPlayers = await analysisResponse.json();
        console.log("Python API analysis response:", analysisPlayers);

        analysisPlayers.forEach(player => {
          // --- THIS IS THE FIX: Use the correct key 'sleeper_id' ---
          if (player?.sleeper_id && !player.error) {
            analysisDataMap.set(String(player.sleeper_id), player);
          }
        });
      }

      const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));
      console.log("--- Processing and enriching data... ---");

      const finalFreeAgents = freeAgentsData.map((player, index) => {
        const analysis = analysisDataMap.get(String(player.player_id));
        const calcValueData = fantasyCalcValuesMap.get(cleanseName(player.full_name));

        if (index < 3) { // Debug first 3 players
          console.log(`Matching for ${player.full_name}:`, { analysis, calcValueData });
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
          notes_lrqb: analysis?.notes_lrqb || '',
          rsp_pos_rank: analysis?.rsp_pos_rank || 'N/A',
          rsp_2023_2025_rank: analysis?.rsp_2023_2025_rank || 'N/A',
          rp_2021_2025_rank: analysis?.rp_2021_2025_rank || 'N/A',
          comparison_spectrum: analysis?.comparison_spectrum || 'N/A',
          depth_of_talent_score: analysis?.depth_of_talent_score || 'N/A',
          depth_of_talent_desc: analysis?.depth_of_talent_desc || '',
          notes_rsp: analysis?.notes_rsp || '',
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
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={styles.th}>Full Name</th>
              <th style={styles.th}>Pos</th>
              <th style={styles.th}>Team</th>
              <th style={styles.th}>Age</th>
              <th style={styles.th}>Trade Value</th>
              <th style={styles.th}>Overall Rk</th>
              <th style={styles.th}>Pos Rk</th>
              <th style={styles.th}>Tier</th>
              <th style={styles.th}>ZAP</th>
              <th style={styles.th}>Depth Score</th>
              <th style={{...styles.th, minWidth: '150px'}}>Comp Spectrum</th>
              <th style={{...styles.th, minWidth: '150px'}}>Category</th>
              <th style={{...styles.th, minWidth: '150px'}}>Draft Delta</th>
              <th style={styles.th}>RSP Pos Rk</th>
              <th style={styles.th}>RSP 23-25</th>
              <th style={styles.th}>RP 21-25</th>
              <th style={styles.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {enrichedFreeAgents.map((player) => (
              <tr key={player.player_id}>
                <td style={styles.td}>{player.full_name || 'N/A'}</td>
                <td style={styles.td}>{player.position}</td>
                <td style={styles.td}>{player.team}</td>
                <td style={styles.td}>{player.age}</td>
                <td style={styles.td}><strong>{player.trade_value}</strong></td>
                <td style={styles.td}>{player.overall_rank}</td>
                <td style={styles.td}>{player.positional_rank}</td>
                <td style={styles.td}>{player.tier}</td>
                <td style={styles.td}>{player.zap_score}</td>
                <td style={styles.td}>{player.depth_of_talent_score}</td>
                <td style={styles.td}>{player.comparison_spectrum}</td>
                <td style={styles.td}>{player.category}</td>
                <td style={styles.td}>{player.draft_capital_delta}</td>
                <td style={styles.td}>{player.rsp_pos_rank}</td>
                <td style={styles.td}>{player.rsp_2023_2025_rank}</td>
                <td style={styles.td}>{player.rp_2021_2025_rank}</td>
                <td style={styles.td}>
                  {(player.notes_lrqb || player.notes_rsp || player.depth_of_talent_desc) && (
                      <button 
                          onClick={() => setModalContent({
                              title: `${player.full_name} - Analysis Notes`,
                              body: `LRQB Notes:\n${player.notes_lrqb || 'N/A'}\n\n---\n\nRSP Notes:\n${player.notes_rsp || 'N/A'}\n\n---\n\nDepth of Talent Description:\n${player.depth_of_talent_desc || 'N/A'}`
                          })}
                          style={styles.notesButton}
                      >
                          View
                      </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        {modalContent && (
          <Modal 
              content={
                  <>
                      <h3>{modalContent.title}</h3>
                      <div style={styles.modalBody}>{modalContent.body}</div>
                  </>
              } 
              onClose={() => setModalContent(null)} 
          />
      )}
    </div>
  );
}

const styles = {
    th: { border: '1px solid #ddd', padding: '8px', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px' },
    notesButton: { padding: '5px 10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px 40px', borderRadius: '8px', maxWidth: '600px', maxHeight: '80%', overflowY: 'auto', position: 'relative' },
    modalBody: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '14px', lineHeight: 1.6 },
    closeButton: { position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer' }
};

export default FreeAgentsPage;
