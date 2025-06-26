// client/src/pages/FleaflickerFreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles'; // Import the new shared styles
import './DraftTrackerPage.css'; // Make sure you have this CSS file for styling

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

function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}


function FleaflickerFreeAgentsPage() {
  const { leagueId } = useParams();
  
  const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());

  const fetchData = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) {
        setError("A Fleaflicker League ID is required.");
        setLoading(false);
        return;
    }
  
    setLoading(true);
    setError(null);
    try { 
        const [fleaflickerData, fantasyCalcValues, pythonAnalysisData] = await Promise.all([
          get(`/api/fleaflicker/league/${currentLeagueId}/data`),
          get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`),
          fetch(`${PYTHON_API_BASE_URL}/api/enriched-players`).then(res => {
            if (!res.ok) throw new Error(`Python API error: ${res.status}`);
            return res.json();
          })
        ]);
        
        const rosteredPlayerNames = new Set();
        if (fleaflickerData && fleaflickerData.rosters) {
            fleaflickerData.rosters.forEach(roster => {
                roster.players.forEach(player => rosteredPlayerNames.add(cleanseName(player.full_name)))
            });
        }
        
        const pythonAnalysisMap = new Map();
        if (Array.isArray(pythonAnalysisData)) {
            pythonAnalysisData.forEach(player => {
                pythonAnalysisMap.set(cleanseName(player.player_name_original), player);
            });
        }

        const fantasyCalcValuesMap = new Map();
        if (fantasyCalcValues && typeof fantasyCalcValues === 'object') {
            Object.entries(fantasyCalcValues).forEach(([name, data]) => {
                fantasyCalcValuesMap.set(name, data.value);
            });
        }

        const finalFreeAgents = pythonAnalysisData
            .map(player => {
                const cleansedName = cleanseName(player.player_name_original);
                return { 
                    ...player,
                    fantasy_calc_value: fantasyCalcValuesMap.get(cleansedName) || 0,
                    // Keep the original name for display, separate from cleansed name
                    full_name: player.player_name_original 
                };
            })
            .filter(p => {
                const skillPositions = ['QB', 'WR', 'RB', 'TE'];
                const isFreeAgent = !rosteredPlayerNames.has(cleanseName(p.full_name));
                const isSkillPlayer = skillPositions.includes(p.position);
                const hasValue = p.fantasy_calc_value > 0;
                return isFreeAgent && isSkillPlayer && hasValue;
            })
            .sort((a, b) => (b.fantasy_calc_value || 0) - (a.fantasy_calc_value || 0));
        
        setEnrichedFreeAgents(finalFreeAgents);
  
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


  const handleSelectPlayer = (playerId) => {
    setSelectedPlayerIds(prevSelected => {
        const newSelected = new Set(prevSelected);
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId);
        } else {
            newSelected.add(playerId);
        }
        return newSelected;
    });
  };

  if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
  if (error) return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.h1}>Fleaflicker Free Agents</h1>
      <p style={styles.p}>Found {enrichedFreeAgents.length} relevant free agents for league {leagueId}, sorted by trade value.</p>
      
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, textAlign: 'center'}}>Drafted</th>
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
              {/* --- FIX: Added word-wrap styles --- */}
              <th style={{...styles.th, maxWidth: '300px', minWidth:'300px', whiteSpace: 'normal', wordBreak: 'break-word'}}>Comp Spectrum</th>
              <th style={{...styles.th, minWidth: '150px'}}>Category</th>
              <th style={{...styles.th, minWidth: '150px'}}>Draft Delta</th>
              <th style={styles.th}>RSP Pos Rk</th>
              <th style={styles.th}>RSP 23-25</th>
              <th style={styles.th}>RP 21-25</th>
              <th style={styles.th}>Notes</th>
              <th style={styles.th}>AI Analysis</th>
            </tr>
          </thead>
          <tbody>
            {enrichedFreeAgents.map((player) => {
                const uniquePlayerId = player.sleeper_id || player.player_name_original;
                const isSelected = selectedPlayerIds.has(uniquePlayerId);
              return (
                <tr 
                  key={uniquePlayerId}
                  className={isSelected ? 'selected-row' : ''}
                  onMouseEnter={() => setHoveredRow(uniquePlayerId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={hoveredRow === uniquePlayerId ? styles.trHover : {}}
                >
                  <td style={{...styles.td, textAlign: 'center'}}>
                      <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectPlayer(uniquePlayerId)}
                          />
                  </td>
                  <td style={styles.td}>{player.full_name || 'N/A'}</td>
                  <td style={styles.td}>{player.position}</td>
                  <td style={styles.td}>{player.team || 'FA'}</td>
                  <td style={styles.td}>{player.age || 'N/A'}</td>
                  <td style={{...styles.td, ...styles.valueCell}}>{player.fantasy_calc_value}</td>
                  <td style={styles.td}>{player.overall_rank || 'N/A'}</td>
                  <td style={styles.td}>{player.positional_rank || 'N/A'}</td>
                  <td style={styles.td}>{player.tier || 'N/A'}</td>
                  <td style={styles.td}>{player.zap_score || 'N/A'}</td>
                  <td style={styles.td}>{player.depth_of_talent_score || 'N/A'}</td>
                   {/* --- FIX: Added word-wrap styles --- */}
                  <td style={{...styles.td, maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word'}}>
                    {player.comparison_spectrum || 'N/A'}
                  </td>
                  <td style={styles.td}>{player.category || 'N/A'}</td>
                  <td style={styles.td}>{player.draft_capital_delta || 'N/A'}</td>
                  <td style={styles.td}>{player.rsp_pos_rank || 'N/A'}</td>
                  <td style={styles.td}>{player.rsp_2023_2025_rank || 'N/A'}</td>
                  <td style={styles.td}>{player.rp_2021_2025_rank || 'N/A'}</td>
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
                      {/* --- FIX: Show disabled state if no analysis --- */}
                      {player.gemini_analysis ? (
                          <button 
                              onClick={() => setModalContent({
                                  title: `${player.full_name} - AI Analysis`,
                                  body: player.gemini_analysis
                              })}
                              style={styles.notesButton}
                          >
                              View
                          </button>
                      ) : (
                        <span style={{color: '#999'}}>N/A</span>
                      )}
                  </td>
                </tr>
              );
            })}
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

export default FleaflickerFreeAgentsPage;
