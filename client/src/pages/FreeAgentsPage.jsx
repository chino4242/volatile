// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles'; // Import the shared styles

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// A reusable Modal component for popups, now using shared styles
const Modal = ({ content, onClose }) => {
    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={handleContentClick}>
                <button style={styles.closeButton} onClick={onClose}>&times;</button>
                {content}
            </div>
        </div>
    );
};

function FreeAgentsPage() {
  const { leagueId } = useParams();
  
  const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);


  const fetchData = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) {
      setError("A League ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("--- Fetching Sleeper free agents list... ---");
      const freeAgentsData = await get(`/api/sleeper/league/${currentLeagueId}/free-agents`);

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
        analysisPlayers.forEach(player => {
          if (player?.sleeper_id && !player.error) {
            analysisDataMap.set(String(player.sleeper_id), player);
          }
        });
      }

      const finalFreeAgents = freeAgentsData.map(player => {
        const analysis = analysisDataMap.get(String(player.player_id));
        return { ...player, ...analysis }; // Combine the objects
      });

      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filteredAndSorted = finalFreeAgents
        .filter(p => skillPositions.includes(p.position) && p.fantasy_calc_value > 0)
        .sort((a, b) => (b.fantasy_calc_value || 0) - (a.fantasy_calc_value || 0));
      
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

  if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
  if (error) return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;

  const wrappingCellStyle = {
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      maxWidth: '250px' // Set a max-width to encourage wrapping
  };

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.h1}>Top Sleeper Free Agents</h1>
      <p style={styles.p}>Found {enrichedFreeAgents.length} relevant players for league {leagueId}, sorted by trade value.</p>
      
      <div style={styles.tableContainer}>
        {/* --- FIX: Removed table-layout: fixed to allow browser to auto-size columns --- */}
        <table style={styles.table}>
          <thead>
            <tr>
              {/* --- FIX: Removed explicit width styles from headers --- */}
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
              <th style={styles.th}>Comp Spectrum</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Draft Delta</th>
              <th style={styles.th}>RSP Pos Rk</th>
              <th style={styles.th}>RSP 23-25</th>
              <th style={styles.th}>RP 21-25</th>
              <th style={styles.th}>Notes</th>
              <th style={styles.th}>AI Analysis</th>
            </tr>
          </thead>
          <tbody>
            {enrichedFreeAgents.map((player) => (
              <tr 
                key={player.player_id}
                onMouseEnter={() => setHoveredRow(player.player_id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={hoveredRow === player.player_id ? styles.trHover : {}}
              >
                <td style={styles.td}>{player.full_name || 'N/A'}</td>
                <td style={styles.td}>{player.position}</td>
                <td style={styles.td}>{player.team}</td>
                <td style={styles.td}>{player.age}</td>
                <td style={{...styles.td, ...styles.valueCell}}>{player.fantasy_calc_value}</td>
                <td style={styles.td}>{player.overall_rank}</td>
                <td style={styles.td}>{player.positional_rank}</td>
                <td style={styles.td}>{player.tier}</td>
                <td style={styles.td}>{player.zap_score}</td>
                <td style={styles.td}>{player.depth_of_talent_score}</td>
                <td style={{...styles.td, ...wrappingCellStyle}}>{player.comparison_spectrum}</td>
                <td style={{...styles.td, ...wrappingCellStyle}}>{player.category}</td>
                <td style={{...styles.td, ...wrappingCellStyle}}>{player.draft_capital_delta}</td>
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
                <td style={styles.td}>
                  {player.gemini_analysis && (
                      <button 
                          onClick={() => setModalContent({
                              title: `${player.full_name} - AI Analysis`,
                              body: player.gemini_analysis
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
                    <h2 style={styles.h2}>{modalContent.title}</h2>
                    <div style={styles.modalBody}>{modalContent.body}</div>
                </>
            } 
            onClose={() => setModalContent(null)} 
        />
      )}
    </div>
  );
}

export default FreeAgentsPage;
